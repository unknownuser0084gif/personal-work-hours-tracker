import { calculateRange } from "./calc.js";
import { monthRange } from "./jalali.js";
import { localISO } from "./time.js";
export function calculateSalary(
  iso,
  entries,
  settings,
  holidays = [],
  now = new Date(),
) {
  const range = monthRange(iso);
  const report = calculateRange(range, entries, settings, holidays, now);
  const s = report.summary;
  const hourlyRate = s.requiredMinutes
    ? settings.monthlySalary / (s.requiredMinutes / 60)
    : 0;
  const today = localISO(now);
  const pastWorking = report.days.filter((d) => d.isWorking && d.date < today);
  const remaining = report.days.filter(
    (d) => d.isWorking && d.date > today,
  ).length;
  const avg = pastWorking.length
    ? pastWorking.reduce((n, d) => n + d.totalMinutes, 0) / pastWorking.length
    : 0;
  return {
    monthlySalary: settings.monthlySalary,
    requiredMinutes: s.requiredMinutes,
    workedMinutes: s.totalMinutes,
    hourlyRate,
    earned: Math.round((s.totalMinutes / 60) * hourlyRate),
    overtimeMinutes: s.overtimeMinutes,
    deficitMinutes: s.deficitMinutes,
    overtimeAmount: Math.round((s.overtimeMinutes / 60) * hourlyRate),
    deficitAmount: Math.round((s.deficitMinutes / 60) * hourlyRate),
    forecast: Math.round(
      ((s.totalMinutes + avg * remaining) / 60) * hourlyRate,
    ),
    isEstimate: range.to >= today,
    hasHistory: pastWorking.length > 0,
    zeroRequired: s.requiredMinutes === 0,
    remainingWorkingDays: remaining,
  };
}
