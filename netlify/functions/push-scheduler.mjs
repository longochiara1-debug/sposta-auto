import webpush from "web-push";
import { configurePush, store } from "./_push-lib.mjs";

export default async function handler() {
  configurePush();
  const s=store();
  let cursor;
  const now=Date.now();
  let sent=0;
  do {
    const page=await s.list({prefix:"device-",cursor});
    cursor=page.cursor;
    for(const blob of page.blobs) {
      const device=await s.get(blob.key,{type:"json"});
      if(!device?.subscription) continue;
      let changed=false;
      for(const reminder of device.reminders || []) {
        const due=Date.parse(reminder.reminderAt), cleaning=Date.parse(reminder.cleaningAt);
        if(!reminder.sentAt && Number.isFinite(due) && due<=now && cleaning>now) {
          const body=`Domani ${reminder.address}${reminder.segment?` (${reminder.segment})`:""}: pulizia ${new Date(cleaning).toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Rome"})}.`;
          try {
            await webpush.sendNotification(device.subscription,JSON.stringify({title:`Sposta ${String(reminder.vehicle||"il mezzo").toLowerCase()}`,body,tag:`sposta-auto-${reminder.id}`,url:"/"}));
            reminder.sentAt=new Date().toISOString(); changed=true; sent++;
          } catch(e) {
            if(e.statusCode===404 || e.statusCode===410) { await s.delete(blob.key); changed=false; break; }
            console.error("Push fallita",blob.key,e);
          }
        }
      }
      if(changed) await s.setJSON(blob.key,device);
    }
  } while(cursor);
  return new Response(JSON.stringify({ok:true,sent}),{headers:{"content-type":"application/json"}});
}
export const config={schedule:"*/5 * * * *"};
