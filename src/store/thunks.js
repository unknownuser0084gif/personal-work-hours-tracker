import { createAsyncThunk } from "@reduxjs/toolkit";
import { db, defaults, readAll } from "../db/db.js";
import {
  validateEntry,
  manualEntry,
  validateSettings,
} from "../lib/validation.js";
import { parseISO } from "../lib/time.js";
export const hydrate = createAsyncThunk("data/hydrate", () => readAll());
export const saveEntry = createAsyncThunk(
  "entries/save",
  async ({ entry, manual, now }, { rejectWithValue }) => {
    try {
      return await db.transaction("rw", db.entries, async () => {
        const all = await db.entries.toArray();
        const candidate = manual
          ? manualEntry(manual, all, now ? new Date(now) : new Date())
          : validateEntry(entry, all, now ? new Date(now) : new Date());
        const saved = {
          ...candidate,
          createdAt: candidate.createdAt || new Date().toISOString(),
        };
        saved.id = await db.entries.put(saved);
        return saved;
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);
export const deleteEntry = createAsyncThunk("entries/delete", async (id) => {
  const old = await db.entries.get(id);
  await db.entries.delete(id);
  return old;
});
// Undo restores the exact historical row while still enforcing interval consistency.
export const restoreEntry = createAsyncThunk(
  "entries/restore",
  async (entry, { rejectWithValue }) => {
    try {
      return await db.transaction("rw", db.entries, async () => {
        validateEntry(entry, await db.entries.toArray());
        await db.entries.put(entry);
        return entry;
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);
export const saveSettings = createAsyncThunk(
  "settings/save",
  async (patch, { rejectWithValue }) => {
    try {
      return await db.transaction("rw", db.settings, async () => {
        const old = (await db.settings.get("main")) || defaults;
        const value = validateSettings({
          ...defaults,
          ...old,
          ...patch,
          id: "main",
          notifications: {
            ...defaults.notifications,
            ...old.notifications,
            ...patch.notifications,
          },
        });
        await db.settings.put(value);
        return value;
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);
export const saveHoliday = createAsyncThunk(
  "holidays/save",
  async (h, { rejectWithValue }) => {
    try {
      parseISO(h.date);
      if (!h.title.trim()) throw new Error("عنوان مناسبت را وارد کنید.");
      const value = { date: h.date, title: h.title.trim() };
      return await db.transaction("rw", db.holidays, async () => {
        if (h.originalDate && h.originalDate !== h.date) {
          if (await db.holidays.get(h.date))
            throw new Error("برای تاریخ جدید، مناسبتی ثبت شده است.");
          await db.holidays.delete(h.originalDate);
        }
        await db.holidays.put(value);
        return { value, originalDate: h.originalDate };
      });
    } catch (e) {
      return rejectWithValue(e.message);
    }
  },
);
export const deleteHoliday = createAsyncThunk(
  "holidays/delete",
  async (date) => {
    await db.holidays.delete(date);
    return date;
  },
);
export const saveNote = createAsyncThunk("dayNotes/save", async (n) => {
  await db.dayNotes.put(n);
  return n;
});
export const clearAll = createAsyncThunk("data/clear", async () => {
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
    await db.settings.put({ ...defaults });
  });
  return readAll();
});
