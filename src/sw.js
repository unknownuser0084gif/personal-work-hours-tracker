import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { clientsClaim } from "workbox-core";
import { db, readAll } from "./db/db.js";
import { checkReminders } from "./lib/reminders.js";
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
clientsClaim();
const base = import.meta.env.BASE_URL;
// One active worker owns sending; serialize page and periodic triggers.
let queue = Promise.resolve();
async function sendReminders() {
  if (self.Notification?.permission !== "granted") return;
  const data = await readAll();
  const logs = await db.notifyLog.toArray();
  const { due } = checkReminders({ ...data, notifyLog: logs });
  for (const r of due) {
    if (await db.notifyLog.get(r.key)) continue;
    await self.registration.showNotification(r.title, {
      body: r.body,
      icon: `${base}icons/icon-192.png`,
      badge: `${base}icons/icon-192.png`,
      tag: r.key,
      lang: "fa",
      dir: "rtl",
      data: { url: `${base}#/${r.manual ? "?manual=out" : ""}` },
    });
    await db.notifyLog.put({ key: r.key, sentAt: new Date().toISOString() });
  }
}
function enqueue() {
  queue = queue.catch(() => {}).then(sendReminders);
  return queue;
}
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data?.type === "CHECK_REMINDERS") event.waitUntil(enqueue());
});
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "check-reminders") event.waitUntil(enqueue());
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const url = new URL(
        event.notification.data?.url || `${base}#/`,
        self.location.origin,
      ).href;
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const app = windows.find((w) => new URL(w.url).pathname.startsWith(base));
      if (app) {
        await app.navigate(url);
        await app.focus();
      } else await self.clients.openWindow(url);
    })(),
  );
});
