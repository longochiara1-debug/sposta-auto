import webpush from "web-push";
import { configurePush, json, loadDevice } from "./_push-lib.mjs";
export default async function handler(request) {
  if(request.method!=="POST") return json({error:"Metodo non consentito"},405);
  try {
    configurePush();
    const {deviceId}=await request.json();
    const device=await loadDevice(deviceId);
    if(!device?.subscription) return json({error:"Dispositivo non registrato"},404);
    await webpush.sendNotification(device.subscription,JSON.stringify({title:"Sposta l’auto",body:"Le notifiche funzionano correttamente.",tag:"sposta-auto-test",url:"/"}));
    return json({ok:true});
  } catch(e) { return json({error:e.message},500); }
}
export const config={path:"/api/push-test"};
