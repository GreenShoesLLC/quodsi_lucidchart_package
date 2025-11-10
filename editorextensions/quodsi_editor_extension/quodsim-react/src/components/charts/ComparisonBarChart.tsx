import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ComparisonBarChartProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  colors?: string[];
  layout?: "horizontal" | "vertical";
}

// Default color palette
const DEFAULT_COLORS = [
  "#3b82f6", // blue
  "#10b981", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#06b6d4", // cyan
  "#f97316", // orange
];

/**
 * Bar chart component for comparing values across categories
 */
const ComparisonBarChart: React.FC<ComparisonBarChartProps> = ({
  data,
  xKey,
  yKeys,
  xLabel = "",
  yLabel = "Value",
  height = 400,
  colors = DEFAULT_COLORS,
  layout = "horizontal",
}) => {
  // Custom label formatter for long names
  const formatLabel = (value: any) => {
    const str = String(value);
    if (str.length > 15) {
      return str.substring(0, 12) + "...";
    }
    return str;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        layout={layout}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {layout === "horizontal" ? (
          <>
            <XAxis
              dataKey={xKey}
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 10 }}
              tickFormatter={formatLabel}
              stroke="#6b7280"
            />
            <YAxis
              label={{ value: yLabel, angle: -90, position: "insideLeft" }}
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              label={{ value: xLabel, position: "insideBottom", offset: -5 }}
              tick={{ fontSize: 11 }}
              stroke="#6b7280"
            />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ fontSize: 10 }}
              tickFormatter={formatLabel}
              stroke="#6b7280"
              width={100}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
            fontSize: "12px",
          }}
          formatter={(value: any) => {
            if (typeof value === "number") {
              return value.toFixed(2);
            }
            return value;
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
          iconSize={12}
        />
        {yKeys.map((key, index) => (
          <Bar
            key={key}
            dataKey={key}
            fill={colors[index % colors.length]}
            name={key}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default ComparisonBarChart;
