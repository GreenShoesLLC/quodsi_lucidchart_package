import React, { useState, useMemo } from "react";
import { Info, Eye, EyeOff } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface WeeklyWeightsEditorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

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
 * WeeklyWeightsEditor - Editor for 52 ISO week weights with bar chart preview
 */
const WeeklyWeightsEditor: React.FC<WeeklyWeightsEditorProps> = ({
  value,
  onChange,
  error,
}) => {
  const [showPreview, setShowPreview] = useState(false);

  // Transform weights to chart data
  const chartData = useMemo(() => {
    const weights = parseWeights(value);
    if (weights.length === 0) return [];

    return weights.map((weight, index) => ({
      week: `W${index + 1}`,
      weight,
    }));
  }, [value]);

  const hasValidData = chartData.length === 52;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1">
          <label className="text-sm font-medium text-gray-700">
            Weekly Weights (52 values)
          </label>
          <span title="Relative weights for ISO weeks 1-52. Leave empty for uniform distribution across all weeks.">
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

      {/* Text Input */}
      <textarea
        className={`w-full px-3 py-2 text-xs border rounded font-mono ${
          error ? "border-red-500" : "border-gray-300"
        }`}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter 52 comma-separated values (e.g., 1, 1, 1, ...) or leave empty for uniform"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}

      {/* Chart Preview */}
      {showPreview && (
        <div className="mt-2 p-2 bg-gray-50 border border-gray-200 rounded">
          {hasValidData ? (
            <ResponsiveContainer width="100%" height={150}>
              <BarChart
                data={chartData}
                margin={{ top: 5, right: 5, left: 0, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 8 }}
                  interval={3}
                  angle={-45}
                  textAnchor="end"
                  height={40}
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
                    fontSize: "11px",
                  }}
                  formatter={(val: number) => [val.toFixed(2), "Weight"]}
                />
                <Bar dataKey="weight" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[150px] flex items-center justify-center text-xs text-gray-500">
              {value.trim()
                ? `Invalid data: ${parseWeights(value).length} values (need 52)`
                : "Enter 52 weekly weights to see preview"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklyWeightsEditor;
