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
import { CHART_COLORS } from "./chartColors";

interface ComparisonBarChartProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  colors?: string[];
  layout?: "horizontal" | "vertical";
  valueFormatter?: (value: number) => string;
}

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
  colors = CHART_COLORS,
  layout = "horizontal",
  valueFormatter,
}) => {
  // Custom label formatter for long names
  const formatLabel = (value: any) => {
    const str = String(value);
    if (str.length > 10) {
      return str.substring(0, 8) + "...";
    }
    return str;
  };

  // Compact margins for vertical (horizontal bars) layout
  const margins = layout === "vertical"
    ? { top: 5, right: 10, left: 5, bottom: 5 }
    : { top: 5, right: 30, left: 20, bottom: 60 };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        margin={margins}
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
              tickFormatter={valueFormatter ? (v: any) => (typeof v === "number" ? valueFormatter(v) : v) : undefined}
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tick={{ fontSize: 9 }}
              stroke="#6b7280"
              tickCount={4}
              tickFormatter={valueFormatter ? (v: any) => (typeof v === "number" ? valueFormatter(v) : v) : undefined}
            />
            <YAxis
              type="category"
              dataKey={xKey}
              tick={{ fontSize: 9 }}
              tickFormatter={formatLabel}
              stroke="#6b7280"
              width={60}
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
            fontSize: "11px",
          }}
          formatter={(value: any) => {
            if (typeof value === "number") {
              return valueFormatter ? valueFormatter(value) : value.toFixed(2);
            }
            return value;
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "10px", paddingTop: "5px" }}
          iconSize={8}
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
