import { beforeEach, it, expect } from "vitest";
import { db } from "../src/db/db";
import {
  createStore,
  hydrate,
  saveEntry,
  deleteEntry,
  restoreEntry,
  saveSettings,
  saveHoliday,
  deleteHoliday,
  saveNote,
  clearAll,
  patchUI,
  selectEntriesByDate,
  selectDay,
} from "../src/store";
beforeEach(async () => {
  for (const t of db.tables) await t.clear();
});
it("hydrate، ثبت، ویرایش، حذف، Undo و خواندن مجدد", async () => {
  const store = createStore();
  await store.dispatch(hydrate()).unwrap();
  expect(store.getState().ui.status).toBe("ready");
  const entry = await store
    .dispatch(
      saveEntry({ entry: { date: "2026-10-08", in: "08:00", out: "12:00" } }),
    )
    .unwrap();
  expect(await db.entries.count()).toBe(1);
  expect(selectEntriesByDate(store.getState())[entry.date]).toHaveLength(1);
  await store
    .dispatch(saveEntry({ entry: { ...entry, out: "16:00" } }))
    .unwrap();
  expect(
    selectDay(store.getState(), entry.date, new Date(2026, 9, 9)).totalMinutes,
  ).toBe(480);
  const removed = await store.dispatch(deleteEntry(entry.id)).unwrap();
  expect(store.getState().entries).toHaveLength(0);
  await store.dispatch(restoreEntry(removed)).unwrap();
  const next = createStore();
  await next.dispatch(hydrate()).unwrap();
  expect(next.getState().entries[0].out).toBe("16:00");
});
it("خطا و هم‌زمانی به دو حقیقت متناقض نمی‌انجامد", async () => {
  const store = createStore();
  await store.dispatch(hydrate());
  const a = store.dispatch(
    saveEntry({ entry: { date: "2026-10-08", in: "08:00", out: null } }),
  );
  const b = store.dispatch(
    saveEntry({ entry: { date: "2026-10-08", in: "09:00", out: null } }),
  );
  const results = await Promise.all([a, b]);
  expect(
    results.filter((r) => r.meta.requestStatus === "fulfilled"),
  ).toHaveLength(1);
  expect(await db.entries.count()).toBe(1);
  expect(store.getState().entries).toHaveLength(1);
});
it("تنظیمات، تعطیلی، یادداشت از Dexie ماندگارند", async () => {
  const store = createStore();
  await store.dispatch(hydrate());
  await store.dispatch(saveSettings({ monthlySalary: 30000000 })).unwrap();
  await store
    .dispatch(saveHoliday({ date: "2026-10-08", title: "روز شخصی" }))
    .unwrap();
  await store.dispatch(saveNote({ date: "2026-10-08", note: "جلسه" })).unwrap();
  expect((await db.settings.get("main")).monthlySalary).toBe(30000000);
  await store.dispatch(deleteHoliday("2026-10-08")).unwrap();
  expect(await db.holidays.count()).toBe(0);
  expect(store.getState().dayNotes[0].note).toBe("جلسه");
});

it("ویرایش تاریخ مناسبت اتمی و پاک‌سازی کامل", async () => {
  const s = createStore();
  await s.dispatch(hydrate()).unwrap();
  await s
    .dispatch(saveHoliday({ date: "2026-10-08", title: "قدیمی" }))
    .unwrap();
  await s
    .dispatch(
      saveHoliday({
        date: "2026-10-09",
        title: "جدید",
        originalDate: "2026-10-08",
      }),
    )
    .unwrap();
  expect(s.getState().holidays).toEqual([
    { date: "2026-10-09", title: "جدید" },
  ]);
  expect(await db.holidays.get("2026-10-08")).toBeUndefined();
  s.dispatch(
    patchUI({ filter: "daily", manual: { date: "2026-10-09", mode: "exit" } }),
  );
  expect(s.getState().ui.filter).toBe("daily");
  await s.dispatch(clearAll()).unwrap();
  expect(await db.holidays.count()).toBe(0);
  expect(s.getState().settings.onboardingDone).toBe(false);
  expect(s.getState().ui.manual).toBeNull();
});
