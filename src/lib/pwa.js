import { registerSW } from "virtual:pwa-register";
import { store, patchUI } from "../store/index.js";
import { enablePeriodic } from "./notifications.js";
let installEvent;
export const updateSW = registerSW({
  onNeedRefresh() {
    store.dispatch(patchUI({ updateAvailable: true }));
  },
  onOfflineReady() {
    store.dispatch(patchUI({ offline: true }));
  },
  onRegisteredSW(_, reg) {
    if (reg) {
      if (
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      )
        enablePeriodic(reg);
      setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
    }
  },
  onRegisterError() {
    store.dispatch(patchUI({ offline: false }));
  },
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installEvent = event;
  store.dispatch(patchUI({ installAvailable: true }));
});
window.addEventListener("appinstalled", () => {
  installEvent = null;
  store.dispatch(patchUI({ installAvailable: false }));
});
export async function installApp() {
  if (!installEvent) return false;
  await installEvent.prompt();
  const choice = await installEvent.userChoice;
  installEvent = null;
  store.dispatch(patchUI({ installAvailable: false }));
  return choice.outcome === "accepted";
}
export async function persistStorage() {
  try {
    return Boolean(await navigator.storage?.persist?.());
  } catch {
    return false;
  }
}
