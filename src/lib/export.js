import { calculateRange } from "./calc.js";
import { calculateSalary } from "./salary.js";
import { toJalali, weekday, parts, moveMonth } from "./jalali.js";
import { seasonRange, seasonSlugs } from "./seasons.js";
import { localTimestamp } from "./time.js";
import { rawDuration } from "./format.js";
export function makeExport(
  filter,
  range,
  entries,
  settings,
  holidays = [],
  notes = [],
  now = new Date(),
) {
  const report = calculateRange(range, entries, settings, holidays, now);
  const payload = {
    exportedAt: localTimestamp(now),
    filter,
    range: { from: toJalali(range.from), to: toJalali(range.to) },
    summary: {
      ...report.summary,
      totalHours: rawDuration(report.summary.totalMinutes),
    },
    days: report.days.map((d) => ({
      date: toJalali(d.date),
      gregorian: d.date,
      weekday: weekday(d.date),
      isWeeklyOff: d.isWeeklyOff,
      isHoliday: d.isHoliday,
      holidayTitle: d.holidayTitle,
      totalMinutes: d.totalMinutes,
      incomplete: d.incomplete,
      note: notes.find((n) => n.date === d.date)?.note || "",
      entries: d.entries.map((e) => ({ in: e.in, out: e.out })),
    })),
  };
  if (filter === "monthly")
    payload.salary = calculateSalary(
      range.from,
      entries,
      settings,
      holidays,
      now,
    );
  if (filter === "seasonal") {
    const months = [0, 1, 2].map((n) =>
      calculateSalary(
        moveMonth(range.from, n),
        entries,
        settings,
        holidays,
        now,
      ),
    );
    payload.salary = {
      months,
      earned: months.reduce((s, m) => s + m.earned, 0),
    };
  }
  return payload;
}
export function exportFilename(filter, range) {
  let label = toJalali(range.from);
  if (filter === "monthly") label = label.slice(0, 7);
  if (filter === "seasonal") {
    const s = seasonRange(range.from);
    label = `${parts(range.from).year}-${seasonSlugs[s.index]}`;
  }
  return `worklog-${filter}-${label}.json`;
}
export function downloadJSON(payload, filename) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
