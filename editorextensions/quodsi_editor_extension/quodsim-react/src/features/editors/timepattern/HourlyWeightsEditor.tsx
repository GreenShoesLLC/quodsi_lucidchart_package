import React, { useState, useMemo, useEffect } from "react";
import { Info, Eye, EyeOff } from "lucide-react";
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

interface HourlyWeightsEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_COLORS = [
  "#3b82f6", // blue - Monday
  "#10b981", // green - Tuesday
  "#f59e0b", // amber - Wednesday
  "#ef4444", // red - Thursday
  "#8b5cf6", // violet - Friday
  "#ec4899", // pink - Saturday
  "#06b6d4", // cyan - Sunday
];

/**
 * Parse comma-separated string into number array
 */
const parseWeights = (str: string): number[] => {
  if (!str.trim()) return [];
  return str
    .split(",")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n));
};

/**
 * Split 168 values into 7 day strings (24 values each)
 */
const splitIntoDays = (value: string): string[] => {
  const weights = parseWeights(value);
  if (weights.length === 0) {
    return Array(7).fill("");
  }

  return DAY_NAMES.map((_, dayIndex) => {
    const start = dayIndex * 24;
    const dayWeights = weights.slice(start, start + 24);
    return dayWeights.length > 0 ? dayWeights.join(", ") : "";
  });
};

/**
 * Combine 7 day strings back into single value string
 */
const combineDays = (dayStrings: string[]): string => {
  const allValues: number[] = [];

  for (const dayStr of dayStrings) {
    const dayWeights = parseWeights(dayStr);
    // Pad with zeros if less than 24, or truncate if more
    for (let h = 0; h < 24; h++) {
      allValues.push(dayWeights[h] ?? 0);
    }
  }

  // Only return combined string if at least one day has values
  const hasAnyValues = dayStrings.some(s => s.trim());
  return hasAnyValues ? allValues.join(", ") : "";
};

/**
 * Transform 168 values into chart data (24 data points, each with 7 day values)
 */
const transformToChartData = (weights: number[]) => {
  if (weights.length !== 168) return [];

  const data = [];
  for (let hour = 0; hour < 24; hour++) {
    const dataPoint: Record<string, number | string> = { hour: `${hour}:00` };
    for (let day = 0; day < 7; day++) {
      const index = day * 24 + hour;
      dataPoint[DAY_NAMES[day]] = weights[index];
    }
    data.push(dataPoint);
  }
  return data;
};

/**
 * HourlyWeightsEditor - Editor for 168 hourly weights (7 days × 24 hours) with line chart preview
 *
 * Displays 7 separate inputs (one per day) for easier editing.
 */
const HourlyWeightsEditor: React.FC<HourlyWeightsEditorProps> = ({
  value,
  onChange,
  error,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  // Internal state: 7 day strings
  const [dayStrings, setDayStrings] = useState<string[]>(() => splitIntoDays(value));

  // Sync internal state when external value changes
  useEffect(() => {
    const newDayStrings = splitIntoDays(value);
    // Only update if the combined value is different (avoid infinite loop)
    const currentCombined = combineDays(dayStrings);
    if (value !== currentCombined) {
      setDayStrings(newDayStrings);
    }
  }, [value]);

  // Handle day input change
  const handleDayChange = (dayIndex: number, newValue: string) => {
    const newDayStrings = [...dayStrings];
    newDayStrings[dayIndex] = newValue;
    setDayStrings(newDayStrings);
    onChange(combineDays(newDayStrings));
  };

  // Validate each day's input
  const dayErrors = useMemo(() => {
    return dayStrings.map((dayStr) => {
      if (!dayStr.trim()) return null;
      const weights = parseWeights(dayStr);
      if (weights.length !== 24) {
        return `Need 24 values, got ${weights.length}`;
      }
      if (weights.some(w => w < 0)) {
        return "Values must be non-negative";
      }
      return null;
    });
  }, [dayStrings]);

  // Transform weights to chart data
  const { chartData, hasValidData, currentCount } = useMemo(() => {
    const weights = parseWeights(value);
    const data = transformToChartData(weights);
    return {
      chartData: data,
      hasValidData: data.length === 24,
      currentCount: weights.length,
    };
  }, [value]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <label className="text-sm font-medium text-gray-700">
            Hourly Weights (7 days × 24 hours)
          </label>
          <span title="Relative weights for each hour of the week. Enter 24 comma-separated values for each day (hours 0-23). Leave empty for uniform distribution.">
            <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
        >
          {showPreview ? (
            <EyeOff className="w-3 h-3" />
          ) : (
            <Eye className="w-3 h-3" />
          )}
          {showPreview ? "Hide" : "Preview"}
        </button>
      </div>

      {/* 7 Day Inputs */}
      <div className="space-y-2">
        {DAY_NAMES.map((dayName, dayIndex) => (
          <div key={dayName}>
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-medium w-12 flex-shrink-0"
                style={{ color: DAY_COLORS[dayIndex] }}
              >
                {DAY_FULL_NAMES[dayIndex]}
              </span>
              <input
                type="text"
                className={`flex-1 px-2 py-1 text-xs border rounded font-mono ${
                  dayErrors[dayIndex] ? "border-red-500" : "border-gray-300"
                }`}
                value={dayStrings[dayIndex]}
                onChange={(e) => handleDayChange(dayIndex, e.target.value)}
                placeholder="24 values (hours 0-23)"
              />
            </div>
            {dayErrors[dayIndex] && (
              <p className="text-xs text-red-500 mt-0.5 ml-14">{dayErrors[dayIndex]}</p>
            )}
          </div>
        ))}
      </div>

      {/* Overall error from parent */}
      {error && <p className="text-xs text-red-500 mt-2">{error}</p>}

      {/* Chart Preview */}
      {showPreview && (
        <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
          {hasValidData ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 5, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9 }}
                  interval={2}
                  stroke="#6b7280"
                />
                <YAxis
                  tick={{ fontSize: 9 }}
                  stroke="#6b7280"
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "0.375rem",
                    fontSize: "10px",
                  }}
                  formatter={(val: number) => val.toFixed(2)}
                />
                <Legend
                  wrapperStyle={{ fontSize: "9px", paddingTop: "2px" }}
                  iconSize={8}
                />
                {DAY_NAMES.map((day, index) => (
                  <Line
                    key={day}
                    type="monotone"
                    dataKey={day}
                    stroke={DAY_COLORS[index]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-xs text-gray-500">
              {value.trim()
                ? `Invalid data: ${currentCount} values (need 168)`
                : "Enter hourly weights for each day to see preview"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HourlyWeightsEditor;
