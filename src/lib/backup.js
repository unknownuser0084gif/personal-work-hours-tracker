import { db, defaults } from "../db/db.js";
import { makeExport } from "./export.js";
import { calculateRange } from "./calc.js";
import { monthRange, weekRange } from "./jalali.js";
import { seasonRange } from "./seasons.js";
import { localISO, minutes, parseISO, shiftDays } from "./time.js";
import { validateSettings } from "./validation.js";

const format = "work-hours-tracker-backup";
const version = 1;
const compareDates = (a, b) => a.date.localeCompare(b.date);
const compareEntries = (a, b) =>
  compareDates(a, b) || a.in.localeCompare(b.in) || a.id - b.id;

// One transaction takes a consistent snapshot, including the worker's reminder log.
export async function createBackup(now = new Date()) {
  const data = await db.transaction("r", db.tables, async () => {
    const stored = await db.settings.get("main");
    return {
      settings: {
        ...defaults,
        ...stored,
        notifications: { ...defaults.notifications, ...stored?.notifications },
      },
      entries: (await db.entries.toArray()).sort(compareEntries),
      holidays: (await db.holidays.toArray()).sort(compareDates),
      dayNotes: (await db.dayNotes.toArray()).sort(compareDates),
      notifyLog: (await db.notifyLog.toArray()).sort((a, b) =>
        a.key.localeCompare(b.key),
      ),
    };
  });
  const dates = [
    localISO(now),
    ...data.entries.map((e) => e.date),
    ...data.holidays.map((h) => h.date),
    ...data.dayNotes.map((n) => n.date),
  ].sort();
  const range = { from: dates[0], to: dates.at(-1) };
  const report = (filter, period) => {
    const result = makeExport(filter, period, data.entries, data.settings, data.holidays, data.dayNotes, now);
    const calculated = calculateRange(period, data.entries, data.settings, data.holidays, now);
    result.days = result.days.map((day, index) => {
      const d = calculated.days[index];
      return {
        ...day,
        isWorking: d.isWorking,
        requiredMinutes: d.requiredMinutes,
        overtimeMinutes: d.overtimeMinutes,
        deficitMinutes: d.deficitMinutes,
        lateMinutes: d.lateMinutes,
        earlyMinutes: d.earlyMinutes,
        missing: d.missing,
        open: d.open,
        settled: d.settled,
      };
    });
    return result;
  };
  const periods = (filter, getRange) => {
    const result = [];
    for (let date = range.from; date <= range.to;) {
      const period = getRange(date);
      result.push(report(filter, period));
      date = shiftDays(period.to, 1);
    }
    return result;
  };
  return {
    format,
    version,
    databaseVersion: db.verno,
    exportedAt: now.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    defaultSettings: structuredClone(defaults),
    data,
    // Readable snapshots; restoration uses the lossless source data above.
    reports: {
      daily: report("daily", range),
      weekly: periods("weekly", weekRange),
      monthly: periods("monthly", monthRange),
      seasonal: periods("seasonal", seasonRange),
    },
  };
}

function ensure(condition, message = "ساختار فایل پشتیبان معتبر نیست.") {
  if (!condition) throw new Error(message);
}
const object = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const timestamp = (value) => typeof value === "string" && Number.isFinite(Date.parse(value));

function checkSettings(settings) {
  ensure(object(settings) && settings.id === "main");
  for (const key of ["defaultStart", "defaultEnd", "lunchStart", "lunchEnd"])
    ensure(typeof settings[key] === "string");
  validateSettings(settings);
  ensure(Number.isFinite(settings.reminderWindowMinutes) && settings.reminderWindowMinutes >= 0);
  ensure(Array.isArray(settings.weeklyOffDays));
  ensure(settings.weeklyOffDays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6));
  ensure(new Set(settings.weeklyOffDays).size === settings.weeklyOffDays.length);
  for (const key of ["holidaysAreOff", "onboardingDone", "persistent"])
    ensure(typeof settings[key] === "boolean");
  ensure(object(settings.notifications));
  for (const key of Object.keys(defaults.notifications))
    ensure(typeof settings.notifications[key] === "boolean");
}

function checkDatedRows(rows, field) {
  const dates = new Set();
  for (const row of rows) {
    ensure(object(row) && typeof row.date === "string" && typeof row[field] === "string");
    parseISO(row.date);
    ensure(!dates.has(row.date), "تاریخ تکراری در فایل پشتیبان وجود دارد.");
    if (field === "title") ensure(row.title.trim().length > 0);
    dates.add(row.date);
  }
}

// Validate everything before any delete. Historical rows are checked without a
// comparison to this device's current clock, so valid backups stay portable.
export function validateBackup(payload) {
  ensure(object(payload) && payload.format === format,
    "این فایل پشتیبان کامل ساعت کاری نیست؛ فایل دانلودشده از داشبورد را انتخاب کنید.");
  ensure(payload.version === version && payload.databaseVersion === db.verno,
    "نسخهٔ فایل پشتیبان با این نسخهٔ برنامه سازگار نیست.");
  ensure(timestamp(payload.exportedAt));
  checkSettings(payload.defaultSettings);
  const data = payload.data;
  ensure(object(data));
  ensure(Object.keys(data).sort().join(",") === "dayNotes,entries,holidays,notifyLog,settings");
  checkSettings(data.settings);
  for (const key of ["entries", "holidays", "dayNotes", "notifyLog"])
    ensure(Array.isArray(data[key]));
  const ids = new Set();
  for (const entry of data.entries) {
    ensure(object(entry) && Number.isSafeInteger(entry.id) && entry.id > 0);
    ensure(!ids.has(entry.id), "شناسهٔ تکراری در فایل پشتیبان وجود دارد.");
    ids.add(entry.id);
    ensure(typeof entry.date === "string" && typeof entry.in === "string");
    parseISO(entry.date);
    minutes(entry.in);
    ensure(entry.out === null || typeof entry.out === "string");
    if (entry.out !== null) ensure(minutes(entry.out) > minutes(entry.in), "بازهٔ زمانی فایل پشتیبان معتبر نیست.");
    if (entry.createdAt !== undefined) ensure(timestamp(entry.createdAt));
  }
  const sorted = [...data.entries].sort(compareEntries);
  for (let i = 1; i < sorted.length; i++) {
    const previous = sorted[i - 1], current = sorted[i];
    if (previous.date === current.date)
      ensure(previous.out !== null && minutes(previous.out) <= minutes(current.in),
        "بازه‌های فایل پشتیبان هم‌پوشانی دارند.");
  }
  checkDatedRows(data.holidays, "title");
  checkDatedRows(data.dayNotes, "note");
  const keys = new Set();
  for (const log of data.notifyLog) {
    ensure(object(log) && typeof log.key === "string" && log.key.length > 0 && timestamp(log.sentAt));
    ensure(!keys.has(log.key));
    keys.add(log.key);
  }
  return data;
}

export function parseBackup(text) {
  let payload;
  try {
    payload = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("فایل JSON معتبر نیست.");
  }
  validateBackup(payload);
  return payload;
}

export async function replaceFromBackup(payload) {
  // Copy before awaiting so the validated data cannot change during the write.
  const data = structuredClone(validateBackup(payload));
  return db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
    await db.settings.put(data.settings);
    for (const key of ["entries", "holidays", "dayNotes", "notifyLog"])
      await db.table(key).bulkAdd(data[key]);
    return data;
  });
}
