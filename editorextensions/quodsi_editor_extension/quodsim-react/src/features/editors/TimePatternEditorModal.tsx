import React, { useState, useEffect } from "react";
import { TimePattern, Distribution, PeriodUnit, DistributionType, UniformParameters } from "@quodsi/shared";
import { X, Info, Upload, Download } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";

/**
 * Props for TimePatternEditorModal
 */
interface Props {
  /** The time pattern to edit (null for creating new) */
  pattern: TimePattern | null;
  /** Callback when user saves the pattern */
  onSave: (pattern: TimePattern) => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * TimePatternEditorModal - Modal dialog for creating/editing TimePattern objects
 *
 * Features:
 * - Name and ID fields
 * - Weekly weights (52 values for ISO weeks 1-52)
 * - Day-of-week weights (7 values for Monday-Sunday)
 * - Hourly weights (168 values: 7 days × 24 hours)
 * - Minute distribution (Duration object)
 * - CSV import/export for weight arrays
 * - Pattern templates (uniform, business hours, etc.)
 *
 * Weight Array Editing Strategy:
 * - Simple text input for now (comma-separated values)
 * - Future: Visual heat map editor for hourly weights
 * - Future: Interactive chart editors
 */
const TimePatternEditorModal: React.FC<Props> = ({
  pattern,
  onSave,
  onCancel,
}) => {
  const isEditMode = pattern !== null;

  // Local state for form fields
  const [name, setName] = useState(pattern?.name || "");
  const [weeklyWeightsStr, setWeeklyWeightsStr] = useState(
    pattern?.weeklyWeights?.join(", ") || ""
  );
  const [dayOfWeekWeightsStr, setDayOfWeekWeightsStr] = useState(
    pattern?.dayOfWeekWeights?.join(", ") || ""
  );
  const [hourlyWeightsStr, setHourlyWeightsStr] = useState(
    pattern?.dayOfWeekHourWeights?.join(", ") || ""
  );
  const [minutePeriodUnit, setMinutePeriodUnit] = useState<PeriodUnit>(
    pattern?.minuteDistribution?.durationPeriodUnit || PeriodUnit.MINUTES
  );
  const [minuteDistribution, setMinuteDistribution] = useState<Distribution>(
    pattern?.minuteDistribution?.distribution ||
    new Distribution(DistributionType.UNIFORM, { low: 0, high: 60 } as UniformParameters)
  );

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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
   * Validate form inputs
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate name
    if (!name.trim()) {
      newErrors.name = "Name is required";
    }

    // Validate weekly weights (optional, but if provided must be 52)
    const weeklyWeights = parseWeights(weeklyWeightsStr);
    if (weeklyWeightsStr.trim() && weeklyWeights.length !== 52) {
      newErrors.weeklyWeights = "Must contain exactly 52 values (one per ISO week)";
    }
    if (weeklyWeights.some((w) => w < 0)) {
      newErrors.weeklyWeights = "All weights must be non-negative";
    }

    // Validate day-of-week weights (optional, but if provided must be 7)
    const dayOfWeekWeights = parseWeights(dayOfWeekWeightsStr);
    if (dayOfWeekWeightsStr.trim() && dayOfWeekWeights.length !== 7) {
      newErrors.dayOfWeekWeights = "Must contain exactly 7 values (Monday-Sunday)";
    }
    if (dayOfWeekWeights.some((w) => w < 0)) {
      newErrors.dayOfWeekWeights = "All weights must be non-negative";
    }

    // Validate hourly weights (optional, but if provided must be 168)
    const hourlyWeights = parseWeights(hourlyWeightsStr);
    if (hourlyWeightsStr.trim() && hourlyWeights.length !== 168) {
      newErrors.hourlyWeights = "Must contain exactly 168 values (7 days × 24 hours)";
    }
    if (hourlyWeights.some((w) => w < 0)) {
      newErrors.hourlyWeights = "All weights must be non-negative";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle save button click
   */
  const handleSave = () => {
    if (!validateForm()) {
      return;
    }

    // Create or update TimePattern
    const savedPattern = new TimePattern(
      pattern?.id || `tp_${Date.now()}`,
      name.trim()
    );

    savedPattern.weeklyWeights = parseWeights(weeklyWeightsStr);
    savedPattern.dayOfWeekWeights = parseWeights(dayOfWeekWeightsStr);
    savedPattern.dayOfWeekHourWeights = parseWeights(hourlyWeightsStr);
    savedPattern.minuteDistribution.durationPeriodUnit = minutePeriodUnit;
    savedPattern.minuteDistribution.distribution = minuteDistribution;

    onSave(savedPattern);
  };

  /**
   * Apply a template pattern
   */
  const applyTemplate = (templateName: string) => {
    switch (templateName) {
      case "uniform":
        // All weights equal to 1
        setWeeklyWeightsStr(Array(52).fill(1).join(", "));
        setDayOfWeekWeightsStr(Array(7).fill(1).join(", "));
        setHourlyWeightsStr(Array(168).fill(1).join(", "));
        break;

      case "business_hours":
        // Monday-Friday: 1, Saturday-Sunday: 0
        setDayOfWeekWeightsStr("1, 1, 1, 1, 1, 0, 0");
        // Hours 9-17 (9am-5pm): 1, others: 0
        const businessHourly = [];
        for (let day = 0; day < 7; day++) {
          for (let hour = 0; hour < 24; hour++) {
            const isWeekday = day < 5; // Monday-Friday
            const isBusinessHour = hour >= 9 && hour < 17;
            businessHourly.push(isWeekday && isBusinessHour ? 1 : 0);
          }
        }
        setHourlyWeightsStr(businessHourly.join(", "));
        break;

      case "24_7":
        // All days and hours equal
        setDayOfWeekWeightsStr(Array(7).fill(1).join(", "));
        setHourlyWeightsStr(Array(168).fill(1).join(", "));
        break;
    }
  };

  /**
   * Export weights to CSV
   */
  const exportToCSV = (weights: string, filename: string) => {
    const blob = new Blob([weights.replace(/,\s*/g, ",")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditMode ? "Edit Time Pattern" : "Create Time Pattern"}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Name Field */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-sm font-medium text-gray-700">
                Pattern Name *
              </label>
              <span title="A descriptive name for this temporal pattern (e.g., 'Summer Weekday Pattern', 'Holiday Season')">
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <input
              type="text"
              className={`w-full px-3 py-2 text-sm border rounded ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter pattern name"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Templates */}
          <div className="bg-blue-50 p-3 rounded border border-blue-200">
            <div className="flex items-center gap-1 mb-2">
              <span className="text-sm font-medium text-gray-700">
                Quick Templates
              </span>
              <span title="Apply a common pattern template as a starting point">
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => applyTemplate("uniform")}
                className="px-3 py-1.5 text-xs bg-white border rounded hover:bg-gray-50"
              >
                Uniform
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("business_hours")}
                className="px-3 py-1.5 text-xs bg-white border rounded hover:bg-gray-50"
              >
                Business Hours
              </button>
              <button
                type="button"
                onClick={() => applyTemplate("24_7")}
                className="px-3 py-1.5 text-xs bg-white border rounded hover:bg-gray-50"
              >
                24/7
              </button>
            </div>
          </div>

          {/* Weekly Weights */}
          <div>
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
                onClick={() => exportToCSV(weeklyWeightsStr, "weekly_weights.csv")}
                disabled={!weeklyWeightsStr.trim()}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400 flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
            <textarea
              className={`w-full px-3 py-2 text-xs border rounded font-mono ${
                errors.weeklyWeights ? "border-red-500" : "border-gray-300"
              }`}
              rows={3}
              value={weeklyWeightsStr}
              onChange={(e) => setWeeklyWeightsStr(e.target.value)}
              placeholder="Enter 52 comma-separated values (e.g., 1, 1, 1, ...) or leave empty for uniform"
            />
            {errors.weeklyWeights && (
              <p className="text-xs text-red-500 mt-1">{errors.weeklyWeights}</p>
            )}
          </div>

          {/* Day of Week Weights */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Day-of-Week Weights (7 values)
                </label>
                <span title="Relative weights for Monday through Sunday (ISO: 1-7). Leave empty for uniform distribution across all days.">
                  <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>
              <button
                type="button"
                onClick={() => exportToCSV(dayOfWeekWeightsStr, "day_of_week_weights.csv")}
                disabled={!dayOfWeekWeightsStr.trim()}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400 flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
            <input
              type="text"
              className={`w-full px-3 py-2 text-xs border rounded font-mono ${
                errors.dayOfWeekWeights ? "border-red-500" : "border-gray-300"
              }`}
              value={dayOfWeekWeightsStr}
              onChange={(e) => setDayOfWeekWeightsStr(e.target.value)}
              placeholder="Enter 7 comma-separated values (Mon, Tue, Wed, Thu, Fri, Sat, Sun) or leave empty"
            />
            {errors.dayOfWeekWeights && (
              <p className="text-xs text-red-500 mt-1">{errors.dayOfWeekWeights}</p>
            )}
          </div>

          {/* Hourly Weights */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Hourly Weights (168 values)
                </label>
                <span title="Relative weights for each hour of the week (7 days × 24 hours = 168 values). Order: Mon 0-23, Tue 0-23, ..., Sun 0-23. Leave empty for uniform.">
                  <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>
              <button
                type="button"
                onClick={() => exportToCSV(hourlyWeightsStr, "hourly_weights.csv")}
                disabled={!hourlyWeightsStr.trim()}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400 flex items-center gap-1"
              >
                <Download className="w-3 h-3" />
                Export
              </button>
            </div>
            <textarea
              className={`w-full px-3 py-2 text-xs border rounded font-mono ${
                errors.hourlyWeights ? "border-red-500" : "border-gray-300"
              }`}
              rows={4}
              value={hourlyWeightsStr}
              onChange={(e) => setHourlyWeightsStr(e.target.value)}
              placeholder="Enter 168 comma-separated values or leave empty for uniform"
            />
            {errors.hourlyWeights && (
              <p className="text-xs text-red-500 mt-1">{errors.hourlyWeights}</p>
            )}
          </div>

          {/* Minute Distribution */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-sm font-medium text-gray-700">
                Minute Distribution
              </label>
              <span title="Distribution for arrival time within each hour (0-60 minutes). Defaults to Uniform(0, 60).">
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <EnhancedDurationEditor
              periodUnit={minutePeriodUnit}
              distribution={minuteDistribution}
              onChange={(periodUnit, distribution) => {
                setMinutePeriodUnit(periodUnit);
                setMinuteDistribution(distribution);
              }}
              compact={false}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {isEditMode ? "Save Changes" : "Create Pattern"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimePatternEditorModal;
