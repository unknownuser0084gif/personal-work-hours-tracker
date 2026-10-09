import { it, expect } from "vitest";
import {
  toJalali,
  fromJalali,
  monthRange,
  weekRange,
  parts,
  moveMonth,
} from "../src/lib/jalali";
import { seasonRange } from "../src/lib/seasons";
import { datesBetween } from "../src/lib/time";
it("تبدیل شمسی رفت و برگشت و ارقام فارسی", () => {
  expect(toJalali("2026-10-09")).toBe("1405-07-17");
  expect(fromJalali("۱۴۰۵-۰۷-۱۷")).toBe("2026-10-09");
  expect(() => fromJalali("1405-07-31")).toThrow();
});
it("مرز ماه و سال کبیسه", () => {
  for (const [j, length] of [
    ["1403-12-01", 30],
    ["1404-12-01", 29],
    ["1405-01-01", 31],
    ["1405-07-01", 30],
  ]) {
    const r = monthRange(fromJalali(j));
    expect(datesBetween(r.from, r.to)).toHaveLength(length);
    expect(parts(r.to).day).toBe(length);
  }
});
it("هفته از شنبه حتی در مرز ماه", () => {
  expect(weekRange("2026-10-09")).toEqual({
    from: "2026-10-03",
    to: "2026-10-09",
  });
  expect(weekRange("2026-10-10").from).toBe("2026-10-10");
});
it("مرز همه فصل‌ها و سال", () => {
  for (const [j, from, to] of [
    ["1405-01-01", "1405-01-01", "1405-03-31"],
    ["1405-06-31", "1405-04-01", "1405-06-31"],
    ["1405-07-01", "1405-07-01", "1405-09-30"],
    ["1403-12-30", "1403-10-01", "1403-12-30"],
  ]) {
    const r = seasonRange(fromJalali(j));
    expect(toJalali(r.from)).toBe(from);
    expect(toJalali(r.to)).toBe(to);
  }
  expect(toJalali(moveMonth(fromJalali("1405-12-01"), 1))).toBe("1406-01-01");
});
