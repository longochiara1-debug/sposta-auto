import { getStore } from "@netlify/blobs";
import webpush from "web-push";
import crypto from "node:crypto";

export const store = () => getStore("sposta-auto-push");
export const keyFor = id => `device-${crypto.createHash("sha256").update(id).digest("hex")}.json`;
export const json = (body,status=200) => new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}});
export function configurePush() {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) throw new Error("Variabili VAPID mancanti");
  webpush.setVapidDetails(VAPID_SUBJECT,VAPID_PUBLIC_KEY,VAPID_PRIVATE_KEY);
  return { publicKey: VAPID_PUBLIC_KEY };
}
export async function loadDevice(deviceId) { return store().get(keyFor(deviceId),{type:"json"}); }
export async function saveDevice(deviceId,data) { return store().setJSON(keyFor(deviceId),data); }
