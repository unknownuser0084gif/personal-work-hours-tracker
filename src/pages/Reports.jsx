import { selectAppState } from "../store/index.js";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { Download, ChevronRight, ChevronLeft } from "lucide-react";
import { Card, Metric, RangeCaption } from "../components/Common.jsx";
import { DatePicker } from "../components/DatePicker.jsx";
import { WorkChart } from "../components/WorkChart.jsx";
import { selectRange, patchUI } from "../store/index.js";
import { localISO, shiftDays } from "../lib/time.js";
import {
  monthRange,
  weekRange,
  moveMonth,
  toJalali,
  weekday,
} from "../lib/jalali.js";
import { seasonRange } from "../lib/seasons.js";
import { duration, number, toPersianDigits } from "../lib/format.js";
import { makeExport, downloadJSON, exportFilename } from "../lib/export.js";
export default function Reports() {
  const state = useSelector(selectAppState),
    dispatch = useDispatch(),
    [date, setDate] = useState(localISO());
  const filter = state.ui.filter;
  const range =
    filter === "daily"
      ? { from: date, to: date }
      : filter === "weekly"
        ? weekRange(date)
        : filter === "monthly"
          ? monthRange(date)
          : seasonRange(date);
  const report = selectRange(state, range),
    s = report.summary;
  function move(n) {
    setDate(
      filter === "daily"
        ? shiftDays(date, n)
        : filter === "weekly"
          ? shiftDays(date, n * 7)
          : moveMonth(range.from, n * (filter === "seasonal" ? 3 : 1)),
    );
  }
  function download() {
    try {
      downloadJSON(
        makeExport(
          filter,
          range,
          state.entries,
          state.settings,
          state.holidays,
          state.dayNotes,
        ),
        exportFilename(filter, range),
      );
      toast.success("فایل JSON آماده دانلود شد.");
    } catch {
      toast.error("ساخت فایل انجام نشد.");
    }
  }
  return (
    <div className="page">
      <h1>گزارش‌ها</h1>
      <Card>
        <div className="segments">
          {[
            ["daily", "روزانه"],
            ["weekly", "هفتگی"],
            ["monthly", "ماهانه"],
            ["seasonal", "فصلی"],
          ].map(([v, l]) => (
            <button
              key={v}
              className={filter === v ? "active" : ""}
              onClick={() => dispatch(patchUI({ filter: v }))}
            >
              {l}
            </button>
          ))}
        </div>
        <DatePicker
          label="تاریخ در بازه مورد نظر"
          value={date}
          onChange={setDate}
        />
        <div className="range-nav">
          <button
            className="icon-button"
            aria-label="بازه قبل"
            onClick={() => move(-1)}
          >
            <ChevronRight />
          </button>
          <RangeCaption range={range} />
          <button
            className="icon-button"
            aria-label="بازه بعد"
            onClick={() => move(1)}
          >
            <ChevronLeft />
          </button>
        </div>
        <button className="button primary w-full" onClick={download}>
          <Download size={19} />
          دانلود JSON
        </button>
      </Card>
      <div className="metrics-grid">
        {[
          ["جمع ساعت", duration(s.totalMinutes)],
          ["میانگین روزانه", duration(s.averageMinutes)],
          ["روز کاری", number(s.workingDays)],
          ["اضافه‌کار", duration(s.overtimeMinutes)],
          ["کسر کار", duration(s.deficitMinutes)],
          ["روز تأخیر", number(s.lateDays)],
          ["روز بدون ثبت", number(s.missingDays)],
        ].map(([t, v]) => (
          <Metric key={t} title={t} value={v} />
        ))}
      </div>
      <Card>
        <h2>نمودار کارکرد</h2>
        <WorkChart days={report.days} weekly={filter === "weekly"} />
      </Card>
      <Card>
        <h2>جزئیات روزبه‌روز</h2>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {[
                  "تاریخ",
                  "روز",
                  "کارکرد",
                  "موظف",
                  "اضافه",
                  "کسر",
                  "تأخیر",
                  "تعجیل",
                  "وضعیت",
                ].map((t) => (
                  <th key={t}>{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.days.map((d) => (
                <tr key={d.date}>
                  <td dir="ltr">{toPersianDigits(toJalali(d.date))}</td>
                  <td>{weekday(d.date)}</td>
                  <td>{duration(d.totalMinutes)}</td>
                  <td>{duration(d.requiredMinutes)}</td>
                  <td>{duration(d.overtimeMinutes)}</td>
                  <td>{duration(d.deficitMinutes)}</td>
                  <td>{duration(d.lateMinutes)}</td>
                  <td>{duration(d.earlyMinutes)}</td>
                  <td>
                    {d.incomplete
                      ? "ناقص"
                      : d.missing
                        ? "بدون ثبت"
                        : !d.isWorking
                          ? "تعطیل"
                          : d.date > localISO()
                            ? "آینده"
                            : "عادی"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
