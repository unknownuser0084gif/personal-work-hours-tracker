import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { weekday, toJalali } from "../lib/jalali.js";
import { number, duration, toPersianDigits } from "../lib/format.js";
export function WorkChart({ days, weekly = false }) {
  const data = days.map((d) => ({
    date: d.date,
    label: weekly
      ? weekday(d.date)
      : toPersianDigits(toJalali(d.date).slice(5)),
    hours: d.totalMinutes / 60,
  }));
  return (
    <div
      className="chart"
      dir="ltr"
      role="img"
      aria-label="نمودار ستونی ساعت کار"
    >
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="#e8edf1" />
          <XAxis
            dataKey="label"
            tick={{
              fontSize: 11,
              fill: "#526779",
              fontFamily: "Vazirmatn Variable",
            }}
            interval={weekly ? 0 : "preserveStartEnd"}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            width={32}
            tickFormatter={number}
            tick={{ fontSize: 11, fill: "#526779" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(value) => [duration(value * 60), "کارکرد"]}
            labelFormatter={(_, payload) =>
              payload[0]
                ? toPersianDigits(toJalali(payload[0].payload.date))
                : ""
            }
            contentStyle={{
              fontFamily: "Vazirmatn Variable",
              direction: "rtl",
              borderRadius: 12,
            }}
          />
          <Bar
            dataKey="hours"
            fill="#087f8c"
            radius={[5, 5, 0, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
