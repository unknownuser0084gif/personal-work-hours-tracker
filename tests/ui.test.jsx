// @vitest-environment jsdom
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { HashRouter } from "react-router-dom";
import { db } from "../src/db/db.js";
import {
  createStore,
  hydrate,
  saveSettings,
  saveEntry,
} from "../src/store/index.js";
vi.mock("../src/lib/pwa.js", () => ({
  updateSW: vi.fn(),
  installApp: vi.fn(),
  persistStorage: vi.fn(async () => false),
}));
vi.mock("../src/lib/notifications.js", () => ({
  startReminders: () => () => {},
  requestPermission: vi.fn(async () => "default"),
  testNotification: vi.fn(),
  enablePeriodic: vi.fn(),
  registration: vi.fn(),
}));
// Chart rendering needs layout, which jsdom does not provide; chart data has unit coverage.
vi.mock("../src/components/WorkChart.jsx", () => ({
  WorkChart: ({ days }) => (
    <div aria-label="chart-test">{days.length} days</div>
  ),
}));
import App from "../src/App.jsx";
let root, container, store;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
});
const flush = async (fn = () => {}) =>
  act(async () => {
    fn();
    await new Promise((r) => setTimeout(r, 20));
  });
function button(label) {
  return [...container.querySelectorAll("button")].find(
    (e) => e.textContent.trim() === label,
  );
}
function input(el, value) {
  const prototype =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, "value").set.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}
async function mount(done = true) {
  store = createStore();
  await store.dispatch(hydrate()).unwrap();
  if (done)
    await store.dispatch(saveSettings({ onboardingDone: true })).unwrap();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await flush(() =>
    root.render(
      <Provider store={store}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>,
    ),
  );
  for (let i = 0; i < 20 && store.getState().ui.status !== "ready"; i++)
    await flush();
  await flush();
}
beforeEach(async () => {
  window.location.hash = "#/";
  for (const t of db.tables) await t.clear();
});
afterEach(async () => {
  if (root) await act(() => root.unmount());
  container?.remove();
  root = null;
});
it("onboarding قابل رد و داشبورد واقعی قابل ثبت", async () => {
  await mount(false);
  expect(container.textContent).toContain("ساعت کاری و نهار");
  await flush(() => button("رد کردن و استفاده از پیش‌فرض‌ها").click());
  expect(container.textContent).toContain("امروز، با خیال راحت");
  await flush(() => button("ثبت ورود الان").click());
  expect(store.getState().entries).toHaveLength(1);
  expect(button("ثبت خروج الان")).toBeTruthy();
  expect((await db.settings.get("main")).onboardingDone).toBe(true);
});
it("شیت دستی بازه کامل گذشته و تقویم", async () => {
  await mount();
  await flush(() => button("ثبت با ساعت دلخواه").click());
  await flush(() => button("بازه کامل").click());
  await flush(() => container.querySelector(".date-input").click());
  await flush(() => container.querySelector('[aria-label="ماه قبل"]').click());
  await flush(() =>
    container.querySelector(".calendar-days button:not(:disabled)").click(),
  );
  const times = [...container.querySelectorAll("input[type=time]")];
  await flush(() => {
    input(times[0], "08:00");
    input(times[1], "16:00");
  });
  await flush(() => button("ثبت زمان").click());
  expect(store.getState().entries).toHaveLength(1);
  expect(store.getState().entries[0].out).toBe("16:00");
  expect(container.querySelector("[role=dialog]")).toBeNull();
  await flush(() => {
    window.location.hash = "#/calendar";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  expect(container.textContent).toContain("تقویم و تاریخچه");
});
it("هر پنج صفحه، فیلتر گزارش و راه‌اندازی مجدد کار می‌کنند", async () => {
  await mount();
  for (const [route, text] of [
    ["calendar", "تقویم و تاریخچه"],
    ["reports", "جزئیات روزبه‌روز"],
    ["salary", "جزئیات محاسبه"],
    ["settings", "برنامه کاری و حقوق"],
  ]) {
    await flush(() => {
      window.location.hash = `#/${route}`;
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(container.textContent).toContain(text);
  }
  await flush(() => {
    window.location.hash = "#/reports";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await flush(() => button("فصلی").click());
  expect(store.getState().ui.filter).toBe("seasonal");
  expect(container.querySelectorAll("tbody tr").length).toBeGreaterThanOrEqual(
    89,
  );
});

it("ویرایش و حذف یک بازه از داشبورد با تأیید", async () => {
  await mount();
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  await act(async () => {
    await store
      .dispatch(saveEntry({ entry: { date, in: "00:00", out: "00:01" } }))
      .unwrap();
  });
  await flush(() =>
    container.querySelector('[aria-label="ویرایش بازه"]').click(),
  );
  expect(container.textContent).toContain("ویرایش بازه");
  await flush(() =>
    input(container.querySelectorAll("input[type=time]")[1], "00:02"),
  );
  await flush(() => button("ثبت زمان").click());
  expect(store.getState().entries[0].out).toBe("00:02");
  await flush(() => container.querySelector('[aria-label="حذف بازه"]').click());
  expect(container.textContent).toContain("حذف این بازه؟");
  await flush(() => button("تأیید").click());
  expect(store.getState().entries).toHaveLength(0);
  expect(await db.entries.count()).toBe(0);
});

it("ارقام فارسی و ذخیره یادآوری، پیش‌نویس تنظیمات را از بین نمی‌برد", async () => {
  await mount();
  await flush(() => {
    window.location.hash = "#/settings";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  const salaryField = [...container.querySelectorAll("label.field")].find((e) =>
    e.textContent.includes("حقوق ماهانه"),
  );
  const amount = salaryField.querySelector("input");
  await flush(() => input(amount, "۳۰۰۰۰۰۰۰"));
  await act(async () => {
    await store
      .dispatch(saveSettings({ notifications: { entry: true } }))
      .unwrap();
  });
  expect(amount.value).toBe("۳۰۰۰۰۰۰۰");
  await flush(() => button("ذخیره تنظیمات").click());
  expect(store.getState().settings.monthlySalary).toBe(30000000);
  expect(store.getState().settings.notifications.entry).toBe(true);
});

it("راه‌اندازی مجدد، یادآوری فعال‌شده را با فرم قدیمی خاموش نمی‌کند", async () => {
  await mount(false);
  await act(async () => {
    await store
      .dispatch(saveSettings({ notifications: { entry: true } }))
      .unwrap();
  });
  await flush(() => button("مرحله بعد").click());
  expect(store.getState().settings.notifications.entry).toBe(true);
  await flush(() => button("مرحله بعد").click());
  expect(store.getState().settings.notifications.entry).toBe(true);
});
