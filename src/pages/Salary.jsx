import { NumericInput } from "../components/Common.jsx";
import { selectAppState } from "../store/index.js";
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import { Wallet } from "lucide-react";
import { Card, MonthNav, StatList, Field } from "../components/Common.jsx";
import { calculateSalary } from "../lib/salary.js";
import { money, duration } from "../lib/format.js";
import { localISO } from "../lib/time.js";
import { saveSettings } from "../store/index.js";
export default function Salary() {
  const state = useSelector(selectAppState),
    dispatch = useDispatch(),
    [month, setMonth] = useState(localISO()),
    [base, setBase] = useState(state.settings.monthlySalary),
    [hours, setHours] = useState(state.settings.dailyHours);
  const r = calculateSalary(
    month,
    state.entries,
    state.settings,
    state.holidays,
  );
  async function save(e) {
    e.preventDefault();
    try {
      await dispatch(
        saveSettings({
          monthlySalary: Number(base),
          dailyHours: Number(hours),
        }),
      ).unwrap();
      toast.success("تنظیمات حقوق ذخیره شد.");
    } catch (e) {
      toast.error(String(e));
    }
  }
  return (
    <div className="page">
      <h1>حقوق</h1>
      <Card>
        <MonthNav value={month} onChange={setMonth} />
      </Card>
      <Card className="salary-hero">
        <Wallet size={30} />
        <span>{r.isEstimate ? "حقوق تخمینی پایان ماه" : "حقوق نهایی ماه"}</span>
        <strong>{money(r.isEstimate ? r.forecast : r.earned)}</strong>
        <small>
          {r.isEstimate
            ? "تخمین بر پایه میانگین کارکرد روزهای کاری گذشته"
            : "بر پایه کارکرد ثبت‌شده"}
          ؛ نرخ اضافه‌کار عادی
        </small>
      </Card>
      {r.zeroRequired && (
        <Card className="warning">
          این ماه هیچ ساعت موظفی ندارد؛ نرخ ساعتی و حقوق کارکرد صفر محاسبه
          می‌شود.
        </Card>
      )}
      <Card>
        <h2>جزئیات محاسبه</h2>
        <StatList
          rows={[
            ["حقوق پایه", money(r.monthlySalary)],
            ["حقوق تا امروز", money(r.earned)],
            [
              "اضافه‌کار (+)",
              `${duration(r.overtimeMinutes)} · ${money(r.overtimeAmount)}`,
            ],
            [
              "کسر کار (−)",
              `${duration(r.deficitMinutes)} · ${money(r.deficitAmount)}`,
            ],
            ["نرخ ساعتی", money(r.hourlyRate)],
            ["ساعت موظف ماه", duration(r.requiredMinutes)],
            ["ساعت کارکرد", duration(r.workedMinutes)],
          ]}
        />
        <p className="info">
          حقوق کارکرد = ساعت کارکرد × نرخ ساعتی. کسر و اضافه‌کار در کارکرد واقعی
          لحاظ شده‌اند و دوباره از این مبلغ کم یا به آن اضافه نمی‌شوند.
        </p>
      </Card>
      <Card>
        <h2>ویرایش سریع ورودی‌ها</h2>
        <form className="form-stack" onSubmit={save}>
          <Field label="حقوق ماهانه (تومان)">
            <NumericInput
              type="number"
              min="0"
              step="1"
              inputMode="numeric"
              value={base}
              onChange={(e) => setBase(e.target.value)}
              required
            />
          </Field>
          <Field label="ساعت کاری روزانه">
            <NumericInput
              type="number"
              min="0.1"
              max="24"
              step="0.1"
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              required
            />
          </Field>
          <button className="button primary">ذخیره و محاسبه دوباره</button>
        </form>
      </Card>
    </div>
  );
}
