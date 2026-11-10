const AMIU_URL = "https://www.amiu.genova.it/in-evidenza/cerca-il-tuo-comune/genova/municipio-viii-medio-levante.html";
const WEEKDAYS = { domenica:0, lunedi:1, martedi:2, mercoledi:3, giovedi:4, venerdi:5, sabato:6 };

function decodeHtml(s="") {
  const e={nbsp:" ",amp:"&",quot:'"',apos:"'",deg:"°",agrave:"à",egrave:"è",eacute:"é",igrave:"ì",ograve:"ò",ugrave:"ù"};
  return s.replace(/&([a-z]+);/gi,(m,n)=>e[n.toLowerCase()]??m)
    .replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}
function text(html="") { return decodeHtml(html.replace(/<[^>]+>/g," ")).replace(/\s+/g," ").trim(); }
function norm(s="") { return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim(); }
function parseTime(s) {
  const m=s.match(/(?:dalle(?: ore)?\s*)?(\d{1,2})[:.](\d{2})\s*(?:alle|fino alle|-|–)\s*(\d{1,2})[:.](\d{2})/i);
  if(!m) return {start:"08:00",label:"Orario da verificare sul cartello"};
  const a=`${m[1].padStart(2,"0")}:${m[2]}`, b=`${m[3].padStart(2,"0")}:${m[4]}`;
  return {start:a,label:`${a}–${b}`};
}
function parseDates(s,start) {
  return [...new Set([...s.matchAll(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g)].map(m=>`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}T${start}`))];
}
function parseRecurrence(s) {
  const m=norm(s).match(/\b([1-5])\s*(?:°|º|o)?\s*(domenica|lunedi|martedi|mercoledi|giovedi|venerdi|sabato)\b/);
  return m ? {ordinal:Number(m[1]),weekday:WEEKDAYS[m[2]]} : null;
}
function splitLocations(header) {
  const clean=header.replace(/\s+spazzamento meccanizzato\s*:?\s*(?:il)?\s*$/i,"").trim();
  const am=clean.match(/^([^,]+),\s*(.+)$/); if(!am) return [];
  const area=am[1].trim(), body=am[2], out=[];
  const re=/(?:^|,\s*)(via|corso|piazza|viale|lungomare|salita|discesa)\s+(.+?)(?=,\s*(?:via|corso|piazza|viale|lungomare|salita|discesa)\s+|$)/gi;
  for(const m of body.matchAll(re)) {
    const type=m[1][0].toUpperCase()+m[1].slice(1).toLowerCase(), full=m[2].trim();
    const sm=full.match(/^(.*?)\s*\((.*)\)\s*$/), name=(sm?sm[1]:full).trim();
    if(name) out.push({area,street:`${type} ${name}`,segment:sm?sm[2].trim():"Tratto indicato da AMIU"});
  }
  return out;
}
function extract(html) {
  const items=[];
  const paragraphs=[...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>m[1]);
  for(const p of paragraphs) {
    if(!/spazzamento meccanizzato/i.test(p)) continue;
    const whole=text(p), marker=whole.toLowerCase().indexOf("spazzamento meccanizzato");
    if(marker<0) continue;
    const header=whole.slice(0,marker)+" spazzamento meccanizzato:";
    const schedule=whole.slice(marker+"spazzamento meccanizzato".length).replace(/^\s*:\s*(?:il\s*)?/i,"").trim();
    const time=parseTime(schedule), dates=parseDates(schedule,time.start), recurrence=parseRecurrence(schedule);
    if(!dates.length && !recurrence) continue;
    for(const loc of splitLocations(header)) items.push({...loc,...(dates.length?{dates}:{recurrence}),time:time.label});
  }
  return [...new Map(items.map(x=>[JSON.stringify([x.area,x.street,x.segment,x.dates??x.recurrence,x.time]),x])).values()];
}
function json(body,status=200,extra={}) {
  return new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","access-control-allow-origin":"*","cache-control":"public, max-age=300, s-maxage=21600, stale-while-revalidate=86400",...extra}});
}
export default async function handler(request) {
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers:{"access-control-allow-origin":"*","access-control-allow-methods":"GET, OPTIONS","access-control-allow-headers":"content-type"}});
  if(request.method!=="GET") return json({error:"Metodo non consentito"},405,{allow:"GET, OPTIONS"});
  try {
    const r=await fetch(AMIU_URL,{headers:{accept:"text/html,application/xhtml+xml","accept-language":"it-IT,it;q=0.9","user-agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1"},redirect:"follow",signal:AbortSignal.timeout(15000)});
    if(!r.ok) throw new Error(`AMIU ha risposto ${r.status}`);
    const items=extract(await r.text());
    if(!items.length) throw new Error("Nessun dato di spazzamento riconosciuto");
    return json({source:AMIU_URL,municipality:"Genova VIII Medio Levante",updatedAt:new Date().toISOString(),count:items.length,items});
  } catch(error) {
    console.error("Errore aggiornamento AMIU",error);
    return json({error:"Impossibile aggiornare i dati AMIU",detail:error instanceof Error?error.message:String(error),source:AMIU_URL},502,{"cache-control":"no-store"});
  }
}
export const config={path:"/api/amiu"};
