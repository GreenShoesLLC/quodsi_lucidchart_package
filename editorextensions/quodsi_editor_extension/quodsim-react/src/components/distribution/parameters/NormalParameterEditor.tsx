import React from "react";
import {
  NormalParameters,
  NORMAL_PARAMETER_METADATA,
  NormalDistribution,
} from "@quodsi/shared";

interface NormalParameterEditorProps {
  parameters: NormalParameters;
  onChange: (updatedParameters: NormalParameters) => void;
  disabled?: boolean;
}

export const NormalParameterEditor: React.FC<NormalParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Get metadata
  const meanMetadata = NORMAL_PARAMETER_METADATA.mean;
  const stdMetadata = NORMAL_PARAMETER_METADATA.std;

  const handleParameterChange = (paramName: keyof NormalParameters, value: number) => {
    const updatedParams: NormalParameters = {
      ...parameters,
      [paramName]: value
    };
    
    // Only update if the parameters are valid
    if (NormalDistribution.validateParameters(updatedParams)) {
      onChange(updatedParams);
    }
  };

  const handleMeanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleParameterChange('mean', isNaN(newValue) ? 0 : newValue);
  };

  const handleStdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleParameterChange('std', isNaN(newValue) ? 0.1 : newValue);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {meanMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.mean}
          onChange={handleMeanChange}
          disabled={disabled}
          min={meanMetadata.min}
          step={meanMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {stdMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.std}
          onChange={handleStdChange}
          disabled={disabled}
          min={stdMetadata.min}
          step={stdMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
    </div>
  );
};