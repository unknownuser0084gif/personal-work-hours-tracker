import { it, expect } from "vitest";
import { defaults } from "../src/db/db";
import { calculateSalary } from "../src/lib/salary";
import { monthRange, fromJalali } from "../src/lib/jalali";
import { datesBetween, parseISO } from "../src/lib/time";
const date = fromJalali("1405-07-01"),
  now = new Date(2026, 10, 25, 18),
  s = { ...defaults, monthlySalary: 24000000 };
const working = datesBetween(...Object.values(monthRange(date))).filter(
  (d) => parseISO(d).getDay() !== 5,
);
const entries = working.map((date) => ({ date, in: "08:00", out: "16:00" }));
it("ماه کامل برابر حقوق پایه", () => {
  const r = calculateSalary(date, entries, s, [], now);
  expect(r.earned).toBe(24000000);
  expect(r.requiredMinutes).toBe(working.length * 480);
  expect(r.deficitAmount).toBe(0);
});
it("اضافه‌کار نرخ عادی و کسر کار", () => {
  const extra = entries.map((e, i) => (i === 0 ? { ...e, out: "17:00" } : e));
  const short = entries.map((e, i) => (i === 0 ? { ...e, out: "15:00" } : e));
  const base = calculateSalary(date, entries, s, [], now);
  expect(calculateSalary(date, extra, s, [], now).earned).toBe(
    Math.round(24000000 + base.hourlyRate),
  );
  expect(calculateSalary(date, short, s, [], now).earned).toBe(
    Math.round(24000000 - base.hourlyRate),
  );
});
it("تعطیلی دستی موظف را کم می‌کند؛ ماه بدون روز کاری صفر امن", () => {
  const h = [{ date: working[0], title: "تعطیل" }];
  expect(
    calculateSalary(date, [], { ...s, holidaysAreOff: true }, h, now)
      .requiredMinutes,
  ).toBe((working.length - 1) * 480);
  const r = calculateSalary(
    date,
    entries,
    { ...s, weeklyOffDays: [0, 1, 2, 3, 4, 5, 6] },
    [],
    now,
  );
  expect(r.zeroRequired).toBe(true);
  expect(r.hourlyRate).toBe(0);
  expect(r.earned).toBe(0);
});
it("پیش‌بینی بر پایه میانگین روزهای کاری گذشته", () => {
  const n = parseISO(working[2]);
  n.setHours(18);
  const r = calculateSalary(date, entries.slice(0, 2), s, [], n);
  expect(r.forecast).toBe(
    Math.round(((960 + r.remainingWorkingDays * 480) / 60) * r.hourlyRate),
  );
});
