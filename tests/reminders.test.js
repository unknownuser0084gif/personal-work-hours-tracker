import { it, expect } from "vitest";
import { checkReminders } from "../src/lib/reminders";
import { defaults } from "../src/db/db";
const settings = {
  ...defaults,
  notifications: {
    entry: true,
    exit: true,
    lunchStart: true,
    lunchEnd: true,
    open: true,
  },
};
const run = (h, m = 0, patch = {}) =>
  checkReminders({ settings, now: new Date(2026, 9, 10, h, m), ...patch });
it("قبل موعد ارسال ندارد، موعد ورود سزاوار ارسال", () => {
  expect(run(7).due).toHaveLength(0);
  expect(run(8).due.map((r) => r.type)).toEqual(["entry"]);
});
it("جلوگیری تکرار و عدم یادآوری ورود با ثبت قبلی", () => {
  expect(
    run(8, 0, { notifyLog: [{ key: "2026-10-10:entry" }] }).due,
  ).toHaveLength(0);
  expect(
    run(8, 0, { entries: [{ date: "2026-10-10", in: "07:00", out: "07:30" }] })
      .due,
  ).toHaveLength(0);
});
it("پنجره ۹۰ دقیقه و بنر ازدست رفته", () => {
  expect(run(9, 30).due[0].type).toBe("entry");
  expect(run(9, 31).due).toHaveLength(0);
  expect(run(9, 31).missed[0].type).toBe("entry");
});
it("روز غیرکاری یادآوری ورود و نهار ندارد", () =>
  expect(
    checkReminders({ settings, now: new Date(2026, 9, 9, 8) }).due,
  ).toHaveLength(0));
it("خروج و هشدار فقط با بازه باز و مسیر دستی", () => {
  const entries = [{ date: "2026-10-10", in: "08:00", out: null }];
  expect(run(17, 0, { entries }).due[0]).toMatchObject({
    type: "exit",
    manual: true,
  });
  expect(run(18, 0, { entries }).due.some((r) => r.type === "open")).toBe(true);
  expect(run(17).due.some((r) => r.type === "exit")).toBe(false);
});
it("همه پیش‌فرض خاموش", () =>
  expect(
    checkReminders({ settings: defaults, now: new Date(2026, 9, 10, 8) }).due,
  ).toHaveLength(0));
