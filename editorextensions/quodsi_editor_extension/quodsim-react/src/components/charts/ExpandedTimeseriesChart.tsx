import React, { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import { X, ArrowLeft } from "lucide-react";

interface ExpandedTimeseriesChartProps {
  data: any[];
  objectId: string;
  xKey: string;
  yKeys: string[];
  onClose: () => void;
  height?: number;
  showConfidenceInterval?: boolean;
}

// Color palette for lines
const COLORS: Record<string, string> = {
  mean: "#3b82f6", // blue
  min: "#10b981", // green
  max: "#f59e0b", // amber
  std: "#8b5cf6", // violet
};

/**
 * Full-detail chart shown when user clicks a sparkline.
 * Shows mean, min, max lines with optional confidence interval.
 */
const ExpandedTimeseriesChart: React.FC<ExpandedTimeseriesChartProps> = ({
  data,
  objectId,
  xKey,
  yKeys,
  onClose,
  height = 400,
  showConfidenceInterval = false,
}) => {
  // Sort data by x key
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[xKey];
      const bVal = b[xKey];
      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal - bVal;
      }
      return String(aVal).localeCompare(String(bVal));
    });
  }, [data, xKey]);

  // Compute confidence interval bounds if std is available
  const dataWithCI = useMemo(() => {
    if (!showConfidenceInterval) return sortedData;

    return sortedData.map((item) => {
      const mean = item.mean;
      const std = item.std ?? item.std_dev ?? 0;
      return {
        ...item,
        ci_lower: mean - std,
        ci_upper: mean + std,
      };
    });
  }, [sortedData, showConfidenceInterval]);

  // Get appropriate y-axis domain
  const yDomain = useMemo(() => {
    let minVal = Infinity;
    let maxVal = -Infinity;

    sortedData.forEach((item) => {
      yKeys.forEach((key) => {
        const val = item[key];
        if (typeof val === "number" && !isNaN(val)) {
          minVal = Math.min(minVal, val);
          maxVal = Math.max(maxVal, val);
        }
      });
    });

    // Add some padding
    const padding = (maxVal - minVal) * 0.1 || 1;
    return [Math.max(0, minVal - padding), maxVal + padding];
  }, [sortedData, yKeys]);

  return (
    <div className="expanded-chart border border-gray-200 rounded bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-800 transition-colors"
            title="Back to grid view"
          >
            <ArrowLeft className="w-3 h-3" />
            Back
          </button>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]" title={objectId}>
            {objectId}
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          title="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Chart */}
      <div className="p-3">
        <ResponsiveContainer width="100%" height={height}>
          {showConfidenceInterval ? (
            <ComposedChart
              data={dataWithCI}
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={xKey}
                label={{ value: "Time", position: "insideBottom", offset: -10 }}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={yDomain as [number, number]}
                label={{ value: "Value", angle: -90, position: "insideLeft" }}
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
              {/* Confidence interval as area */}
              <Area
                dataKey="ci_upper"
                stroke="none"
                fill="#3b82f6"
                fillOpacity={0.1}
                name="Upper CI"
              />
              <Area
                dataKey="ci_lower"
                stroke="none"
                fill="white"
                fillOpacity={1}
                name="Lower CI"
              />
              {/* Lines */}
              {yKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[key] || "#3b82f6"}
                  strokeWidth={key === "mean" ? 2 : 1.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name={key}
                  strokeDasharray={key !== "mean" ? "4 2" : undefined}
                />
              ))}
            </ComposedChart>
          ) : (
            <LineChart
              data={sortedData}
              margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey={xKey}
                label={{ value: "Time", position: "insideBottom", offset: -10 }}
                tick={{ fontSize: 11 }}
                stroke="#6b7280"
              />
              <YAxis
                domain={yDomain as [number, number]}
                label={{ value: "Value", angle: -90, position: "insideLeft" }}
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
                formatter={(value: number) => value?.toFixed(2)}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }}
                iconSize={12}
              />
              {yKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={COLORS[key] || "#3b82f6"}
                  strokeWidth={key === "mean" ? 2 : 1.5}
                  dot={false}
                  activeDot={{ r: 4 }}
                  name={key}
                  strokeDasharray={key !== "mean" ? "4 2" : undefined}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-400 text-center">
        Showing {sortedData.length} data points
      </div>
    </div>
  );
};

export default ExpandedTimeseriesChart;
