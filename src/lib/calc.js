import { localISO, parseISO, minutes, timeOf, datesBetween } from "./time.js";
export function dayPlan(date, settings, holidays = []) {
  const isWeeklyOff = settings.weeklyOffDays.includes(parseISO(date).getDay());
  const holiday = holidays.find((h) => h.date === date);
  const isHoliday = Boolean(holiday);
  const isWorking = !isWeeklyOff && !(isHoliday && settings.holidaysAreOff);
  return {
    isWeeklyOff,
    isHoliday,
    holidayTitle: holiday?.title || null,
    isWorking,
    requiredMinutes: isWorking ? Math.round(settings.dailyHours * 60) : 0,
  };
}
export function calculateDay(
  date,
  entries,
  settings,
  holidays = [],
  now = new Date(),
) {
  const list = entries
    .filter((e) => e.date === date)
    .sort((a, b) => a.in.localeCompare(b.in));
  const plan = dayPlan(date, settings, holidays);
  const today = localISO(now);
  const clock = minutes(timeOf(now));
  const totalMinutes = list.reduce(
    (sum, e) =>
      sum +
      (e.out
        ? minutes(e.out) - minutes(e.in)
        : date === today
          ? Math.max(0, clock - minutes(e.in))
          : 0),
    0,
  );
  const open = list.some((e) => !e.out);
  const settled =
    date < today || (date === today && clock >= minutes(settings.defaultEnd));
  const lateMinutes =
    plan.isWorking &&
    list.length &&
    minutes(list[0].in) > minutes(settings.defaultStart) + settings.graceMinutes
      ? minutes(list[0].in) - minutes(settings.defaultStart)
      : 0;
  const last = list.at(-1);
  const earlyMinutes =
    plan.isWorking && last && !open
      ? Math.max(0, minutes(settings.defaultEnd) - minutes(last.out))
      : 0;
  return {
    date,
    ...plan,
    totalMinutes,
    overtimeMinutes: Math.max(0, totalMinutes - plan.requiredMinutes),
    deficitMinutes:
      plan.isWorking && settled
        ? Math.max(0, plan.requiredMinutes - totalMinutes)
        : 0,
    lateMinutes,
    earlyMinutes,
    missing: plan.isWorking && date < today && list.length === 0,
    incomplete: date < today && open,
    open,
    settled,
    entries: list,
  };
}
export function calculateRange(
  range,
  entries,
  settings,
  holidays = [],
  now = new Date(),
) {
  const days = datesBetween(range.from, range.to).map((date) =>
    calculateDay(date, entries, settings, holidays, now),
  );
  const sum = (k) => days.reduce((s, d) => s + d[k], 0);
  const workedDays = days.filter((d) => d.totalMinutes > 0).length;
  return {
    days,
    summary: {
      totalMinutes: sum("totalMinutes"),
      requiredMinutes: sum("requiredMinutes"),
      overtimeMinutes: sum("overtimeMinutes"),
      deficitMinutes: sum("deficitMinutes"),
      workedDays,
      workingDays: days.filter((d) => d.isWorking).length,
      averageMinutes: workedDays ? sum("totalMinutes") / workedDays : 0,
      lateDays: days.filter((d) => d.lateMinutes > 0).length,
      missingDays: days.filter((d) => d.missing).length,
    },
  };
}
