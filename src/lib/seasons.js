import { newDate } from "date-fns-jalali/newDate";
import { parts, monthRange } from "./jalali.js";
import { localISO } from "./time.js";
export const seasonNames = ["بهار", "تابستان", "پاییز", "زمستان"];
export const seasonSlugs = ["spring", "summer", "autumn", "winter"];
export function seasonRange(iso) {
  const p = parts(iso);
  const index = Math.floor((p.month - 1) / 3);
  return {
    from: localISO(newDate(p.year, index * 3, 1)),
    to: monthRange(localISO(newDate(p.year, index * 3 + 2, 1))).to,
    index,
    year: p.year,
  };
}
