import { localISO, timeOf, minutes, parseISO } from "./time.js";
export function validateEntry(candidate, entries, now = new Date()) {
  parseISO(candidate.date);
  const today = localISO(now);
  const clock = minutes(timeOf(now));
  const start = minutes(candidate.in);
  const end = candidate.out == null ? 1440 : minutes(candidate.out);
  if (
    candidate.date > today ||
    (candidate.date === today &&
      (start > clock || (candidate.out != null && end > clock)))
  )
    throw new Error("ثبت زمان در آینده مجاز نیست.");
  if (end <= start)
    throw new Error("ساعت خروج باید بعد از ساعت ورود و در همان روز باشد.");
  const others = entries.filter(
    (e) => e.date === candidate.date && e.id !== candidate.id,
  );
  if (candidate.out == null && others.some((e) => e.out == null))
    throw new Error("این روز یک بازه باز دارد؛ ابتدا خروج آن را تکمیل کنید.");
  if (
    others.some(
      (e) =>
        start < (e.out == null ? 1440 : minutes(e.out)) && end > minutes(e.in),
    )
  )
    throw new Error("این بازه با زمان دیگری در این روز هم‌پوشانی دارد.");
  return { ...candidate, out: candidate.out || null };
}
export function manualEntry(
  { mode, date, time, out, id },
  entries,
  now = new Date(),
) {
  if (mode === "exit") {
    const open = entries.find(
      (e) => e.date === date && e.out == null && (id == null || e.id === id),
    );
    if (!open)
      throw new Error("در این روز بازه بازی برای ثبت خروج وجود ندارد.");
    return validateEntry({ ...open, out: time }, entries, now);
  }
  return validateEntry(
    { date, in: time, out: mode === "full" ? out : null },
    entries,
    now,
  );
}
export function validateSettings(s) {
  if (minutes(s.defaultEnd) <= minutes(s.defaultStart))
    throw new Error("پایان کار باید بعد از شروع کار باشد.");
  if (minutes(s.lunchEnd) <= minutes(s.lunchStart))
    throw new Error("پایان نهار باید بعد از شروع نهار باشد.");
  if (!Number.isFinite(s.dailyHours) || s.dailyHours <= 0 || s.dailyHours > 24)
    throw new Error("ساعت کاری روزانه باید بیشتر از صفر و حداکثر ۲۴ باشد.");
  for (const key of ["monthlySalary", "graceMinutes", "openWarningMinutes"])
    if (!Number.isFinite(s[key]) || s[key] < 0)
      throw new Error("مبلغ و زمان‌های تنظیمات باید عدد غیرمنفی باشند.");
  return s;
}
