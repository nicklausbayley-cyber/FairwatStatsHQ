"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type TrendPoint = {
  label: string;
  average: number;
  putts: number;
};

export function PerformanceTrendChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 0, right: 8, top: 12, bottom: 0 }}>
          <defs>
            <linearGradient id="scoreAverage" x1="0" x2="0" y1="0" y2="1">
              <stop offset="5%" stopColor="#238544" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#238544" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#e7e9e9" strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "#657272", fontSize: 12 }}
          />
          <YAxis
            axisLine={false}
            domain={[76, 90]}
            reversed
            tickLine={false}
            tick={{ fill: "#657272", fontSize: 12 }}
            width={34}
          />
          <Tooltip
            cursor={{ stroke: "#176b35", strokeWidth: 1 }}
            contentStyle={{
              border: "1px solid #d2d6d6",
              borderRadius: 8,
              boxShadow: "0 10px 30px rgba(29, 37, 37, 0.12)"
            }}
          />
          <Area
            type="monotone"
            dataKey="average"
            stroke="#176b35"
            strokeWidth={3}
            fill="url(#scoreAverage)"
            name="Scoring average"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
