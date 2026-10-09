import { useEffect, useRef } from "react";
import { X, ChevronRight, ChevronLeft, Clock } from "lucide-react";
import { monthLabel, moveMonth, monthRange, toJalali } from "../lib/jalali.js";
import { toPersianDigits, toEnglishDigits } from "../lib/format.js";
export function Card({ children, className = "" }) {
  return <section className={`card ${className}`}>{children}</section>;
}
export function Empty({
  text = "هنوز زمانی ثبت نکرده‌ای",
  detail = "با ثبت ورود، ساعت کار شما اینجا نمایش داده می‌شود.",
}) {
  return (
    <div className="empty">
      <Clock size={30} />
      <strong>{text}</strong>
      <p>{detail}</p>
    </div>
  );
}
export function Metric({ title, value, detail, tone = "" }) {
  return (
    <Card className={`metric ${tone}`}>
      <span className="muted">{title}</span>
      <strong className="metric-value">{value}</strong>
      {detail && <small>{detail}</small>}
    </Card>
  );
}
export function Progress({ value, max }) {
  const n = max ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(n)}
    >
      <span style={{ width: `${n}%` }} />
    </div>
  );
}
export function MonthNav({ value, onChange }) {
  return (
    <div className="month-nav">
      <button
        className="icon-button"
        aria-label="ماه قبل"
        onClick={() => onChange(moveMonth(monthRange(value).from, -1))}
      >
        <ChevronRight />
      </button>
      <h2>{monthLabel(value)}</h2>
      <button
        className="icon-button"
        aria-label="ماه بعد"
        onClick={() => onChange(moveMonth(monthRange(value).from, 1))}
      >
        <ChevronLeft />
      </button>
    </div>
  );
}
export function Sheet({ title, children, onClose }) {
  const ref = useRef();
  const previous = useRef(document.activeElement);
  useEffect(() => {
    const el = ref.current;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    el.focus();
    const key = (e) => {
      if (e.target.closest("[role=dialog]") !== el) return;
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const all = [
          ...el.querySelectorAll('button,input,select,textarea,[tabindex="0"]'),
        ].filter((n) => !n.disabled);
        if (!all.length) return;
        const first = all[0],
          last = all.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === el)
        ) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    el.addEventListener("keydown", key);
    return () => {
      el.removeEventListener("keydown", key);
      document.body.style.overflow = old;
      previous.current?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <section
        ref={ref}
        tabIndex={-1}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <header className="section-head">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="بستن"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        {children}
      </section>
    </div>
  );
}
export function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function StatList({ rows }) {
  return (
    <dl className="stat-list">
      {rows.map(([label, value], i) => (
        <div key={i}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function ErrorText({ error }) {
  return error ? (
    <p className="error" role="alert">
      {String(error)}
    </p>
  ) : null;
}
export function RangeCaption({ range }) {
  return (
    <span className="muted">
      {toPersianDigits(toJalali(range.from))} تا{" "}
      {toPersianDigits(toJalali(range.to))}
    </span>
  );
}

// Editable Persian digits; raw English decimal reaches form state, numbers are parsed on save.
export function NumericInput({ value, onChange, ...props }) {
  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={toPersianDigits(value ?? "")}
      pattern="[۰-۹0-9]+([.٫][۰-۹0-9]+)?"
      onChange={(event) => {
        const raw = toEnglishDigits(event.target.value).replace("٫", ".");
        if (/^\d*\.?\d*$/.test(raw)) onChange({ target: { value: raw } });
      }}
    />
  );
}
