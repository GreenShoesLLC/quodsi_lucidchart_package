import React from "react";
import {
  ConstantParameters,
  CONSTANT_PARAMETER_METADATA,
  ConstantDistribution,
} from "@quodsi/shared";

interface ConstantParameterEditorProps {
  parameters: ConstantParameters;
  onChange: (updatedParameters: ConstantParameters) => void;
  disabled?: boolean;
}

export const ConstantParameterEditor: React.FC<ConstantParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Get metadata for the parameter
  const metadata = CONSTANT_PARAMETER_METADATA.value;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const updatedParams: ConstantParameters = {
      ...parameters,
      value: isNaN(newValue) ? 0 : newValue
    };
    
    // Only update if the parameters are valid
    if (ConstantDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div>
      <label className="block text-xs text-gray-600 font-medium mb-1">
        {metadata.label}
      </label>
      <input
        type="number"
        value={parameters.value}
        onChange={handleChange}
        disabled={disabled}
        min={metadata.min}
        step={metadata.step}
        className="w-full px-2 py-1 text-xs border border-gray-300 rounded shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
      />
    </div>
  );
};