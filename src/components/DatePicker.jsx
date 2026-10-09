import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Sheet, MonthNav } from "./Common.jsx";
import { monthRange, parts, weekdays, toJalali } from "../lib/jalali.js";
import { datesBetween, parseISO, localISO } from "../lib/time.js";
import { toPersianDigits } from "../lib/format.js";
export function CalendarGrid({ month, value, onSelect, renderDay, max }) {
  const range = monthRange(month);
  const dates = datesBetween(range.from, range.to);
  const blank = (parseISO(range.from).getDay() + 1) % 7;
  return (
    <div className="calendar-grid">
      <div className="calendar-weekdays">
        {weekdays.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="calendar-days">
        {Array.from({ length: blank }, (_, i) => (
          <span key={`b${i}`} />
        ))}
        {dates.map((date) => (
          <button
            type="button"
            key={date}
            disabled={max && date > max}
            className={`day-cell ${date === value ? "selected" : ""} ${date === localISO() ? "today" : ""} ${renderDay?.(date)?.className || ""}`}
            aria-label={toPersianDigits(toJalali(date))}
            aria-pressed={date === value}
            onClick={() => onSelect(date)}
          >
            <span>{toPersianDigits(parts(date).day)}</span>
            {renderDay && <small>{renderDay(date).text}</small>}
          </button>
        ))}
      </div>
    </div>
  );
}
export function DatePicker({ value, onChange, label = "تاریخ شمسی", max }) {
  const [open, setOpen] = useState(false),
    [month, setMonth] = useState(value);
  return (
    <div className="field">
      <span>{label}</span>
      <button
        type="button"
        className="date-input"
        onClick={() => {
          setMonth(value);
          setOpen(true);
        }}
      >
        <span dir="ltr">{toPersianDigits(toJalali(value))}</span>
        <CalendarDays size={19} />
      </button>
      {open && (
        <Sheet title="انتخاب تاریخ شمسی" onClose={() => setOpen(false)}>
          <MonthNav value={month} onChange={setMonth} />
          <CalendarGrid
            month={month}
            value={value}
            max={max}
            onSelect={(date) => {
              onChange(date);
              setOpen(false);
            }}
          />
          <button
            type="button"
            className="button secondary w-full mt-4"
            onClick={() => {
              onChange(localISO());
              setOpen(false);
            }}
          >
            امروز
          </button>
        </Sheet>
      )}
    </div>
  );
}
