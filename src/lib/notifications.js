import { db, readAll } from "../db/db.js";
import { checkReminders } from "./reminders.js";
import { store, patchUI } from "../store/index.js";
const supported = () =>
  typeof Notification !== "undefined" && "serviceWorker" in navigator;
export async function registration() {
  if (!("serviceWorker" in navigator))
    throw new Error("مرورگر شما از سرویس‌ورکر پشتیبانی نمی‌کند.");
  const r = await navigator.serviceWorker.getRegistration(
    import.meta.env.BASE_URL,
  );
  if (!r?.active)
    throw new Error(
      "یادآوری در نسخه ساخته‌شده و پس از فعال‌شدن برنامه آفلاین در دسترس است.",
    );
  return r;
}
export async function enablePeriodic(reg) {
  try {
    if (!("periodicSync" in reg)) {
      store.dispatch(patchUI({ periodic: "unsupported" }));
      return;
    }
    const permission = await navigator.permissions.query({
      name: "periodic-background-sync",
    });
    if (permission.state === "granted") {
      await reg.periodicSync.register("check-reminders", {
        minInterval: 15 * 60 * 1000,
      });
      store.dispatch(patchUI({ periodic: "registered" }));
    } else store.dispatch(patchUI({ periodic: "denied" }));
  } catch {
    store.dispatch(patchUI({ periodic: "unsupported" }));
  }
}
export async function requestPermission() {
  if (!supported())
    throw new Error("نوتیفیکیشن در این مرورگر پشتیبانی نمی‌شود.");
  const permission = await Notification.requestPermission();
  store.dispatch(patchUI({ permission }));
  if (permission === "granted") {
    try {
      await enablePeriodic(await registration());
    } catch {
      /* visible support state; registration may not yet be active */
    }
  }
  return permission;
}
export async function testNotification() {
  if (!supported() || Notification.permission !== "granted")
    throw new Error("ابتدا مجوز نوتیفیکیشن را فعال کنید.");
  const reg = await registration();
  await reg.showNotification("ساعت کاری", {
    body: "یادآوری آزمایشی با موفقیت ارسال شد.",
    icon: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    badge: `${import.meta.env.BASE_URL}icons/icon-192.png`,
    tag: "worklog-test",
    lang: "fa",
    dir: "rtl",
    data: { url: `${import.meta.env.BASE_URL}#/` },
  });
}
export async function inspectReminders() {
  try {
    const data = await readAll();
    const logs = await db.notifyLog.toArray();
    const reminders = checkReminders({ ...data, notifyLog: logs });
    store.dispatch(
      patchUI({
        missed: reminders.missed,
        permission:
          typeof Notification === "undefined"
            ? "unsupported"
            : Notification.permission,
      }),
    );
    if (supported() && Notification.permission === "granted") {
      const reg = await navigator.serviceWorker.getRegistration(
        import.meta.env.BASE_URL,
      );
      reg?.active?.postMessage({ type: "CHECK_REMINDERS" });
    }
  } catch {
    /* initial hydrate owns and displays storage errors */
  }
}
export function startReminders() {
  const run = () => {
    if (store.getState().ui.status === "ready") inspectReminders();
  };
  const visible = () => {
    if (document.visibilityState === "visible") {
      store.dispatch(
        patchUI({
          permission:
            typeof Notification === "undefined"
              ? "unsupported"
              : Notification.permission,
        }),
      );
      run();
    }
  };
  const id = setInterval(run, 30000);
  document.addEventListener("visibilitychange", visible);
  run();
  return () => {
    clearInterval(id);
    document.removeEventListener("visibilitychange", visible);
  };
}
