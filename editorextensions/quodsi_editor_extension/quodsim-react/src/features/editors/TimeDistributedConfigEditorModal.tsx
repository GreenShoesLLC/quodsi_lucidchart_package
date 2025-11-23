import React, { useState } from "react";
import { TimeDistributedConfig, TimePattern, VolumePeriodBasis } from "@quodsi/shared";
import { X, Info } from "lucide-react";

/**
 * Props for TimeDistributedConfigEditorModal
 */
interface Props {
  /** The config to edit (null for creating new) */
  config: TimeDistributedConfig | null;
  /** Available time patterns to choose from */
  availablePatterns: TimePattern[];
  /** Callback when user saves the config */
  onSave: (config: TimeDistributedConfig) => void;
  /** Callback when user cancels */
  onCancel: () => void;
}

/**
 * TimeDistributedConfigEditorModal - Modal dialog for creating/editing TimeDistributedConfig objects
 *
 * Features:
 * - Name field
 * - Time pattern selection (dropdown)
 * - Total volume (number input)
 * - Volume period basis (dropdown: TOTAL, ANNUAL, WEEKLY, DAILY)
 * - Start date (ISO 8601: YYYY-MM-DD)
 * - End date (ISO 8601: YYYY-MM-DD)
 * - Validation for all required fields
 * - Date range validation (end > start)
 */
const TimeDistributedConfigEditorModal: React.FC<Props> = ({
  config,
  availablePatterns,
  onSave,
  onCancel,
}) => {
  const isEditMode = config !== null;

  // Local state for form fields
  const [name, setName] = useState(config?.name || "");
  const [timePatternId, setTimePatternId] = useState(config?.timePatternId || "");
  const [totalVolume, setTotalVolume] = useState(config?.totalVolume.toString() || "0");
  const [volumePeriodBasis, setVolumePeriodBasis] = useState<VolumePeriodBasis>(
    config?.volumePeriodBasis || VolumePeriodBasis.TOTAL
  );
  const [startDate, setStartDate] = useState(config?.startDate || "");
  const [endDate, setEndDate] = useState(config?.endDate || "");

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate ISO 8601 date format (YYYY-MM-DD)
   */
  const isValidISODate = (dateStr: string): boolean => {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) {
      return false;
    }
    const date = new Date(dateStr);
    return date instanceof Date && !isNaN(date.getTime());
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

    // Validate time pattern selection
    if (!timePatternId) {
      newErrors.timePatternId = "Time pattern is required";
    }

    // Validate total volume
    const volume = parseFloat(totalVolume);
    if (isNaN(volume) || volume < 0) {
      newErrors.totalVolume = "Total volume must be a non-negative number";
    }

    // Validate start date
    if (!startDate || !isValidISODate(startDate)) {
      newErrors.startDate = "Start date must be in YYYY-MM-DD format";
    }

    // Validate end date
    if (!endDate || !isValidISODate(endDate)) {
      newErrors.endDate = "End date must be in YYYY-MM-DD format";
    }

    // Validate date range (end > start)
    if (startDate && endDate && isValidISODate(startDate) && isValidISODate(endDate)) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end <= start) {
        newErrors.endDate = "End date must be after start date";
      }
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

    // Create or update TimeDistributedConfig
    const savedConfig = new TimeDistributedConfig(
      config?.id || `tdc_${Date.now()}`,
      name.trim()
    );

    savedConfig.timePatternId = timePatternId;
    savedConfig.totalVolume = parseFloat(totalVolume);
    savedConfig.volumePeriodBasis = volumePeriodBasis;
    savedConfig.startDate = startDate;
    savedConfig.endDate = endDate;

    onSave(savedConfig);
  };

  /**
   * Get tooltip text for volume period basis
   */
  const getVolumePeriodBasisTooltip = (basis: VolumePeriodBasis): string => {
    switch (basis) {
      case VolumePeriodBasis.TOTAL:
        return "Total volume across entire date range (divided by years in the pattern)";
      case VolumePeriodBasis.ANNUAL:
        return "Volume per year (used directly for annual rate calculation)";
      case VolumePeriodBasis.WEEKLY:
        return "Volume per week (skips weekly pattern layer)";
      case VolumePeriodBasis.DAILY:
        return "Volume per day (skips weekly and day-of-week pattern layers)";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEditMode ? "Edit Distribution Configuration" : "Create Distribution Configuration"}
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
                Configuration Name *
              </label>
              <span title="A descriptive name for this distribution configuration (e.g., 'Q4 2024 Customer Arrivals')">
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
              placeholder="Enter configuration name"
            />
            {errors.name && (
              <p className="text-xs text-red-500 mt-1">{errors.name}</p>
            )}
          </div>

          {/* Time Pattern Selection */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-sm font-medium text-gray-700">
                Time Pattern *
              </label>
              <span title="Select the temporal pattern that defines how entities are distributed across time">
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <select
              className={`w-full px-3 py-2 text-sm border rounded bg-white ${
                errors.timePatternId ? "border-red-500" : "border-gray-300"
              }`}
              value={timePatternId}
              onChange={(e) => setTimePatternId(e.target.value)}
            >
              <option value="">-- Select a time pattern --</option>
              {availablePatterns.map((pattern) => (
                <option key={pattern.id} value={pattern.id}>
                  {pattern.name}
                </option>
              ))}
            </select>
            {errors.timePatternId && (
              <p className="text-xs text-red-500 mt-1">{errors.timePatternId}</p>
            )}
            {availablePatterns.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">
                No time patterns available. Create a time pattern first.
              </p>
            )}
          </div>

          {/* Total Volume */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-sm font-medium text-gray-700">
                Total Volume *
              </label>
              <span title="The total number of entities to generate. Interpretation depends on Volume Period Basis.">
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <input
              type="number"
              className={`w-full px-3 py-2 text-sm border rounded ${
                errors.totalVolume ? "border-red-500" : "border-gray-300"
              }`}
              value={totalVolume}
              onChange={(e) => setTotalVolume(e.target.value)}
              placeholder="Enter total volume"
              min="0"
              step="1"
            />
            {errors.totalVolume && (
              <p className="text-xs text-red-500 mt-1">{errors.totalVolume}</p>
            )}
          </div>

          {/* Volume Period Basis */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <label className="text-sm font-medium text-gray-700">
                Volume Period Basis *
              </label>
              <span title="Defines how the total volume is interpreted (per year, per week, per day, or total across entire range)">
                <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <select
              className="w-full px-3 py-2 text-sm border rounded bg-white border-gray-300"
              value={volumePeriodBasis}
              onChange={(e) => setVolumePeriodBasis(e.target.value as VolumePeriodBasis)}
            >
              <option value={VolumePeriodBasis.TOTAL}>
                Total (across entire date range)
              </option>
              <option value={VolumePeriodBasis.ANNUAL}>
                Annual (per year)
              </option>
              <option value={VolumePeriodBasis.WEEKLY}>
                Weekly (per week)
              </option>
              <option value={VolumePeriodBasis.DAILY}>
                Daily (per day)
              </option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {getVolumePeriodBasisTooltip(volumePeriodBasis)}
            </p>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-gray-700">
                  Start Date *
                </label>
                <span title="First date of the simulation period (ISO 8601: YYYY-MM-DD)">
                  <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>
              <input
                type="date"
                className={`w-full px-3 py-2 text-sm border rounded ${
                  errors.startDate ? "border-red-500" : "border-gray-300"
                }`}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
              {errors.startDate && (
                <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>
              )}
            </div>

            {/* End Date */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-sm font-medium text-gray-700">
                  End Date *
                </label>
                <span title="Last date of the simulation period (must be after start date)">
                  <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>
              <input
                type="date"
                className={`w-full px-3 py-2 text-sm border rounded ${
                  errors.endDate ? "border-red-500" : "border-gray-300"
                }`}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
              {errors.endDate && (
                <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Summary Box */}
          {startDate && endDate && isValidISODate(startDate) && isValidISODate(endDate) && (
            <div className="bg-blue-50 p-3 rounded border border-blue-200">
              <div className="text-xs font-medium text-gray-700 mb-1">Summary</div>
              <div className="text-xs text-gray-600 space-y-1">
                <div>
                  Date Range: {startDate} to {endDate} (
                  {Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))} days)
                </div>
                <div>
                  Volume: {totalVolume} {volumePeriodBasis.toLowerCase()}
                </div>
                {timePatternId && (
                  <div>
                    Pattern: {availablePatterns.find(p => p.id === timePatternId)?.name || "Unknown"}
                  </div>
                )}
              </div>
            </div>
          )}
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
            {isEditMode ? "Save Changes" : "Create Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeDistributedConfigEditorModal;
