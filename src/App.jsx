import React,{useEffect,useMemo,useState} from "react";
import {AlertTriangle,Bell,Bike,Car,CheckCircle2,ChevronRight,MapPin,Navigation,RefreshCw,Trash2} from "lucide-react";
import {motion} from "framer-motion";
import { enableNotifications, notificationStatus, sendTestNotification, syncPushReminders } from "./push.js";
<section className="section">
  <div className="card">
    <h3>Notifiche</h3>
    {pushStatus !== "enabled" ? (
      <button className="primary" onClick={async()=>{
        try { await enableNotifications(); setPushStatus("enabled"); alert("Notifiche attivate"); }
        catch(e) { alert(e.message); }
      }}>Attiva notifiche</button>
    ) : (
      <>
        <p className="success">Notifiche attive</p>
        <button className="secondary" onClick={async()=>{
          try { await sendTestNotification(); alert("Notifica di prova inviata"); }
          catch(e) { alert(e.message); }
        }}>Invia notifica di prova</button>
      </>
    )}
  </div>
</section>
const API="/api/amiu", STORE="street-cleaning-v1", CACHE="amiu-cleaning-data";
const FALLBACK=[
 {area:"Foce",street:"Corso Torino",segment:"da Via Tolemaide a Corso Buenos Aires, ambo i lati",dates:["2026-11-09T08:00","2026-11-23T08:00"],time:"08:00–12:00"},
 {area:"Foce",street:"Piazza Tommaseo",segment:"tratto adiacente Scalinata Borghese",dates:["2026-11-30T08:00"],time:"08:00–12:00"},
 {area:"Foce",street:"Via Casaregis",segment:"da Corso Buenos Aires a Via Pisacane",dates:["2026-11-13T08:00","2026-11-27T08:00"],time:"08:00–12:00"},
 {area:"Foce",street:"Via Casaregis",segment:"da Via Pisacane a Via Ruspoli",dates:["2026-11-17T08:00"],time:"08:00–12:00"},
 {area:"Foce",street:"Via Casaregis",segment:"da Via Tolemaide a Corso Buenos Aires",dates:["2026-11-10T08:00","2026-11-24T08:00"],time:"08:00–12:00"},
 {area:"Albaro",street:"Piazza Dunant",segment:"lato monte",recurrence:{ordinal:2,weekday:1},time:"Orario da verificare sul cartello"},
 {area:"Albaro",street:"Piazza Dunant",segment:"lato mare",recurrence:{ordinal:2,weekday:1},time:"Orario da verificare sul cartello"},
 {area:"Albaro",street:"Via Piave",segment:"a scendere",recurrence:{ordinal:4,weekday:3},time:"Orario da verificare sul cartello"},
 {area:"Albaro",street:"Via Piave",segment:"a salire",recurrence:{ordinal:4,weekday:5},time:"Orario da verificare sul cartello"}
];
const read=(k,f=null)=>{try{return JSON.parse(localStorage.getItem(k))??f}catch{return f}};
const norm=(s="")=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const valid=v=>Array.isArray(v)&&v.length>0&&v.every(x=>x&&typeof x.street==="string"&&typeof x.segment==="string"&&(Array.isArray(x.dates)||x.recurrence));
const matches=(a,data)=>{const q=norm(a).replace(/\b\d+[a-z]?\b/g,"").trim();return q?data.filter(x=>q.includes(norm(x.street))||norm(x.street).includes(q)):[]};
function nextRecurring(r,from=new Date()){if(!r)return null;for(let o=0;o<14;o++){const am=from.getMonth()+o,y=from.getFullYear()+Math.floor(am/12),m=((am%12)+12)%12,first=new Date(y,m,1,8),off=(r.weekday-first.getDay()+7)%7,d=new Date(y,m,1+off+(r.ordinal-1)*7,8);if(d>=from)return d}return null}
function nextCleaning(x){if(!x)return null;if(Array.isArray(x.dates))return x.dates.map(d=>new Date(d)).filter(d=>!isNaN(d)&&d>=new Date()).sort((a,b)=>a-b)[0]||null;return nextRecurring(x.recurrence)}
function reminder(d){if(!d)return null;const r=new Date(d);r.setDate(r.getDate()-1);r.setHours(20,0,0,0);return r}
const fd=v=>new Date(v).toLocaleDateString("it-IT",{weekday:"long",day:"numeric",month:"long"});
const fdt=v=>new Date(v).toLocaleString("it-IT",{weekday:"long",day:"numeric",month:"long",hour:"2-digit",minute:"2-digit"});
const id=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;
export default function App(){
 const [spots,setSpots]=useState(()=>read(STORE,[])),[vehicle,setVehicle]=useState("Auto"),[screen,setScreen]=useState("home"),[address,setAddress]=useState(""),[coords,setCoords]=useState(null),[display,setDisplay]=useState(""),[selected,setSelected]=useState(0),[locating,setLocating]=useState(false),[error,setError]=useState("");
 const cached=read(CACHE),[data,setData]=useState(()=>valid(cached?.items)?cached.items:FALLBACK),[status,setStatus]=useState("loading"),[updated,setUpdated]=useState(cached?.updatedAt||null);
 const found=useMemo(()=>matches(address,data),[address,data]);
 const [pushStatus,setPushStatus]=useState("loading");
useEffect(()=>{ notificationStatus().then(setPushStatus); },[]);
useEffect(()=>localStorage.setItem(STORE,JSON.stringify(spots)),[spots]);
 useEffect(()=>{ syncPushReminders(spots).catch(console.error); },[spots]);
 async function refresh(){setStatus("loading");try{const r=await fetch(API,{headers:{Accept:"application/json"}});if(!r.ok)throw Error(`AMIU API ${r.status}`);const p=await r.json(),items=Array.isArray(p)?p:p.items;if(!valid(items))throw Error("Formato non valido");const at=p.updatedAt||new Date().toISOString();setData(items);setUpdated(at);setStatus("live");localStorage.setItem(CACHE,JSON.stringify({items,updatedAt:at}))}catch(e){console.warn(e);const c=read(CACHE);if(valid(c?.items)){setData(c.items);setUpdated(c.updatedAt);setStatus("cached")}else{setData(FALLBACK);setStatus("fallback")}}}
 useEffect(()=>{refresh()},[]);
 function reset(){setAddress("");setCoords(null);setDisplay("");setSelected(0);setError("")}
 function park(){reset();setLocating(true);if(!navigator.geolocation){setError("GPS non disponibile. Inserisci la via manualmente.");setLocating(false);setScreen("confirm");return}navigator.geolocation.getCurrentPosition(async p=>{const c={latitude:p.coords.latitude,longitude:p.coords.longitude};setCoords(c);try{const q=new URLSearchParams({lat:c.latitude,lon:c.longitude,format:"jsonv2",addressdetails:"1",zoom:"18","accept-language":"it"});const r=await fetch(`https://nominatim.openstreetmap.org/reverse?${q}`);if(!r.ok)throw Error();const j=await r.json(),a=j.address||{},street=[a.road||a.pedestrian||a.residential||a.square||a.place||"",a.house_number||""].join(" ").trim();setAddress(street);setDisplay(j.display_name||"");if(!street)setError("Via non riconosciuta. Inseriscila manualmente.")}catch{setError("Posizione acquisita, ma la via non è stata riconosciuta.")}finally{setLocating(false);setScreen("confirm")}},()=>{setError("GPS non acquisito. Controlla i permessi di Safari.");setLocating(false);setScreen("confirm")},{enableHighAccuracy:true,timeout:10000,maximumAge:0})}
 function save(){if(!address.trim())return;const rule=found[selected]||null,clean=nextCleaning(rule);setSpots(s=>[{id:id(),vehicle,address:address.trim(),coords,rule,parkedAt:new Date().toISOString(),cleaningAt:clean?.toISOString()||null,reminderAt:reminder(clean)?.toISOString()||null},...s.filter(x=>x.vehicle!==vehicle)]);reset();setScreen("home")}
 if(screen==="confirm"){const rule=found[selected]||null,clean=nextCleaning(rule);return <div className="shell"><main className="app confirm"><button className="back" onClick={()=>{reset();setScreen("home")}}>← Indietro</button><h1>Conferma parcheggio</h1>{coords&&<p className="success"><CheckCircle2 size={16}/> Posizione GPS acquisita</p>}{error&&<p className="error">{error}</p>}<p className="label">Dove hai parcheggiato?</p><input className="input" autoFocus={!address} value={address} onChange={e=>{setAddress(e.target.value);setSelected(0)}} placeholder="Es. Via Casaregis"/>{display&&<p className="muted">Indirizzo GPS: {display}</p>}{address&&found.length===0&&<div className="info">Via non trovata nei dati AMIU disponibili. Puoi salvarla, ma verifica il cartello.</div>}{found.length>0&&<div><p className="label" style={{marginTop:20}}>Tratto / lato</p>{found.map((x,i)=><button key={`${x.street}-${x.segment}-${i}`} className={`rule ${selected===i?"selected":""}`} onClick={()=>setSelected(i)}><b>{x.street}</b><div className="small">{x.segment||"Tutta la zona indicata"}</div></button>)}{clean&&<div className="warning"><b>PROSSIMA PULIZIA</b><div>{fd(clean)} · {rule.time}</div><small>Avviso previsto: {fdt(reminder(clean))}</small></div>}</div>}<button className="primary" disabled={!address.trim()} onClick={save}>Conferma parcheggio</button><p className="hint">Controlla sempre la segnaletica temporanea.</p></main></div>}
 return <div className="shell"><main className="app"><header className="hero"><div className="between"><div><small>Parcheggia e dimenticatene</small><h1>Sposta l’auto</h1></div><div className="bell"><Bell/></div></div><p>Ti ricordiamo quando spostare auto o motorino per la pulizia strade.</p></header><section className="section"><p className="label">Cosa hai parcheggiato?</p><div className="grid">{["Auto","Motorino"].map(v=><button key={v} className={`choice ${vehicle===v?"active":""}`} onClick={()=>setVehicle(v)}>{v==="Auto"?<Car/>:<Bike/>}{v}</button>)}</div><motion.button whileTap={{scale:.98}} className="primary" disabled={locating} onClick={park}><MapPin/>{locating?"Sto acquisendo GPS…":"HO PARCHEGGIATO QUI"}</motion.button><p className="hint">Un tap acquisisce il GPS; poi confermi via, tratto e lato.</p></section><section className="section"><div className="between"><h2>I miei mezzi</h2><span className="muted">{spots.length}/2 parcheggiati</span></div>{spots.length===0?<div className="card empty"><Navigation color="#cbd5e1" size={36}/><h3>Nessun mezzo parcheggiato</h3><p className="muted">Quando parcheggi, premi il pulsante blu.</p></div>:spots.map(s=>{const clean=s.cleaningAt?new Date(s.cleaningAt):null,urgent=clean&&(clean-Date.now())/36e5<=36&&(clean-Date.now())>=0;return <article className="card spot" key={s.id}><div className="between"><div className="row"><div className="iconbox">{s.vehicle==="Auto"?<Car/>:<Bike/>}</div><div><h3>{s.vehicle}</h3><div className="muted">Parcheggiata {fdt(s.parkedAt)}</div></div></div><button className="delete" onClick={()=>setSpots(x=>x.filter(y=>y.id!==s.id))}><Trash2 size={18}/></button></div><div className="address"><MapPin color="#2563eb" size={18}/><div><b>{s.address}</b>{s.rule?.segment&&<div className="small">{s.rule.segment}</div>}</div></div>{clean?<div className={`warning ${urgent?"urgent":""}`}><div className="row"><AlertTriangle size={18}/><b>{urgent?" SPOSTA IL MEZZO":" Pulizia programmata"}</b></div><div>{fd(clean)} · {s.rule?.time}</div>{s.reminderAt&&<small>Avviso: {fdt(s.reminderAt)}</small>}</div>:<div className="success">Nessuna pulizia futura trovata.</div>}<button className="card-button" onClick={()=>window.open(s.coords?`https://maps.apple.com/?ll=${s.coords.latitude},${s.coords.longitude}&q=Parcheggio`:`https://maps.apple.com/?q=${encodeURIComponent(s.address)}`,"_blank","noopener,noreferrer")}><span className="between"><span className="row"><Navigation size={17}/> Vedi sulla mappa</span><ChevronRight/></span></button></article>})}</section><section className="card status"><div className="between"><span><b>Dati AMIU:</b> {status==="live"?"aggiornati online":status==="cached"?"ultima copia salvata":status==="loading"?"aggiornamento in corso":"dati dimostrativi"}</span><button className="secondary" onClick={refresh} disabled={status==="loading"}><RefreshCw size={13}/> Aggiorna</button></div>{updated&&<div className="muted">Ultimo aggiornamento: {new Date(updated).toLocaleString("it-IT")}</div>}{status==="fallback"&&<p className="error">La funzione /api/amiu non è raggiungibile. Verifica il deploy e il cartello stradale.</p>}</section><div className="source"><a href="https://www.amiu.genova.it/in-evidenza/cerca-il-tuo-comune/genova/municipio-viii-medio-levante.html" target="_blank" rel="noreferrer">Fonte: AMIU Genova</a></div></main></div>
}
