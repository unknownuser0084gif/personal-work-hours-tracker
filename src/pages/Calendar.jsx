import { selectAppState } from "../store/index.js";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { Plus, Save } from "lucide-react";
import { Card, MonthNav, RangeCaption, Empty } from "../components/Common.jsx";
import { CalendarGrid, DatePicker } from "../components/DatePicker.jsx";
import { EntryList } from "../components/EntryList.jsx";
import { localISO } from "../lib/time.js";
import { monthRange, dateLabel } from "../lib/jalali.js";
import { duration, toPersianDigits } from "../lib/format.js";
import { selectDay, selectRange, patchUI, saveNote } from "../store/index.js";
export default function Calendar() {
  const state = useSelector(selectAppState),
    dispatch = useDispatch(),
    [selected, setSelected] = useState(localISO()),
    [note, setNote] = useState(
      state.dayNotes.find((n) => n.date === localISO())?.note || "",
    ),
    [from, setFrom] = useState(monthRange(localISO()).from),
    [to, setTo] = useState(localISO());
  const month = state.ui.month;
  const day = selectDay(state, selected);
  const history =
    from <= to
      ? selectRange(state, { from, to }).days.filter((d) => d.entries.length)
      : [];
  function choose(date) {
    setSelected(date);
    setNote(state.dayNotes.find((n) => n.date === date)?.note || "");
  }
  function appearance(date) {
    const d = selectDay(state, date);
    return {
      className: d.incomplete
        ? "incomplete"
        : !d.isWorking
          ? "off"
          : d.missing
            ? "missing"
            : d.overtimeMinutes
              ? "overtime"
              : d.deficitMinutes
                ? "deficit"
                : "",
      text: d.totalMinutes
        ? duration(d.totalMinutes)
        : d.incomplete
          ? "ناقص"
          : "",
    };
  }
  async function save() {
    try {
      await dispatch(saveNote({ date: selected, note })).unwrap();
      toast.success("یادداشت ذخیره شد.");
    } catch {
      toast.error("ذخیره یادداشت انجام نشد.");
    }
  }
  return (
    <div className="page">
      <div className="section-head">
        <h1>تقویم و تاریخچه</h1>
        <button
          className="button secondary"
          onClick={() => {
            dispatch(patchUI({ month: localISO() }));
            choose(localISO());
          }}
        >
          امروز
        </button>
      </div>
      <Card>
        <MonthNav
          value={month}
          onChange={(date) => dispatch(patchUI({ month: date }))}
        />
        <CalendarGrid
          month={month}
          value={selected}
          onSelect={choose}
          renderDay={appearance}
        />
        <div className="legend">
          {[
            ["", "عادی"],
            ["off", "تعطیل"],
            ["incomplete", "ناقص"],
            ["missing", "بدون ثبت"],
            ["deficit", "کم‌کاری"],
            ["overtime", "اضافه‌کار"],
          ].map(([c, label]) => (
            <span key={label}>
              <i className={c} />
              {label}
            </span>
          ))}
        </div>
      </Card>
      <Card>
        <div className="section-head">
          <h2>{dateLabel(selected)}</h2>
          <button
            className="button secondary"
            disabled={selected > localISO()}
            onClick={() =>
              dispatch(
                patchUI({
                  manual: { date: selected, mode: day.open ? "exit" : "full" },
                }),
              )
            }
          >
            <Plus size={18} />
            افزودن
          </button>
        </div>
        <p className="muted">
          کارکرد {duration(day.totalMinutes)}{" "}
          {day.holidayTitle && ` · ${day.holidayTitle}`}
        </p>
        {day.incomplete && (
          <button
            className="button exit"
            onClick={() =>
              dispatch(patchUI({ manual: { date: selected, mode: "exit" } }))
            }
          >
            تکمیل خروج
          </button>
        )}
        <EntryList entries={day.entries} />
        <label className="field">
          <span>یادداشت روز</span>
          <textarea
            rows={3}
            placeholder="نکته‌ای درباره این روز…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        <button className="button secondary" onClick={save}>
          <Save size={17} />
          ذخیره یادداشت
        </button>
      </Card>
      <Card>
        <h2>تاریخچه بازه‌ها</h2>
        <div className="two-grid">
          <DatePicker label="از تاریخ" value={from} onChange={setFrom} />
          <DatePicker label="تا تاریخ" value={to} onChange={setTo} />
        </div>
        {from > to ? (
          <p className="error">شروع بازه باید قبل از پایان باشد.</p>
        ) : history.length ? (
          history.map((d) => (
            <div className="history-day" key={d.date}>
              <button
                className="text-link"
                onClick={() => {
                  choose(d.date);
                  dispatch(patchUI({ month: d.date }));
                }}
              >
                {dateLabel(d.date)} · {duration(d.totalMinutes)}
              </button>
              <EntryList entries={d.entries} />
            </div>
          ))
        ) : (
          <Empty
            text="در این بازه ثبتی نیست"
            detail="بازه زمانی را تغییر بده یا یک زمان ثبت کن."
          />
        )}
      </Card>
    </div>
  );
}
