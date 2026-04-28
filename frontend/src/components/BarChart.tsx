import { memo } from "react";
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { TrendPoint } from "../types/api";

interface BarChartProps {
  metric: string;
  data: TrendPoint[];
  color?: string;
}

const COLORS = [
  "#f97316",
  "#fb923c",
  "#fdba74",
  "#fed7aa",
  "#ffedd5",
  "#fef3c7",
  "#fde68a",
  "#fcd34d",
  "#fbbf24",
];

const BarChart = memo(function BarChart({
  metric,
  data,
  color = "#f97316",
}: BarChartProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
      <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {metric}
      </h4>
      <ResponsiveContainer width="100%" height={220}>
        <RechartsBarChart
          data={data}
          margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#f3f4f6"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            interval={0}
            angle={data.length > 5 ? -30 : 0}
            textAnchor={data.length > 5 ? "end" : "middle"}
            height={data.length > 5 ? 48 : 24}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
              boxShadow: "0 1px 6px rgba(0,0,0,0.06)",
            }}
            labelStyle={{ color: "#374151", fontWeight: 600 }}
          />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length] ?? color} />
            ))}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
});

export default BarChart;
