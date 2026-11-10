const DEVICE_KEY = "sposta-auto-device-id";
const STORE_KEY = "street-cleaning-v1";

function deviceId() {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

function decodeBase64Url(value) {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function notificationsSupported() {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function notificationStatus() {
  if (!notificationsSupported()) return "unsupported";
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "enabled" : Notification.permission;
}

export async function enableNotifications() {
  if (!notificationsSupported()) throw new Error("Notifiche push non supportate. Apri la PWA dalla schermata Home su iOS 16.4 o successivo.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") throw new Error("Permesso notifiche non concesso.");

  const registration = await navigator.serviceWorker.ready;
  const keyResponse = await fetch("/api/vapid", { cache: "no-store" });
  if (!keyResponse.ok) throw new Error("Chiave notifiche non disponibile.");
  const { publicKey } = await keyResponse.json();

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: decodeBase64Url(publicKey),
    });
  }

  await sendState(subscription);
  return subscription;
}

export async function syncPushReminders(spots) {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return false;
  await sendState(subscription, spots);
  return true;
}

export async function syncStoredPushReminders() {
  let spots = [];
  try { spots = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch {}
  return syncPushReminders(spots);
}

async function sendState(subscription, spots) {
  if (!spots) {
    try { spots = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); } catch { spots = []; }
  }
  const reminders = spots.filter(s => s.reminderAt && s.cleaningAt).map(s => ({
    id: s.id,
    vehicle: s.vehicle,
    address: s.address,
    segment: s.rule?.segment || "",
    cleaningAt: s.cleaningAt,
    reminderAt: s.reminderAt,
  }));
  const response = await fetch("/api/push-state", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: deviceId(), subscription: subscription.toJSON(), reminders }),
  });
  if (!response.ok) throw new Error("Impossibile salvare i promemoria push.");
}

export async function sendTestNotification() {
  const response = await fetch("/api/push-test", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ deviceId: deviceId() }),
  });
  if (!response.ok) throw new Error("Notifica di prova non inviata.");
  return response.json();
}
