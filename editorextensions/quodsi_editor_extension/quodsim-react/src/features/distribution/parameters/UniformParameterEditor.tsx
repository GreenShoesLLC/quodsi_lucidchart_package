import React, { useState } from "react";
import { Info } from "lucide-react";
import {
  UniformParameters,
  UNIFORM_PARAMETER_METADATA,
  UniformDistribution,
} from "@quodsi/shared";
import { useMultiParameterEditorState } from "../../../messaging/hooks/useParameterEditorState";

interface UniformParameterEditorProps {
  parameters: UniformParameters;
  onChange: (updatedParameters: UniformParameters) => void;
  disabled?: boolean;
  elementId?: string; // Optional: for Redux save state integration
}

export const UniformParameterEditor: React.FC<UniformParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
  elementId,
}) => {
  // State for error messages
  const [errors, setErrors] = useState<{low?: string; high?: string}>({});

  // Use stateful parameter editor with Redux integration (for both low and high)
  const { localParams, updateField, isDirty, setIsDirty, isSaving } =
    useMultiParameterEditorState(parameters, elementId);

  // Get metadata
  const lowMetadata = UNIFORM_PARAMETER_METADATA.low;
  const highMetadata = UNIFORM_PARAMETER_METADATA.high;

  const handleLowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);

    // Validate input is a number
    if (isNaN(newValue)) {
      setErrors(prev => ({...prev, low: 'Minimum must be a valid number.'}));
      return;
    }

    // Clear previous errors
    setErrors(prev => ({...prev, low: undefined}));

    const lowValue = isNaN(newValue) ? 0 : newValue;

    // Update local state immediately
    updateField('low', lowValue);
    setIsDirty(true);

    // Create a copy of the updated parameters
    let updatedParams: UniformParameters = {
      ...localParams,
      low: lowValue
    };

    // If the new low value is greater than or equal to the high value,
    // automatically increase the high value to be low + 1
    if (lowValue >= localParams.high) {
      updatedParams.high = lowValue + 1;
      updateField('high', lowValue + 1);
      setErrors(prev => ({
        ...prev,
        high: `Maximum automatically adjusted to ${updatedParams.high} to maintain proper range.`
      }));
    }

    // Only update if the parameters are valid
    if (UniformDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleHighChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);

    // Validate input is a number
    if (isNaN(newValue)) {
      setErrors(prev => ({...prev, high: 'Maximum must be a valid number.'}));
      return;
    }

    // Clear previous errors
    setErrors(prev => ({...prev, high: undefined}));

    const highValue = isNaN(newValue) ? 0 : newValue;

    // Update local state immediately
    updateField('high', highValue);
    setIsDirty(true);

    // Create a copy of the updated parameters
    let updatedParams: UniformParameters = {
      ...localParams,
      high: highValue
    };

    // If the new high value is less than or equal to the low value,
    // automatically decrease the low value to be high - 1
    if (highValue <= localParams.low) {
      updatedParams.low = Math.max(0, highValue - 1);
      updateField('low', updatedParams.low);
      setErrors(prev => ({
        ...prev,
        low: `Minimum automatically adjusted to ${updatedParams.low} to maintain proper range.`
      }));
    }

    // Only update if the parameters are valid
    if (UniformDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {lowMetadata.label}
            <span title="The lower bound of the uniform distribution. Values will be randomly generated with equal probability between Minimum and Maximum.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={localParams.low}
          onChange={handleLowChange}
          disabled={disabled || isSaving}
          min={lowMetadata.min}
          step={lowMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
        {errors.low && <p className="text-xs text-red-500 mt-1">{errors.low}</p>}
      </div>
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {highMetadata.label}
            <span title="The upper bound of the uniform distribution. Values will be randomly generated with equal probability between Minimum and Maximum.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={localParams.high}
          onChange={handleHighChange}
          disabled={disabled || isSaving}
          min={highMetadata.min}
          step={highMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
        {errors.high && <p className="text-xs text-red-500 mt-1">{errors.high}</p>}
      </div>
    </div>
  );
};