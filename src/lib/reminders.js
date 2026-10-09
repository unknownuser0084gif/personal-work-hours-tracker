import { localISO, minutes, timeOf } from "./time.js";
import { dayPlan } from "./calc.js";
export const reminderText = {
  entry: ["یادآوری ورود", "وقت شروع کار است؛ ورودت را ثبت کن."],
  exit: ["یادآوری خروج", "وقت پایان کار است؛ خروجت را ثبت کن."],
  lunchStart: ["وقت نهار", "زمان استراحت و نهار رسیده است."],
  lunchEnd: ["پایان نهار", "بازه نهار تمام شده است."],
  open: ["خروج ثبت نشده", "یک بازه باز داری؛ ساعت خروج را تکمیل کن."],
};
// Pure and shared between the page and service worker. No Notification or DB access.
export function checkReminders({
  settings,
  entries = [],
  holidays = [],
  notifyLog = [],
  now = new Date(),
}) {
  const date = localISO(now);
  const clock = minutes(timeOf(now));
  const list = entries.filter((e) => e.date === date);
  const working = dayPlan(date, settings, holidays).isWorking;
  const open = list.some((e) => !e.out);
  const rules = [
    ["entry", minutes(settings.defaultStart), working && list.length === 0],
    ["exit", minutes(settings.defaultEnd), open],
    ["lunchStart", minutes(settings.lunchStart), working],
    ["lunchEnd", minutes(settings.lunchEnd), working],
    ["open", minutes(settings.defaultEnd) + settings.openWarningMinutes, open],
  ];
  const eligible = rules.filter(
    ([type, due, condition]) =>
      settings.notifications[type] &&
      condition &&
      clock >= due &&
      !notifyLog.some((l) => l.key === `${date}:${type}`),
  );
  const make = ([type, due]) => ({
    key: `${date}:${type}`,
    type,
    due,
    title: reminderText[type][0],
    body: reminderText[type][1],
    manual: type === "exit" || type === "open",
  });
  return {
    due: eligible
      .filter(([, due]) => clock - due <= settings.reminderWindowMinutes)
      .map(make),
    missed: eligible
      .filter(([, due]) => clock - due > settings.reminderWindowMinutes)
      .map(make),
  };
}
