import { NumericInput } from "../components/Common.jsx";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Clock, ArrowLeft, Check } from "lucide-react";
import toast from "react-hot-toast";
import { Card, Field, ErrorText } from "../components/Common.jsx";
import { NotificationPanel, InstallPanel } from "./Settings.jsx";
import { persistStorage } from "../lib/pwa.js";
import { saveSettings } from "../store/index.js";
import { toPersianDigits } from "../lib/format.js";
export default function Onboarding() {
  const settings = useSelector((s) => s.settings),
    dispatch = useDispatch(),
    navigate = useNavigate(),
    [step, setStep] = useState(0),
    [form, setForm] = useState(settings),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const titles = [
    "ساعت کاری و نهار",
    "حقوق ماهانه",
    "یادآوری‌ها",
    "نصب روی گوشی",
  ];
  async function finish() {
    setBusy(true);
    try {
      const persistent = await persistStorage();
      await dispatch(
        saveSettings({ onboardingDone: true, persistent }),
      ).unwrap();
      navigate("/");
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function next(e) {
    e.preventDefault();
    setBusy(true);
    try {
      if (step === 0)
        await dispatch(
          saveSettings({
            defaultStart: form.defaultStart,
            defaultEnd: form.defaultEnd,
            lunchStart: form.lunchStart,
            lunchEnd: form.lunchEnd,
            dailyHours: Number(form.dailyHours),
          }),
        ).unwrap();
      if (step === 1)
        await dispatch(
          saveSettings({ monthlySalary: Number(form.monthlySalary) }),
        ).unwrap();
      if (step < 3) setStep(step + 1);
      else await finish();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="onboarding page">
      <span className="brand-big">
        <Clock size={39} />
        ساعت کاری
      </span>
      <h1>زمانت را ساده ثبت کن</h1>
      <p className="muted">همه‌چیز روی دستگاه تو؛ بدون حساب کاربری.</p>
      <div className="step-dots">
        {titles.map((title, i) => (
          <span
            className={i <= step ? "active" : ""}
            key={title}
            aria-label={title}
          >
            {toPersianDigits(i + 1)}
          </span>
        ))}
      </div>
      <Card>
        <h2>{titles[step]}</h2>
        <form className="form-stack" onSubmit={next}>
          {step === 0 && (
            <>
              <div className="two-grid">
                {[
                  ["defaultStart", "ورود پیش‌فرض"],
                  ["defaultEnd", "خروج پیش‌فرض"],
                  ["lunchStart", "شروع نهار"],
                  ["lunchEnd", "پایان نهار"],
                ].map(([k, l]) => (
                  <Field label={l} key={k}>
                    <input
                      type="time"
                      dir="ltr"
                      value={form[k]}
                      required
                      onChange={(e) =>
                        setForm((f) => ({ ...f, [k]: e.target.value }))
                      }
                    />
                  </Field>
                ))}
              </div>
              <Field label="ساعت کاری روزانه">
                <NumericInput
                  type="number"
                  min="0.1"
                  max="24"
                  step="0.1"
                  value={form.dailyHours}
                  required
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dailyHours: e.target.value,
                    }))
                  }
                />
              </Field>
              <p className="info">
                نهار از ساعت کاری کم نمی‌شود. پیش‌فرض تعطیلی هفتگی: جمعه.
              </p>
            </>
          )}
          {step === 1 && (
            <Field label="حقوق ماهانه (تومان)">
              <NumericInput
                type="number"
                min="0"
                step="1"
                required
                value={form.monthlySalary}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    monthlySalary: e.target.value,
                  }))
                }
              />
            </Field>
          )}
          {step === 2 && <NotificationPanel />}
          {step === 3 && <InstallPanel />}
          <ErrorText error={error} />
          <button className="button primary w-full" disabled={busy}>
            {step === 3 ? <Check size={19} /> : <ArrowLeft size={19} />}{" "}
            {step === 3 ? "شروع ثبت زمان" : "مرحله بعد"}
          </button>
          {step > 0 && (
            <button
              type="button"
              className="button secondary"
              onClick={() => setStep(step - 1)}
            >
              مرحله قبل
            </button>
          )}
        </form>
      </Card>
      <button className="text-link" disabled={busy} onClick={finish}>
        رد کردن و استفاده از پیش‌فرض‌ها
      </button>
    </div>
  );
}
