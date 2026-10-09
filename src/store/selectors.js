import { createSelector } from "@reduxjs/toolkit";
import { calculateDay, calculateRange } from "../lib/calc.js";
export const selectSettings = (s) => s.settings;
export const selectEntries = (s) => s.entries;
export const selectHolidays = (s) => s.holidays;
export const selectNotes = (s) => s.dayNotes;
export const selectEntriesByDate = createSelector([selectEntries], (entries) =>
  entries.reduce((map, e) => {
    (map[e.date] ??= []).push(e);
    return map;
  }, {}),
);
export const selectDay = (s, date, now) =>
  calculateDay(date, s.entries, s.settings, s.holidays, now);
export const selectRange = (s, range, now) =>
  calculateRange(range, s.entries, s.settings, s.holidays, now);

export const selectAppState = createSelector(
  [
    (s) => s.settings,
    (s) => s.entries,
    (s) => s.holidays,
    (s) => s.dayNotes,
    (s) => s.ui,
  ],
  (settings, entries, holidays, dayNotes, ui) => ({
    settings,
    entries,
    holidays,
    dayNotes,
    ui,
  }),
);
