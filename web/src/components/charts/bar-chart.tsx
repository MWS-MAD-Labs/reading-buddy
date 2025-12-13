"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/cn";

interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  title?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border-4 border-purple-200 bg-white p-4 shadow-xl">
        <p className="text-sm font-black text-indigo-900">{label}</p>
        <p className="text-base font-black text-purple-600">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function BarChart({
  data,
  xKey,
  yKey,
  title,
  color = "#a855f7",
  height = 300,
  showGrid = true,
  showLegend = false,
  className,
}: BarChartProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && <h3 className="text-lg font-black text-indigo-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" />}
          <XAxis
            dataKey={xKey}
            stroke="#6366f1"
            style={{ fontSize: "12px", fontWeight: "bold" }}
          />
          <YAxis
            stroke="#6366f1"
            style={{ fontSize: "12px", fontWeight: "bold" }}
          />
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
          <Bar dataKey={yKey} fill={color} radius={[8, 8, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
