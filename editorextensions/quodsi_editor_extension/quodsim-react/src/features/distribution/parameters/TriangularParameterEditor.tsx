import React from "react";
import { Info } from "lucide-react";
import {
  TriangularParameters,
  TRIANGULAR_PARAMETER_METADATA,
  TriangularDistribution,
} from "@quodsi/shared";
import { useMultiParameterEditorState } from "../../../messaging/hooks/useParameterEditorState";

interface TriangularParameterEditorProps {
  parameters: TriangularParameters;
  onChange: (updatedParameters: TriangularParameters) => void;
  disabled?: boolean;
  elementId?: string; // Optional: for Redux save state integration
}

export const TriangularParameterEditor: React.FC<TriangularParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
  elementId,
}) => {
  // Use stateful parameter editor with Redux integration (for left, mode, right)
  const { localParams, updateField, setLocalParams, isDirty, setIsDirty, isSaving } =
    useMultiParameterEditorState(parameters, elementId);

  // Get metadata
  const leftMetadata = TRIANGULAR_PARAMETER_METADATA.left;
  const modeMetadata = TRIANGULAR_PARAMETER_METADATA.mode;
  const rightMetadata = TRIANGULAR_PARAMETER_METADATA.right;

  const handleParameterChange = (paramName: keyof TriangularParameters, value: number, preAdjustedParams?: TriangularParameters) => {
    // Update local state immediately
    if (preAdjustedParams) {
      setLocalParams(preAdjustedParams);
    } else {
      updateField(paramName, value);
    }
    setIsDirty(true);

    // Use pre-adjusted parameters if provided, otherwise create new updated params
    const updatedParams: TriangularParameters = preAdjustedParams || {
      ...localParams,
      [paramName]: value
    };

    // Only update if the parameters are valid
    if (TriangularDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleLeftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const leftValue = isNaN(newValue) ? 0 : newValue;

    // Create a copy of parameters with the new left value
    const updatedParams: TriangularParameters = {
      ...localParams,
      left: leftValue
    };

    // If left becomes greater than mode, cascade adjustments with 1-unit spacing
    if (leftValue > localParams.mode) {
      // Set mode to 1 more than left
      updatedParams.mode = leftValue + 1;

      // Set right to 1 more than mode
      if (updatedParams.mode > localParams.right) {
        updatedParams.right = updatedParams.mode + 1;
      }
    }

    handleParameterChange('left', leftValue, updatedParams);
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const modeValue = isNaN(newValue) ? 0 : newValue;

    // Create a copy of parameters with the new mode value
    const updatedParams: TriangularParameters = {
      ...localParams,
      mode: modeValue
    };

    // If mode becomes greater than right, set right to mode + 1
    if (modeValue > localParams.right) {
      updatedParams.right = modeValue + 1;
    }

    // If mode becomes less than left, set left to mode - 1 (but not below 0)
    if (modeValue < localParams.left) {
      updatedParams.left = Math.max(0, modeValue - 1);
    }

    handleParameterChange('mode', modeValue, updatedParams);
  };

  const handleRightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const rightValue = isNaN(newValue) ? 0 : newValue;

    // Create a copy of parameters with the new right value
    const updatedParams: TriangularParameters = {
      ...localParams,
      right: rightValue
    };

    // If right becomes less than mode, cascade adjustments with 1-unit spacing
    if (rightValue < localParams.mode) {
      // Set mode to 1 less than right (but not less than 0)
      updatedParams.mode = Math.max(0, rightValue - 1);

      // Set left to 1 less than mode (but not less than 0)
      if (updatedParams.mode < localParams.left) {
        updatedParams.left = Math.max(0, updatedParams.mode - 1);
      }
    }

    handleParameterChange('right', rightValue, updatedParams);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {leftMetadata.label}
            <span title="The minimum possible value of the triangular distribution. This is the lower bound of the range.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={localParams.left}
          onChange={handleLeftChange}
          disabled={disabled || isSaving}
          min={leftMetadata.min}
          step={leftMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {modeMetadata.label}
            <span title="The most likely (peak) value of the triangular distribution. Values near the mode occur more frequently than values near the minimum or maximum.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={localParams.mode}
          onChange={handleModeChange}
          disabled={disabled || isSaving}
          min={modeMetadata.min}
          step={modeMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {rightMetadata.label}
            <span title="The maximum possible value of the triangular distribution. This is the upper bound of the range.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={localParams.right}
          onChange={handleRightChange}
          disabled={disabled || isSaving}
          min={rightMetadata.min}
          step={rightMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
      </div>
    </div>
  );
};
