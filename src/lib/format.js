export const toPersianDigits = (value) =>
  String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
export const toEnglishDigits = (value) =>
  String(value)
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
export function duration(value = 0) {
  const total = Math.max(0, Math.floor(value));
  return toPersianDigits(
    `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`,
  );
}
export function rawDuration(value = 0) {
  return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`;
}
export const number = (value) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 2 }).format(value);
export const money = (value) => `${number(Math.round(value))} تومان`;
