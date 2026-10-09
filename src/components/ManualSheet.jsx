import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Sheet, Field, ErrorText } from "./Common.jsx";
import { DatePicker } from "./DatePicker.jsx";
import { localISO, timeOf } from "../lib/time.js";
import { toPersianDigits } from "../lib/format.js";
import { saveEntry, patchUI } from "../store/index.js";
export function ManualSheet() {
  const dispatch = useDispatch(),
    config = useSelector((s) => s.ui.manual),
    settings = useSelector((s) => s.settings),
    entries = useSelector((s) => s.entries);
  const edit = config.entry;
  const [mode, setMode] = useState(edit ? "edit" : config.mode || "entry"),
    [date, setDate] = useState(edit?.date || config.date || localISO()),
    [time, setTime] = useState(edit?.in || timeOf()),
    [out, setOut] = useState(edit?.out || settings.defaultEnd),
    [isOpen, setIsOpen] = useState(edit?.out == null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const close = () => dispatch(patchUI({ manual: null }));
  const selected = entries.find(
    (e) =>
      e.date === date &&
      e.out == null &&
      (config.id == null || e.id === config.id),
  );
  const shortcut = (n) => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - n);
    setDate(localISO(d));
    setTime(timeOf(d));
  };
  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await dispatch(
        saveEntry(
          edit
            ? { entry: { ...edit, date, in: time, out: isOpen ? null : out } }
            : { manual: { mode, date, time, out, id: config.id } },
        ),
      ).unwrap();
      toast.success("زمان با موفقیت ثبت شد.");
      close();
    } catch (e) {
      setError(
        typeof e === "string"
          ? e
          : e.message || "ثبت انجام نشد. دوباره تلاش کنید.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Sheet title={edit ? "ویرایش بازه" : "ثبت با ساعت دلخواه"} onClose={close}>
      <form onSubmit={submit} className="form-stack">
        {!edit && (
          <div className="segments">
            {[
              ["entry", "ورود"],
              ["exit", "خروج"],
              ["full", "بازه کامل"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={mode === value ? "active" : ""}
                onClick={() => {
                  setMode(value);
                  setError("");
                }}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <DatePicker value={date} onChange={setDate} max={localISO()} />
        {mode === "exit" && (
          <p className="info">
            {selected
              ? `ورود این بازه: ${toPersianDigits(selected.in)}؛ همین بازه بسته می‌شود.`
              : "این روز بازه بازی ندارد."}
          </p>
        )}
        <Field label={mode === "exit" ? "ساعت خروج" : "ساعت ورود"}>
          <input
            type="time"
            dir="ltr"
            value={time}
            required
            onChange={(e) => setTime(e.target.value)}
          />
        </Field>
        {!edit && (
          <div className="shortcuts">
            {[5, 15, 30, 60].map((n) => (
              <button type="button" key={n} onClick={() => shortcut(n)}>
                {toPersianDigits(n === 60 ? "۱ ساعت" : `${n} دقیقه`)} پیش
              </button>
            ))}
            <button
              type="button"
              onClick={() =>
                setTime(
                  mode === "exit" ? settings.defaultEnd : settings.defaultStart,
                )
              }
            >
              ساعت پیش‌فرض {mode === "exit" ? "خروج" : "ورود"}
            </button>
          </div>
        )}
        {edit && (
          <label className="check-row">
            <input
              type="checkbox"
              checked={isOpen}
              onChange={(e) => setIsOpen(e.target.checked)}
            />
            بازه هنوز باز است
          </label>
        )}
        {(mode === "full" || (edit && !isOpen)) && (
          <Field label="ساعت خروج">
            <input
              dir="ltr"
              type="time"
              required
              value={out}
              onChange={(e) => setOut(e.target.value)}
            />
          </Field>
        )}
        <ErrorText error={error} />
        <button className="button primary w-full" disabled={busy}>
          {busy ? "در حال ثبت…" : "ثبت زمان"}
        </button>
      </form>
    </Sheet>
  );
}
