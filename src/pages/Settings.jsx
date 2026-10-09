import { NumericInput } from "../components/Common.jsx";
import { selectAppState } from "../store/index.js";
import { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Bell, Download, ShieldCheck, Pencil, Trash2 } from "lucide-react";
import { Card, Field, ErrorText } from "../components/Common.jsx";
import { DatePicker } from "../components/DatePicker.jsx";
import {
  saveSettings,
  saveHoliday,
  clearAll,
  patchUI,
} from "../store/index.js";
import {
  requestPermission,
  testNotification,
  registration,
  enablePeriodic,
} from "../lib/notifications.js";
import { installApp, persistStorage } from "../lib/pwa.js";
import { localISO } from "../lib/time.js";
import { toPersianDigits } from "../lib/format.js";
import { toJalali, weekdays } from "../lib/jalali.js";
import { reminderText } from "../lib/reminders.js";
const permissionLabels = {
  granted: "مجاز",
  denied: "مسدود",
  default: "هنوز درخواست نشده",
  unsupported: "پشتیبانی نمی‌شود",
};
export function NotificationPanel() {
  const ui = useSelector((s) => s.ui),
    settings = useSelector((s) => s.settings),
    dispatch = useDispatch();
  async function permission() {
    try {
      const result = await requestPermission();
      if (result === "granted")
        toast.success("مجوز یادآوری فعال شد؛ نوع یادآوری را انتخاب کن.");
      else toast("مجوز داده نشد.");
    } catch (e) {
      toast.error(e.message);
    }
  }
  async function toggle(key, value) {
    if (value && ui.permission !== "granted") {
      toast.error("ابتدا با دکمه، مجوز نوتیفیکیشن را فعال کن.");
      return;
    }
    try {
      await dispatch(
        saveSettings({ notifications: { [key]: value } }),
      ).unwrap();
      toast.success("تنظیم یادآوری ذخیره شد.");
    } catch (e) {
      toast.error(String(e));
    }
  }
  return (
    <div className="form-stack">
      <p>
        برای یادآوری ورود، خروج و نهار به مجوز نیاز داریم. وضعیت:{" "}
        <strong>{permissionLabels[ui.permission] || ui.permission}</strong>
      </p>
      <button type="button" className="button secondary" onClick={permission}>
        <Bell size={19} />
        درخواست مجوز نوتیفیکیشن
      </button>
      {ui.permission === "denied" && (
        <p className="warning">
          در Chrome، تنظیمات سایت ← اعلان‌ها را باز کن و اجازه را دستی فعال کن.
        </p>
      )}
      {Object.keys(reminderText).map((k) => (
        <label className="toggle-row" key={k}>
          <span>{reminderText[k][0]}</span>
          <input
            type="checkbox"
            role="switch"
            checked={settings.notifications[k]}
            onChange={(e) => toggle(k, e.target.checked)}
          />
        </label>
      ))}
      <button
        type="button"
        className="button secondary"
        onClick={async () => {
          try {
            await testNotification();
            toast.success("نوتیفیکیشن آزمایشی ارسال شد.");
          } catch (e) {
            toast.error(e.message);
          }
        }}
      >
        ارسال نوتیفیکیشن آزمایشی
      </button>
      <small>
        همگام‌سازی پس‌زمینه:{" "}
        {
          {
            registered: "ثبت شده؛ زمان‌بندی در اختیار مرورگر",
            denied: "مجوز یا شرایط لازم هنوز فراهم نیست",
            unsupported: "در این مرورگر پشتیبانی نمی‌شود",
            unknown: "هنوز بررسی نشده",
          }[ui.periodic]
        }
      </small>
      <button
        type="button"
        className="text-link"
        onClick={async () => {
          try {
            await enablePeriodic(await registration());
            toast("وضعیت پس‌زمینه بررسی شد.");
          } catch (e) {
            toast.error(e.message);
          }
        }}
      >
        بررسی دوباره قابلیت پس‌زمینه
      </button>
      <p className="info">
        زمان ارسال دقیق تضمین نمی‌شود. برنامه را از بهینه‌سازی باتری مستثنی کنید
        تا یادآوری‌ها مطمئن‌تر ارسال شوند. در برنامه بسته، ارسال وابسته به
        پشتیبانی و تصمیم Chrome است.
      </p>
    </div>
  );
}
export function InstallPanel() {
  const ui = useSelector((s) => s.ui);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return (
    <div className="form-stack">
      <p>
        {standalone
          ? "برنامه در حالت نصب‌شده باز است."
          : "برای دسترسی راحت‌تر و کار آفلاین، برنامه را روی گوشی نصب کن."}
      </p>
      <button
        type="button"
        className="button secondary"
        disabled={!ui.installAvailable}
        onClick={async () => {
          await installApp();
        }}
      >
        <Download size={18} />
        نصب برنامه
      </button>
      <small>
        در Chrome اندروید، منوی سه‌نقطه ← «نصب برنامه» یا «افزودن به صفحه اصلی».
        ابتدا یک بار با اینترنت برنامه را باز کن. نصب به HTTPS نیاز دارد.
      </small>
    </div>
  );
}
export default function Settings() {
  const state = useSelector(selectAppState),
    dispatch = useDispatch(),
    [form, setForm] = useState(state.settings),
    [error, setError] = useState(""),
    [holidayDate, setHolidayDate] = useState(localISO()),
    [title, setTitle] = useState(""),
    [originalDate, setOriginalDate] = useState(null),
    [clearText, setClearText] = useState(null);
  useEffect(() => {
    if (state.ui.clearRequested) {
      setClearText("");
      dispatch(patchUI({ clearRequested: false }));
    }
  }, [state.ui.clearRequested, dispatch]);
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      const patch = Object.fromEntries(
        [
          "defaultStart",
          "defaultEnd",
          "lunchStart",
          "lunchEnd",
          "weeklyOffDays",
          "holidaysAreOff",
        ].map((k) => [k, form[k]]),
      );
      for (const k of [
        "dailyHours",
        "graceMinutes",
        "monthlySalary",
        "openWarningMinutes",
      ])
        patch[k] = Number(form[k]);
      await dispatch(saveSettings(patch)).unwrap();
      toast.success("تنظیمات ذخیره شد.");
    } catch (e) {
      setError(String(e));
    }
  }
  async function holiday(e) {
    e.preventDefault();
    try {
      await dispatch(
        saveHoliday({ date: holidayDate, title, originalDate }),
      ).unwrap();
      toast.success("مناسبت ذخیره شد.");
      setTitle("");
      setOriginalDate(null);
    } catch (e) {
      toast.error(String(e));
    }
  }
  function firstClear() {
    dispatch(
      patchUI({
        confirm: {
          title: "پاک‌کردن کل داده‌ها؟",
          body: "ورود و خروج‌ها، حقوق، یادداشت‌ها و تنظیمات پاک می‌شوند. ابتدا JSON گزارش‌ها را نگه دار.",
          kind: "clearAll",
        },
      }),
    );
  }
  return (
    <div className="page">
      <h1>تنظیمات</h1>
      <Card>
        <h2>برنامه کاری و حقوق</h2>
        <form className="form-stack" onSubmit={save}>
          <div className="two-grid">
            {[
              ["defaultStart", "ورود پیش‌فرض"],
              ["defaultEnd", "خروج پیش‌فرض"],
              ["lunchStart", "شروع نهار"],
              ["lunchEnd", "پایان نهار"],
            ].map(([key, label]) => (
              <Field key={key} label={label}>
                <input
                  type="time"
                  dir="ltr"
                  value={form[key]}
                  onChange={(e) => set(key, e.target.value)}
                  required
                />
              </Field>
            ))}
          </div>
          {[
            ["dailyHours", "ساعت کاری روزانه", 0.1, 24, "0.1"],
            ["graceMinutes", "تلورانس تأخیر (دقیقه)", 0, 1440, "1"],
            ["monthlySalary", "حقوق ماهانه (تومان)", 0, undefined, "1"],
            [
              "openWarningMinutes",
              "هشدار بازه باز؛ دقیقه بعد از پایان کار",
              0,
              1440,
              "1",
            ],
          ].map(([key, label, min, max, step]) => (
            <Field key={key} label={label}>
              <NumericInput
                type="number"
                inputMode="decimal"
                min={min}
                max={max}
                step={step}
                value={form[key]}
                onChange={(e) => set(key, e.target.value)}
                required
              />
            </Field>
          ))}
          <fieldset>
            <legend>روزهای تعطیل هفتگی</legend>
            <div className="weekday-options">
              {weekdays.map((label, i) => {
                const day = (i + 6) % 7;
                return (
                  <label key={label}>
                    <input
                      type="checkbox"
                      checked={form.weeklyOffDays.includes(day)}
                      onChange={(e) =>
                        set(
                          "weeklyOffDays",
                          e.target.checked
                            ? [...form.weeklyOffDays, day]
                            : form.weeklyOffDays.filter((d) => d !== day),
                        )
                      }
                    />
                    {label}
                  </label>
                );
              })}
            </div>
          </fieldset>
          <label className="toggle-row">
            <span>مناسبت‌های دستی، روز غیرکاری باشند</span>
            <input
              type="checkbox"
              role="switch"
              checked={form.holidaysAreOff}
              onChange={(e) => set("holidaysAreOff", e.target.checked)}
            />
          </label>
          <small className="muted">نهار جزو کارکرد است و هیچ کسری ندارد.</small>
          <ErrorText error={error} />
          <button className="button primary">ذخیره تنظیمات</button>
        </form>
      </Card>
      <Card>
        <h2>تعطیلات و مناسبت‌های دستی</h2>
        <form className="form-stack" onSubmit={holiday}>
          <DatePicker value={holidayDate} onChange={setHolidayDate} />
          <Field label="عنوان مناسبت">
            <input
              value={title}
              required
              maxLength={150}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثلاً تعطیلی شخصی"
            />
          </Field>
          <button className="button secondary">ذخیره مناسبت</button>
        </form>
        <div className="holiday-list">
          {[...state.holidays]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((h) => (
              <div className="holiday-row" key={h.date}>
                <span>
                  <b>{h.title}</b>
                  <small>{toPersianDigits(toJalali(h.date))}</small>
                </span>
                <div className="flex">
                  <button
                    className="icon-button"
                    aria-label="ویرایش مناسبت"
                    onClick={() => {
                      setHolidayDate(h.date);
                      setTitle(h.title);
                      setOriginalDate(h.date);
                    }}
                  >
                    <Pencil size={18} />
                  </button>
                  <button
                    className="icon-button danger-text"
                    aria-label="حذف مناسبت"
                    onClick={() =>
                      dispatch(
                        patchUI({
                          confirm: {
                            title: "حذف مناسبت؟",
                            body: h.title,
                            kind: "deleteHoliday",
                            date: h.date,
                          },
                        }),
                      )
                    }
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          {!state.holidays.length && (
            <p className="muted mt-4">هنوز مناسبتی اضافه نکرده‌ای.</p>
          )}
        </div>
      </Card>
      <Card>
        <h2>یادآوری‌ها</h2>
        <NotificationPanel />
      </Card>
      <Card>
        <h2>نصب برنامه</h2>
        <InstallPanel />
      </Card>
      <Card>
        <h2>داده‌ها و نسخه</h2>
        <p>
          ذخیره‌سازی پایدار:{" "}
          <strong>
            {state.settings.persistent
              ? "درخواست پذیرفته شده"
              : "هنوز تضمین نشده"}
          </strong>
        </p>
        <button
          className="button secondary"
          onClick={async () => {
            const persistent = await persistStorage();
            await dispatch(saveSettings({ persistent }));
            toast(
              persistent
                ? "ذخیره‌سازی پایدار فعال شد."
                : "مرورگر درخواست را نپذیرفت؛ نسخه پشتیبان JSON نگه دار.",
            );
          }}
        >
          <ShieldCheck size={18} />
          درخواست ذخیره‌سازی پایدار
        </button>
        <p className="info">
          داده‌ها فقط روی همین مرورگر می‌مانند. پاک‌کردن اطلاعات مرورگر یا حذف
          داده‌های سایت آن‌ها را از بین می‌برد.
        </p>
        <Link className="text-link" to="/onboarding">
          اجرای دوباره راه‌اندازی اولیه
        </Link>
        <p className="muted">
          نسخه {toPersianDigits("1.0.0")} · برنامه آفلاین:{" "}
          {state.ui.offline
            ? "آماده"
            : "پس از بارگذاری نسخه ساخته‌شده آماده می‌شود"}
        </p>
        <button className="button danger" onClick={firstClear}>
          پاک‌کردن کل داده‌ها
        </button>
        {clearText !== null && (
          <div className="form-stack warning">
            <p>
              تأیید دوم: برای حذف غیرقابل بازگشت، عبارت «پاک کن» را وارد کن.
            </p>
            <input
              aria-label="تأیید دوم حذف"
              value={clearText}
              onChange={(e) => setClearText(e.target.value)}
            />
            <div className="two-grid">
              <button
                className="button danger"
                disabled={clearText !== "پاک کن"}
                onClick={async () => {
                  try {
                    await dispatch(clearAll()).unwrap();
                    setClearText(null);
                    toast.dismiss();
                    toast.success("تمام داده‌ها پاک شدند.");
                  } catch {
                    toast.error("پاک‌سازی انجام نشد.");
                  }
                }}
              >
                تأیید حذف همه داده‌ها
              </button>
              <button
                className="button secondary"
                onClick={() => setClearText(null)}
              >
                انصراف
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
