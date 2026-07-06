"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type CategoryPoint = {
  label: string;
  value: number;
};

export function CategoryBarChart({ data }: { data: CategoryPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
          <CartesianGrid stroke="#e7e9e9" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#657272", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            domain={[0, 100]}
            tickLine={false}
            tick={{ fill: "#657272", fontSize: 12 }}
            width={34}
          />
          <Tooltip
            cursor={{ fill: "rgba(35, 133, 68, 0.08)" }}
            contentStyle={{
              border: "1px solid #d2d6d6",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(29, 37, 37, 0.12)"
            }}
          />
          <Bar
            dataKey="value"
            fill="#238544"
            name="Rate"
            radius={[6, 6, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
