import React, { useState } from "react";
import { Info } from "lucide-react";
import {
  NormalParameters,
  NORMAL_PARAMETER_METADATA,
  NormalDistribution,
} from "@quodsi/shared";
import { useMultiParameterEditorState } from "../../../messaging/hooks/useParameterEditorState";

interface NormalParameterEditorProps {
  parameters: NormalParameters;
  onChange: (updatedParameters: NormalParameters) => void;
  disabled?: boolean;
  elementId?: string; // Optional: for Redux save state integration
}

export const NormalParameterEditor: React.FC<NormalParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
  elementId,
}) => {
  // State for error messages
  const [errors, setErrors] = useState<{mean?: string; std?: string}>({});

  // Use stateful parameter editor with Redux integration (for both mean and std)
  const { localParams, updateField, isDirty, setIsDirty, isSaving } =
    useMultiParameterEditorState(parameters, elementId);

  // Get metadata
  const meanMetadata = NORMAL_PARAMETER_METADATA.mean;
  const stdMetadata = NORMAL_PARAMETER_METADATA.std;

  const handleParameterChange = (paramName: keyof NormalParameters, value: number) => {
    // Clear any previous errors for this parameter
    setErrors(prev => ({...prev, [paramName]: undefined}));

    // Update local state immediately
    updateField(paramName, value);
    setIsDirty(true);

    // Create an updated copy of parameters
    let updatedParams: NormalParameters = {
      ...localParams,
      [paramName]: value
    };

    // Special handling for std to ensure it's always positive
    if (paramName === 'std' && value <= 0) {
      updatedParams.std = 0.1; // Minimum allowed value for std
      updateField('std', 0.1);
      setErrors(prev => ({...prev, std: 'Standard deviation must be greater than 0. Set to minimum value (0.1).'}));
    }

    // Only update if the parameters are valid
    if (NormalDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleMeanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) {
      setErrors(prev => ({...prev, mean: 'Mean must be a valid number.'}));
      return;
    }
    handleParameterChange('mean', newValue);
  };

  const handleStdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    if (isNaN(newValue)) {
      setErrors(prev => ({...prev, std: 'Standard deviation must be a valid number.'}));
      return;
    }
    handleParameterChange('std', newValue);
  };

  return (
    <div className="space-y-2">
      {/* Distribution Overview */}
      <div className="mb-2 pb-2 border-b">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-gray-700">Distribution Overview</span>
          <span title="The normal (Gaussian) distribution models naturally occurring variation with a bell curve shape. Values cluster around the mean with decreasing probability further away. The standard deviation controls how spread out values are. Useful for modeling measurement variations, human-driven processes, and many natural phenomena.">
            <Info className="w-3.5 h-3.5 text-blue-500 hover:text-blue-700 cursor-help" />
          </span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {meanMetadata.label}
            <span title="The average (center) value of the normal distribution. This is where the bell curve peaks.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={localParams.mean}
          onChange={handleMeanChange}
          disabled={disabled || isSaving}
          min={meanMetadata.min}
          step={meanMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
        {errors.mean && <p className="text-xs text-red-500 mt-1">{errors.mean}</p>}
      </div>
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {stdMetadata.label}
            <span title="Controls the spread of values around the mean. About 68% of values fall within 1 standard deviation, 95% within 2, and 99.7% within 3 standard deviations of the mean.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={localParams.std}
          onChange={handleStdChange}
          disabled={disabled || isSaving}
          min={stdMetadata.min}
          step={stdMetadata.step}
          className={`w-full px-2 py-1 text-xs border rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none ${
            disabled || isSaving
              ? "border-gray-200 bg-gray-50 cursor-not-allowed"
              : "border-gray-300"
          }`}
        />
        {errors.std && <p className="text-xs text-red-500 mt-1">{errors.std}</p>}
      </div>
    </div>
  );
};
