import { selectAppState } from "../store/index.js";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Clock,
  LogIn,
  LogOut,
  Utensils,
  CalendarDays,
  BarChart3,
} from "lucide-react";
import { useNow } from "../hooks/useNow.js";
import { selectDay, selectRange, saveEntry, patchUI } from "../store/index.js";
import { localISO, timeOf, minutes } from "../lib/time.js";
import { weekRange, monthRange, dateLabel } from "../lib/jalali.js";
import { calculateSalary } from "../lib/salary.js";
import { duration, toPersianDigits, number, money } from "../lib/format.js";
import { Card, Metric, Progress, StatList } from "../components/Common.jsx";
import { EntryList } from "../components/EntryList.jsx";
import { WorkChart } from "../components/WorkChart.jsx";
export default function Dashboard() {
  const now = useNow(),
    today = localISO(now),
    dispatch = useDispatch(),
    state = useSelector(selectAppState),
    settings = state.settings;
  const day = selectDay(state, today, now),
    week = selectRange(state, weekRange(today), now),
    month = selectRange(state, monthRange(today), now);
  const salary = calculateSalary(
    today,
    state.entries,
    settings,
    state.holidays,
    now,
  );
  const clock = minutes(timeOf(now)),
    lunchStart = minutes(settings.lunchStart),
    lunchEnd = minutes(settings.lunchEnd);
  const worktime =
    day.isWorking &&
    clock >= minutes(settings.defaultStart) &&
    clock < minutes(settings.defaultEnd);
  const lunch =
    clock < lunchStart
      ? `${duration(lunchStart - clock)} تا نهار`
      : clock < lunchEnd
        ? "در حال نهار"
        : "نهار تمام شده";
  const incomplete = state.entries.filter((e) => e.date < today && !e.out);
  async function quick() {
    try {
      await dispatch(
        saveEntry({
          manual: {
            mode: day.open ? "exit" : "entry",
            date: today,
            time: timeOf(now),
          },
        }),
      ).unwrap();
      toast.success(day.open ? "خروج ثبت شد." : "ورود ثبت شد.");
    } catch (e) {
      toast.error(String(e));
    }
  }
  return (
    <div className="page dashboard">
      <h1>امروز، با خیال راحت</h1>
      <Card className="today-card">
        <span className={`status ${day.open ? "working" : ""}`}>
          <i />
          {day.open ? "در حال کار هستی" : "خارج از کار"}
        </span>
        <div className="live-clock" dir="ltr" aria-label="ساعت زنده">
          {toPersianDigits(now.toLocaleTimeString("en-GB", { hour12: false }))}
        </div>
        <p className="muted">کارکرد امروز</p>
        <div className="today-total" dir="ltr">
          {duration(day.totalMinutes)}
        </div>
        <Progress value={day.totalMinutes} max={settings.dailyHours * 60} />
        <div className="progress-label">
          <span>هدف روزانه: {number(settings.dailyHours)} ساعت</span>
          <span>
            {number(
              Math.min(
                100,
                (day.totalMinutes / (settings.dailyHours * 60)) * 100,
              ),
            )}
            ٪
          </span>
        </div>
        <div className="quick-actions">
          <button
            className={`button ${day.open ? "exit" : "entry"}`}
            onClick={quick}
          >
            {day.open ? <LogOut size={20} /> : <LogIn size={20} />}ثبت{" "}
            {day.open ? "خروج" : "ورود"} الان
          </button>
          <button
            className="button secondary"
            onClick={() =>
              dispatch(
                patchUI({
                  manual: { date: today, mode: day.open ? "exit" : "entry" },
                }),
              )
            }
          >
            <Clock size={19} />
            ثبت با ساعت دلخواه
          </button>
        </div>
        <p className="worktime">
          {worktime ? "الان در تایم کاری هستی" : "الان در تایم کاری نیستی"} ·{" "}
          {day.isWorking
            ? "امروز روز کاری است"
            : `امروز تعطیل است${day.holidayTitle ? `؛ ${day.holidayTitle}` : ""}`}
          {day.isWorking && day.holidayTitle ? ` · ${day.holidayTitle}` : ""}
        </p>
      </Card>
      <Card className="lunch-card">
        <div className="flex items-center gap-3">
          <span className="round-icon">
            <Utensils size={23} />
          </span>
          <div>
            <h2>نهار</h2>
            <small>
              {toPersianDigits(settings.lunchStart)} تا{" "}
              {toPersianDigits(settings.lunchEnd)}
            </small>
          </div>
        </div>
        <span className="lunch-state">{lunch}</span>
      </Card>
      <div className="two-grid">
        {[
          ["این هفته", week.summary],
          ["این ماه", month.summary],
        ].map(([title, s]) => (
          <Card key={title} className="summary-card">
            <div className="section-head">
              <h2>{title}</h2>
              <CalendarDays size={21} />
            </div>
            <strong className="summary-total" dir="ltr">
              {duration(s.totalMinutes)}
            </strong>
            <p>از {duration(s.requiredMinutes)} ساعت</p>
            <Progress value={s.totalMinutes} max={s.requiredMinutes} />
            <small>
              {duration(Math.max(0, s.requiredMinutes - s.totalMinutes))} ساعت
              باقی مانده
            </small>
            <div className="small-stats">
              اضافه‌کار {duration(s.overtimeMinutes)} · کسر{" "}
              {duration(s.deficitMinutes)}
            </div>
          </Card>
        ))}
      </div>
      {incomplete.length > 0 && (
        <Card className="warning">
          <h2>بازه‌های ناقص روزهای قبل</h2>
          <p>تا تکمیل خروج، بازه بازِ روز گذشته صفر دقیقه محاسبه می‌شود.</p>
          {incomplete.map((e) => (
            <button
              key={e.id}
              className="button secondary"
              onClick={() =>
                dispatch(
                  patchUI({ manual: { date: e.date, mode: "exit", id: e.id } }),
                )
              }
            >
              تکمیل خروج · {dateLabel(e.date)}
            </button>
          ))}
        </Card>
      )}
      <Card>
        <div className="section-head">
          <h2>ورود و خروج‌های امروز</h2>
          <LogIn size={21} />
        </div>
        <EntryList entries={day.entries} />
      </Card>
      <Card>
        <h2>برنامه امروز</h2>
        <StatList
          rows={[
            [
              "ورود / خروج پیش‌فرض",
              `${toPersianDigits(settings.defaultStart)} تا ${toPersianDigits(settings.defaultEnd)}`,
            ],
            ["تأخیر ورود", duration(day.lateMinutes)],
            ["تعجیل خروج", duration(day.earlyMinutes)],
            [
              "تا پایان وقت کاری",
              clock < minutes(settings.defaultEnd)
                ? duration(minutes(settings.defaultEnd) - clock)
                : "وقت کاری تمام شده",
            ],
          ]}
        />
        <small className="muted">نهار جزو ساعت کاری است و کسری ندارد.</small>
      </Card>
      <Card>
        <div className="section-head">
          <h2>کارکرد این هفته</h2>
          <BarChart3 size={23} />
        </div>
        <WorkChart days={week.days} weekly />
      </Card>
      <Card className="salary-mini">
        <span>حقوق تخمینی ماه جاری</span>
        <strong>{money(salary.forecast)}</strong>
        <small>تخمین بر پایه روزهای کاری گذشته</small>
        <Link to="/salary" className="text-link">
          جزئیات حقوق
        </Link>
      </Card>
      <div className="quick-links">
        <Link to="/calendar">تقویم و تاریخچه</Link>
        <Link to="/reports">گزارش‌ها</Link>
      </div>
    </div>
  );
}
