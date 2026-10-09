import Dexie from "dexie";
export const defaults = {
  id: "main",
  defaultStart: "08:00",
  defaultEnd: "17:00",
  dailyHours: 8,
  lunchStart: "12:30",
  lunchEnd: "13:30",
  weeklyOffDays: [5],
  graceMinutes: 0,
  holidaysAreOff: false,
  monthlySalary: 20000000,
  openWarningMinutes: 60,
  reminderWindowMinutes: 90,
  notifications: {
    entry: false,
    exit: false,
    lunchStart: false,
    lunchEnd: false,
    open: false,
  },
  onboardingDone: false,
  persistent: false,
};
export const db = new Dexie("work-hours-tracker");
db.version(1).stores({
  entries: "++id,date",
  settings: "id",
  holidays: "date",
  dayNotes: "date",
  notifyLog: "key,sentAt",
});
export async function readAll() {
  let settings = await db.settings.get("main");
  if (!settings) {
    settings = { ...defaults };
    await db.settings.put(settings);
  }
  return {
    settings: {
      ...defaults,
      ...settings,
      notifications: { ...defaults.notifications, ...settings.notifications },
    },
    entries: await db.entries.toArray(),
    holidays: await db.holidays.toArray(),
    dayNotes: await db.dayNotes.toArray(),
  };
}
