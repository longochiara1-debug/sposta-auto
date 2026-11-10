import { configurePush, json, saveDevice } from "./_push-lib.mjs";
export default async function handler(request) {
  if (request.method !== "POST") return json({error:"Metodo non consentito"},405);
  try {
    configurePush();
    const {deviceId,subscription,reminders=[]}=await request.json();
    if(!deviceId || !subscription?.endpoint) return json({error:"Dati mancanti"},400);
    const clean=reminders.slice(0,2).filter(r=>r.id&&r.reminderAt&&r.cleaningAt).map(r=>({...r,sentAt:null}));
    await saveDevice(deviceId,{deviceId,subscription,reminders:clean,updatedAt:new Date().toISOString()});
    return json({ok:true,count:clean.length});
  } catch(e) { return json({error:e.message},500); }
}
export const config={path:"/api/push-state"};
