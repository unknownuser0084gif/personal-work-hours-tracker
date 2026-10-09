import { it, expect } from "vitest";
import { defaults } from "../src/db/db";
import { makeExport, exportFilename } from "../src/lib/export";
import { fromJalali, monthRange, weekRange } from "../src/lib/jalali";
import { seasonRange } from "../src/lib/seasons";
const date = fromJalali("1405-07-17"),
  now = new Date(2026, 9, 9, 18);
it("ساختار JSON فارسی و ساعت خام و حقوق فقط ماه/فصل", () => {
  const entries = [{ date, in: "08:00", out: "12:00" }];
  const r = makeExport(
    "daily",
    { from: date, to: date },
    entries,
    defaults,
    [],
    [{ date, note: "یادداشت" }],
    now,
  );
  expect(r.summary.totalMinutes).toBe(240);
  expect(r.summary.totalHours).toBe("04:00");
  expect(r.days[0]).toMatchObject({
    date: "1405-07-17",
    gregorian: date,
    note: "یادداشت",
    isWeeklyOff: true,
  });
  expect(r.salary).toBeUndefined();
  expect(JSON.parse(JSON.stringify(r)).days[0].entries[0].out).toBe("12:00");
  expect(r.exportedAt).toMatch(/[+-]\d\d:\d\d$/);
  expect(
    makeExport("monthly", monthRange(date), entries, defaults, [], [], now)
      .salary,
  ).toBeDefined();
  expect(
    makeExport("seasonal", seasonRange(date), entries, defaults, [], [], now)
      .salary.months,
  ).toHaveLength(3);
});
it("نام فایل هر چهار فیلتر", () => {
  expect(exportFilename("daily", { from: date, to: date })).toBe(
    "worklog-daily-1405-07-17.json",
  );
  expect(exportFilename("weekly", weekRange(date))).toBe(
    "worklog-weekly-1405-07-11.json",
  );
  expect(exportFilename("monthly", monthRange(date))).toBe(
    "worklog-monthly-1405-07.json",
  );
  expect(exportFilename("seasonal", seasonRange(date))).toBe(
    "worklog-seasonal-1405-autumn.json",
  );
});
