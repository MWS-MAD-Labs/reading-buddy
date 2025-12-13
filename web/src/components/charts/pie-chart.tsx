"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/cn";

interface PieChartProps {
  data: Array<{ name: string; value: number }>;
  title?: string;
  colors?: string[];
  height?: number;
  showLegend?: boolean;
  className?: string;
}

const DEFAULT_COLORS = [
  "#a855f7", // purple
  "#ec4899", // pink
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#f43f5e", // rose
];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border-4 border-purple-200 bg-white p-4 shadow-xl">
        <p className="text-sm font-black text-indigo-900">{payload[0].name}</p>
        <p className="text-base font-black text-purple-600">
          {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

export function PieChart({
  data,
  title,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  className,
}: PieChartProps) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && <h3 className="text-lg font-black text-indigo-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) =>
              `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
            }
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={colors[index % colors.length]}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          {showLegend && <Legend />}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
