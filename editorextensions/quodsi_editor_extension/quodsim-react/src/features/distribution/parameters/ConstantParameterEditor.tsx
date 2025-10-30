import React from "react";
import {
  ConstantParameters,
  CONSTANT_PARAMETER_METADATA,
  ConstantDistribution,
} from "@quodsi/shared";
import { useParameterEditorState } from "../../../messaging/hooks/useParameterEditorState";

interface ConstantParameterEditorProps {
  parameters: ConstantParameters;
  onChange: (updatedParameters: ConstantParameters) => void;
  disabled?: boolean;
  elementId?: string; // Optional: for Redux save state integration
}

export const ConstantParameterEditor: React.FC<ConstantParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
  elementId,
}) => {
  // Get metadata for the parameter
  const metadata = CONSTANT_PARAMETER_METADATA.value;

  // Use stateful parameter editor with Redux integration
  const { localValue, setLocalValue, isDirty, setIsDirty, isSaving } =
    useParameterEditorState(parameters.value, elementId);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const sanitizedValue = isNaN(newValue) ? 0 : newValue;

    // Update local state immediately for responsive UI
    setLocalValue(sanitizedValue);
    setIsDirty(true);

    // Create updated parameters
    const updatedParams: ConstantParameters = {
      ...parameters,
      value: sanitizedValue
    };

    // Only propagate change if parameters are valid
    if (ConstantDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div>
      <label className="block text-xs text-gray-600 font-medium mb-0.5">
        {metadata.label}
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
  );
};