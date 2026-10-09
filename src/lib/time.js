export function localISO(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseISO(date) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date || ""))
    throw new Error("تاریخ معتبر نیست.");
  const [y, m, d] = date.split("-").map(Number);
  const value = new Date(y, m - 1, d, 12);
  if (localISO(value) !== date) throw new Error("تاریخ معتبر نیست.");
  return value;
}
export function minutes(time) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time || ""))
    throw new Error("ساعت معتبر نیست.");
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}
export function timeOf(date = new Date()) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}
export function shiftDays(iso, amount) {
  const d = parseISO(iso);
  d.setDate(d.getDate() + amount);
  return localISO(d);
}
export function datesBetween(from, to) {
  const result = [];
  for (let d = from; d <= to; d = shiftDays(d, 1)) result.push(d);
  return result;
}
export function localTimestamp(date = new Date()) {
  const offset = -date.getTimezoneOffset();
  const sign = offset < 0 ? "-" : "+";
  const abs = Math.abs(offset);
  return `${localISO(date)}T${timeOf(date)}:${String(date.getSeconds()).padStart(2, "0")}${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}
