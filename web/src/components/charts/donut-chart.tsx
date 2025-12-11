"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/cn";

interface DonutChartProps {
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

export function DonutChart({
  data,
  title,
  colors = DEFAULT_COLORS,
  height = 300,
  showLegend = true,
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className={cn("space-y-4", className)}>
      {title && <h3 className="text-lg font-black text-indigo-900">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            innerRadius={50}
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
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-2xl font-black fill-indigo-900"
          >
            {total}
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
