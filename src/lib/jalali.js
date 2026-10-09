import { format } from "date-fns-jalali/format";
import { newDate } from "date-fns-jalali/newDate";
import { startOfMonth } from "date-fns-jalali/startOfMonth";
import { endOfMonth } from "date-fns-jalali/endOfMonth";
import { startOfWeek } from "date-fns-jalali/startOfWeek";
import { endOfWeek } from "date-fns-jalali/endOfWeek";
import { addMonths } from "date-fns-jalali/addMonths";
import { getMonth } from "date-fns-jalali/getMonth";
import { getYear } from "date-fns-jalali/getYear";
import { getDate } from "date-fns-jalali/getDate";
import { getDaysInMonth } from "date-fns-jalali/getDaysInMonth";
import { parseISO, localISO } from "./time.js";
import { toPersianDigits, toEnglishDigits } from "./format.js";
export const monthNames = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];
export const weekdays = [
  "شنبه",
  "یکشنبه",
  "دوشنبه",
  "سه‌شنبه",
  "چهارشنبه",
  "پنجشنبه",
  "جمعه",
];
export const weekday = (iso) => weekdays[(parseISO(iso).getDay() + 1) % 7];
export const toJalali = (iso) => format(parseISO(iso), "yyyy-MM-dd");
export function fromJalali(value) {
  const s = toEnglishDigits(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s))
    throw new Error("تاریخ شمسی را به صورت سال-ماه-روز وارد کنید.");
  const [y, m, d] = s.split("-").map(Number);
  const result = localISO(newDate(y, m - 1, d));
  if (toJalali(result) !== s) throw new Error("تاریخ شمسی معتبر نیست.");
  return result;
}
export function monthRange(iso) {
  const d = parseISO(iso);
  return { from: localISO(startOfMonth(d)), to: localISO(endOfMonth(d)) };
}
export function weekRange(iso) {
  const d = parseISO(iso);
  return {
    from: localISO(startOfWeek(d, { weekStartsOn: 6 })),
    to: localISO(endOfWeek(d, { weekStartsOn: 6 })),
  };
}
export const moveMonth = (iso, n) => localISO(addMonths(parseISO(iso), n));
export function parts(iso) {
  const d = parseISO(iso);
  return {
    year: getYear(d),
    month: getMonth(d) + 1,
    day: getDate(d),
    days: getDaysInMonth(d),
  };
}
export function monthLabel(iso) {
  const p = parts(iso);
  return `${monthNames[p.month - 1]} ${toPersianDigits(p.year)}`;
}
export function dateLabel(iso) {
  const p = parts(iso);
  return `${weekday(iso)}، ${toPersianDigits(p.day)} ${monthNames[p.month - 1]} ${toPersianDigits(p.year)}`;
}
