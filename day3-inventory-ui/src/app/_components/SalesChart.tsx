"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SalesChartPoint } from "@/lib/dashboard";

type Props = {
  data: SalesChartPoint[];
};

export default function SalesChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5).replace("-", "/"),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={formatted}
        margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
        <YAxis
          tickFormatter={(v: number) =>
            v === 0 ? "¥0" : `¥${(v / 1000).toFixed(0)}k`
          }
          tick={{ fontSize: 12 }}
          width={56}
        />
        <Tooltip
          formatter={(value) => [`¥${Number(value).toLocaleString()}`, "売上"]}
          labelFormatter={(label) => `${label}`}
        />
        <Bar
          dataKey="sales"
          fill="#3b82f6"
          radius={[4, 4, 0, 0]}
          maxBarSize={48}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
