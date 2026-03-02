import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { CHART_COLORS } from "./chartColors";

interface TimeseriesChartProps {
  data: any[];
  xKey: string;
  yKeys: string[];
  xLabel?: string;
  yLabel?: string;
  height?: number;
  colors?: string[];
}

/**
 * Line chart component for timeseries data
 */
const TimeseriesChart: React.FC<TimeseriesChartProps> = ({
  data,
  xKey,
  yKeys,
  xLabel = "Time",
  yLabel = "Value",
  height = 400,
  colors = CHART_COLORS,
}) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xKey}
          label={{ value: xLabel, position: "insideBottom", offset: -5 }}
          tick={{ fontSize: 11 }}
          stroke="#6b7280"
        />
        <YAxis
          label={{ value: yLabel, angle: -90, position: "insideLeft" }}
          tick={{ fontSize: 11 }}
          stroke="#6b7280"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "white",
            border: "1px solid #e5e7eb",
            borderRadius: "0.375rem",
            fontSize: "12px",
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
          iconSize={12}
        />
        {yKeys.map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
            name={key}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default TimeseriesChart;
