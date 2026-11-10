import { configurePush, json } from "./_push-lib.mjs";
export default async function handler(request) {
  if (request.method !== "GET") return json({error:"Metodo non consentito"},405);
  try { return json(configurePush()); } catch(e) { return json({error:e.message},500); }
}
export const config={path:"/api/vapid"};
