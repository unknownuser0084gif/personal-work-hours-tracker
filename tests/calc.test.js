import { describe, it, expect } from "vitest";
import { defaults as s } from "../src/db/db";
import { calculateDay, calculateRange } from "../src/lib/calc";
const date = "2026-10-10",
  now = new Date(2026, 9, 10, 18),
  row = (i, o, d = date) => ({ date: d, in: i, out: o });
describe("کارکرد روز", () => {
  it("چند بازه و نهار بدون کسر", () =>
    expect(
      calculateDay(
        date,
        [row("08:00", "12:00"), row("13:00", "17:00")],
        s,
        [],
        now,
      ).totalMinutes,
    ).toBe(480));
  it("بازه باز گذشته صفر و امروز زنده", () => {
    expect(
      calculateDay("2026-10-09", [row("08:00", null, "2026-10-09")], s, [], now)
        .totalMinutes,
    ).toBe(0);
    expect(
      calculateDay(date, [row("08:00", null)], s, [], new Date(2026, 9, 10, 10))
        .totalMinutes,
    ).toBe(120);
  });
  it("تعطیل هفتگی کل کار اضافه‌کار", () => {
    const d = calculateDay(
      "2026-10-09",
      [row("08:00", "10:00", "2026-10-09")],
      s,
      [],
      now,
    );
    expect(d.requiredMinutes).toBe(0);
    expect(d.overtimeMinutes).toBe(120);
  });
  it("اضافه، کسر، تأخیر و تعجیل", () => {
    expect(
      calculateDay(date, [row("08:00", "18:00")], s, [], now).overtimeMinutes,
    ).toBe(120);
    const d = calculateDay(date, [row("08:10", "16:00")], s, [], now);
    expect(d.deficitMinutes).toBe(10);
    expect(d.lateMinutes).toBe(10);
    expect(d.earlyMinutes).toBe(60);
    expect(
      calculateDay(
        date,
        [row("08:05", "16:00")],
        { ...s, graceMinutes: 5 },
        [],
        now,
      ).lateMinutes,
    ).toBe(0);
  });
  it("کسر فقط گذشته یا بعد پایان امروز؛ آینده بدون کسر", () => {
    expect(
      calculateDay(date, [], s, [], new Date(2026, 9, 10, 10)).deficitMinutes,
    ).toBe(0);
    expect(calculateDay(date, [], s, [], now).deficitMinutes).toBe(480);
    expect(calculateDay("2026-10-11", [], s, [], now).deficitMinutes).toBe(0);
    expect(calculateDay("2026-10-08", [], s, [], now).missing).toBe(true);
  });
  it("اثر holidaysAreOff", () => {
    const h = [{ date, title: "مناسبت" }];
    expect(calculateDay(date, [], s, h, now).requiredMinutes).toBe(480);
    expect(
      calculateDay(date, [], { ...s, holidaysAreOff: true }, h, now)
        .requiredMinutes,
    ).toBe(0);
  });
  it("ناقص گذشته و مجموع بازه‌های بسته حفظ شود", () => {
    const d = calculateDay(
      "2026-10-08",
      [row("08:00", "10:00", "2026-10-08"), row("11:00", null, "2026-10-08")],
      s,
      [],
      now,
    );
    expect(d.incomplete).toBe(true);
    expect(d.totalMinutes).toBe(120);
  });
  it("گزارش چند روز", () => {
    const r = calculateRange(
      { from: "2026-10-10", to: "2026-10-11" },
      [row("08:00", "16:00")],
      s,
      [],
      now,
    );
    expect(r.summary.requiredMinutes).toBe(960);
    expect(r.summary.workedDays).toBe(1);
    expect(r.summary.averageMinutes).toBe(480);
  });
});
