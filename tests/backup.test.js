import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { db, defaults } from "../src/db/db.js";
import { createBackup, parseBackup, validateBackup } from "../src/lib/backup.js";
import { createStore, hydrate, importBackup, patchUI, saveEntry } from "../src/store/index.js";
import { calculateSalary } from "../src/lib/salary.js";

const now = new Date(2026, 9, 16, 18);
const entries = [
  { id: 9, date: "2026-10-15", in: "13:00", out: null, createdAt: "2026-10-15T09:30:00Z" },
  { id: 4, date: "2026-09-21", in: "08:15", out: "17:00", createdAt: "2026-09-21T05:00:00Z" },
  { id: 7, date: "2026-10-15", in: "08:00", out: "12:00", createdAt: "2026-10-15T05:00:00Z", note: "جزئیات حفظ شوند" },
];
async function seed() {
  await db.settings.put({ ...defaults, monthlySalary: 32000000, holidaysAreOff: true,
    onboardingDone: true, weeklyOffDays: [4, 5], notifications: { ...defaults.notifications, entry: true } });
  await db.entries.bulkAdd(entries);
  await db.holidays.put({ date: "2026-10-13", title: "تعطیل شخصی" });
  await db.dayNotes.put({ date: "2026-11-01", note: "یادداشت آینده 🌱" });
  await db.notifyLog.put({ key: "2026-10-15-entry", sentAt: "2026-10-15T05:00:00Z" });
}
async function rawData() {
  return Object.fromEntries(await Promise.all(db.tables.map(async (table) => [table.name, await table.toArray()])));
}
beforeEach(async () => { for (const table of db.tables) await table.clear(); });
afterEach(() => vi.restoreAllMocks());

it("empty database includes every default, table and current reports without changing storage", async () => {
  const backup = await createBackup(now);
  expect(backup.data.settings).toEqual(defaults);
  expect(backup.defaultSettings).toEqual(defaults);
  for (const key of ["entries", "holidays", "dayNotes", "notifyLog"]) expect(backup.data[key]).toEqual([]);
  expect(backup.reports.monthly[0].salary.monthlySalary).toBe(defaults.monthlySalary);
  expect(await db.settings.count()).toBe(0);
  expect(parseBackup(JSON.stringify(backup)).data).toEqual(backup.data);
});

it("exports chronological lossless records, all reports and salaries, including future notes", async () => {
  await seed();
  const backup = await createBackup(now);
  expect(backup.data.entries.map((e) => e.id)).toEqual([4, 7, 9]);
  expect(backup.data.entries[1].note).toBe("جزئیات حفظ شوند");
  expect(backup.data.entries[2].out).toBeNull();
  expect(backup.data.settings.notifications.lunchEnd).toBe(false);
  expect(backup.data.notifyLog).toHaveLength(1);
  expect(backup.reports.daily.days.at(-1).note).toBe("یادداشت آینده 🌱");
  for (const key of ["weekly", "monthly", "seasonal"]) expect(backup.reports[key].length).toBeGreaterThan(0);
  expect(backup.reports.daily.days[0]).toMatchObject({ requiredMinutes: 480, lateMinutes: 15 });
  expect(backup.reports.monthly[0].salary).toEqual(calculateSalary("2026-09-21", entries, backup.data.settings, backup.data.holidays, now));
  expect(backup.reports.seasonal[0].salary.months).toHaveLength(3);
});

it("round trip replaces every table and Redux state, survives a fresh store, and preserves ids", async () => {
  await seed();
  const original = await rawData();
  const backup = parseBackup(JSON.stringify(await createBackup(now)));
  for (const table of db.tables) await table.clear();
  await db.entries.put({ id: 1, date: "2026-10-01", in: "10:00", out: "11:00" });
  await db.holidays.put({ date: "2026-10-01", title: "باید حذف شود" });
  await db.notifyLog.put({ key: "remove-me", sentAt: now.toISOString() });
  const store = createStore();
  await store.dispatch(hydrate()).unwrap();
  store.dispatch(patchUI({ manual: { mode: "entry" }, confirm: {}, missed: [{}], clearRequested: true }));
  await store.dispatch(importBackup(backup)).unwrap();
  expect(await rawData()).toEqual(original);
  const next = createStore();
  await next.dispatch(hydrate()).unwrap();
  for (const key of ["settings", "entries", "holidays", "dayNotes"])
    expect(next.getState()[key]).toEqual(store.getState()[key]);
  expect(store.getState().ui).toMatchObject({ manual: null, confirm: null, missed: [], clearRequested: false });
  const added = await store.dispatch(saveEntry({ entry: { date: "2026-10-01", in: "08:00", out: "09:00" } })).unwrap();
  expect(added.id).toBeGreaterThan(9);
});

it.each([
  ["unsupported version", (p) => { p.version = 2; }],
  ["missing table", (p) => { delete p.data.dayNotes; }],
  ["bad settings", (p) => { p.data.settings.notifications.entry = "yes"; }],
  ["bad weekdays", (p) => { p.data.settings.weeklyOffDays = [7]; }],
  ["duplicate id", (p) => { p.data.entries.push({ ...p.data.entries[0] }); }],
  ["overlap", (p) => { p.data.entries[2].in = "11:00"; }],
  ["invalid date", (p) => { p.data.entries[0].date = "2026-02-30"; }],
  ["invalid log", (p) => { p.data.notifyLog[0].sentAt = "bad"; }],
])("rejects %s without touching any data", async (_, mutate) => {
  await seed();
  const store = createStore();
  await store.dispatch(hydrate()).unwrap();
  const before = await rawData(), state = store.getState();
  const backup = await createBackup(now);
  mutate(backup);
  await expect(store.dispatch(importBackup(backup)).unwrap()).rejects.toBeTruthy();
  expect(await rawData()).toEqual(before);
  expect(store.getState()).toEqual(state);
});

it("rolls back all tables and leaves Redux untouched if writing fails after deletion", async () => {
  await seed();
  const backup = await createBackup(now);
  const store = createStore();
  await store.dispatch(hydrate()).unwrap();
  const before = await rawData(), state = store.getState();
  const add = IDBObjectStore.prototype.add;
  vi.spyOn(IDBObjectStore.prototype, "add").mockImplementation(function (...args) {
    if (this.name === "dayNotes") throw new Error("QuotaExceededError");
    return add.apply(this, args);
  });
  await expect(store.dispatch(importBackup(backup)).unwrap()).rejects.toContain("QuotaExceededError");
  expect(await rawData()).toEqual(before);
  expect(store.getState()).toEqual(state);
});

it("handles UTF-8 BOM and rejects broken JSON and old partial report exports", async () => {
  const backup = await createBackup(now);
  expect(parseBackup("\uFEFF" + JSON.stringify(backup)).format).toBe(backup.format);
  expect(() => parseBackup("{")).toThrow("فایل JSON معتبر نیست");
  expect(() => validateBackup(backup.reports.daily)).toThrow("پشتیبان کامل");
});
