import { it, expect } from "vitest";
import { validateEntry, manualEntry } from "../src/lib/validation";
const date = "2026-10-10",
  now = new Date(2026, 9, 10, 14),
  open = { id: 1, date, in: "08:00", out: null };
it("خروج گذشته همان بازه را می‌بندد", () =>
  expect(
    manualEntry({ mode: "exit", date, time: "12:00" }, [open], now),
  ).toEqual({ ...open, out: "12:00" }));
it("ورود گذشته و بازه کامل", () => {
  expect(
    manualEntry({ mode: "entry", date, time: "09:00" }, [], now).out,
  ).toBeNull();
  expect(
    manualEntry({ mode: "full", date, time: "08:00", out: "12:00" }, [], now)
      .out,
  ).toBe("12:00");
});
it("آینده، خروج قبل ورود و نیمه شب ممنوع", () => {
  expect(() =>
    validateEntry({ date, in: "15:00", out: null }, [], now),
  ).toThrow("آینده");
  expect(() =>
    validateEntry({ date, in: "08:00", out: "07:00" }, [], now),
  ).toThrow("بعد");
  expect(() =>
    validateEntry({ date: "2026-10-11", in: "08:00", out: null }, [], now),
  ).toThrow("آینده");
  expect(() =>
    manualEntry({ mode: "exit", date, time: "07:00" }, [open], now),
  ).toThrow();
});
it("هم‌پوشانی و بازه باز دوم رد، مرز چسبیده قبول", () => {
  const closed = { ...open, out: "12:00" };
  expect(() =>
    validateEntry({ date, in: "11:00", out: "13:00" }, [closed], now),
  ).toThrow("هم‌پوشانی");
  expect(() =>
    validateEntry({ date, in: "10:00", out: null }, [open], now),
  ).toThrow("بازه باز");
  expect(
    validateEntry({ date, in: "12:00", out: "13:00" }, [closed], now).in,
  ).toBe("12:00");
});
it("ویرایش خودش هم‌پوشانی محسوب نمی‌شود، خروج بدون بازه باز خطا", () => {
  expect(validateEntry({ ...open, out: "13:00" }, [open], now).out).toBe(
    "13:00",
  );
  expect(() =>
    manualEntry({ mode: "exit", date, time: "13:00" }, [], now),
  ).toThrow("وجود ندارد");
});
