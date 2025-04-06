import React from "react";
import {
  UniformParameters,
  UNIFORM_PARAMETER_METADATA,
  UniformDistribution,
} from "@quodsi/shared";

interface UniformParameterEditorProps {
  parameters: UniformParameters;
  onChange: (updatedParameters: UniformParameters) => void;
  disabled?: boolean;
}

export const UniformParameterEditor: React.FC<UniformParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Get metadata
  const lowMetadata = UNIFORM_PARAMETER_METADATA.low;
  const highMetadata = UNIFORM_PARAMETER_METADATA.high;

  const handleLowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const updatedParams: UniformParameters = {
      ...parameters,
      low: isNaN(newValue) ? 0 : newValue
    };
    
    // Only update if the parameters are valid
    if (UniformDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleHighChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const updatedParams: UniformParameters = {
      ...parameters,
      high: isNaN(newValue) ? 0 : newValue
    };
    
    // Only update if the parameters are valid
    if (UniformDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {lowMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.low}
          onChange={handleLowChange}
          disabled={disabled}
          min={lowMetadata.min}
          step={lowMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {highMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.high}
          onChange={handleHighChange}
          disabled={disabled}
          min={highMetadata.min}
          step={highMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
    </div>
  );
};