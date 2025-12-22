import React from "react";
import { Info } from "lucide-react";
import {
  ExponentialParameters,
  EXPONENTIAL_PARAMETER_METADATA,
  ExponentialDistribution,
} from "@quodsi/shared";
import { useParameterEditorState } from "../../../messaging/hooks/useParameterEditorState";

interface ExponentialParameterEditorProps {
  parameters: ExponentialParameters;
  onChange: (updatedParameters: ExponentialParameters) => void;
  disabled?: boolean;
  elementId?: string; // Optional: for Redux save state integration
}

export const ExponentialParameterEditor: React.FC<ExponentialParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
  elementId,
}) => {
  // Get metadata for the parameter
  const metadata = EXPONENTIAL_PARAMETER_METADATA.scale;

  // Use stateful parameter editor with Redux integration
  const { localValue, setLocalValue, isDirty, setIsDirty, isSaving } =
    useParameterEditorState(parameters.scale, elementId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const minValue = metadata.min ?? 0.01;
    const sanitizedValue = isNaN(newValue) ? minValue : Math.max(minValue, newValue);

    // Update local state immediately for responsive UI
    setLocalValue(sanitizedValue);
    setIsDirty(true);

    // Create updated parameters
    const updatedParams: ExponentialParameters = {
      ...parameters,
      scale: sanitizedValue
    };

    // Only propagate change if parameters are valid
    if (ExponentialDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            {metadata.label}
            <span title="The scale parameter (1/lambda) controls the mean of the exponential distribution. Higher values mean longer average times. The exponential distribution models time between events in a Poisson process—use for waiting times, service times, and equipment lifetimes.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
          {isDirty && <span className="ml-1 text-orange-500 text-[10px]">*</span>}
          {isSaving && <span className="ml-1 text-blue-500 text-[10px]">(saving...)</span>}
        </label>
        <input
          type="number"
          value={localValue}
          onChange={handleChange}
          disabled={disabled || isSaving}
          min={metadata.min}
          step={metadata.step}
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
