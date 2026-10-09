import { createSlice } from "@reduxjs/toolkit";
import { defaults } from "../db/db.js";
import { localISO } from "../lib/time.js";
import {
  hydrate,
  saveEntry,
  deleteEntry,
  restoreEntry,
  saveSettings,
  saveHoliday,
  deleteHoliday,
  saveNote,
  clearAll,
} from "./thunks.js";
const settings = createSlice({
  name: "settings",
  initialState: { ...defaults },
  reducers: {},
  extraReducers: (b) =>
    b
      .addCase(hydrate.fulfilled, (_, a) => a.payload.settings)
      .addCase(saveSettings.fulfilled, (_, a) => a.payload)
      .addCase(clearAll.fulfilled, (_, a) => a.payload.settings),
});
const entries = createSlice({
  name: "entries",
  initialState: [],
  reducers: {},
  extraReducers: (b) => {
    b.addCase(hydrate.fulfilled, (_, a) => a.payload.entries)
      .addCase(clearAll.fulfilled, () => [])
      .addCase(deleteEntry.fulfilled, (s, a) =>
        s.filter((e) => e.id !== a.payload?.id),
      );
    for (const thunk of [saveEntry, restoreEntry])
      b.addCase(thunk.fulfilled, (s, a) => {
        const i = s.findIndex((e) => e.id === a.payload.id);
        if (i < 0) s.push(a.payload);
        else s[i] = a.payload;
      });
  },
});
const holidays = createSlice({
  name: "holidays",
  initialState: [],
  reducers: {},
  extraReducers: (b) =>
    b
      .addCase(hydrate.fulfilled, (_, a) => a.payload.holidays)
      .addCase(clearAll.fulfilled, () => [])
      .addCase(saveHoliday.fulfilled, (s, a) => {
        const { value, originalDate } = a.payload;
        if (originalDate && originalDate !== value.date) {
          const old = s.findIndex((h) => h.date === originalDate);
          if (old >= 0) s.splice(old, 1);
        }
        const i = s.findIndex((h) => h.date === value.date);
        if (i < 0) s.push(value);
        else s[i] = value;
      })
      .addCase(deleteHoliday.fulfilled, (s, a) =>
        s.filter((h) => h.date !== a.payload),
      ),
});
const dayNotes = createSlice({
  name: "dayNotes",
  initialState: [],
  reducers: {},
  extraReducers: (b) =>
    b
      .addCase(hydrate.fulfilled, (_, a) => a.payload.dayNotes)
      .addCase(clearAll.fulfilled, () => [])
      .addCase(saveNote.fulfilled, (s, a) => {
        const i = s.findIndex((n) => n.date === a.payload.date);
        if (i < 0) s.push(a.payload);
        else s[i] = a.payload;
      }),
});
const ui = createSlice({
  name: "ui",
  initialState: {
    status: "idle",
    error: null,
    manual: null,
    confirm: null,
    month: localISO(),
    filter: "monthly",
    missed: [],
    permission: "default",
    installAvailable: false,
    updateAvailable: false,
    offline: false,
    periodic: "unknown",
  },
  reducers: { patchUI: (s, a) => Object.assign(s, a.payload) },
  extraReducers: (b) =>
    b
      .addCase(hydrate.pending, (s) => {
        s.status = "loading";
        s.error = null;
      })
      .addCase(hydrate.fulfilled, (s) => {
        s.status = "ready";
      })
      .addCase(hydrate.rejected, (s, a) => {
        s.status = "error";
        s.error = a.error.message;
      })
      .addCase(clearAll.fulfilled, (s) => {
        s.manual = null;
        s.confirm = null;
        s.missed = [];
      }),
});
export const { patchUI } = ui.actions;
export const reducers = {
  settings: settings.reducer,
  entries: entries.reducer,
  holidays: holidays.reducer,
  dayNotes: dayNotes.reducer,
  ui: ui.reducer,
};
