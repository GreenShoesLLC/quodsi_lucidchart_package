import React, { useState } from "react";
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
  // State for error messages
  const [errors, setErrors] = useState<{mean?: string; std?: string}>({});
  
  // Get metadata
  const meanMetadata = NORMAL_PARAMETER_METADATA.mean;
  const stdMetadata = NORMAL_PARAMETER_METADATA.std;

  const handleParameterChange = (paramName: keyof NormalParameters, value: number) => {
    // Clear any previous errors for this parameter
    setErrors(prev => ({...prev, [paramName]: undefined}));
    
    // Create an updated copy of parameters
    const updatedParams: NormalParameters = {
      ...parameters,
      [paramName]: value
    };
    
    // Special handling for std to ensure it's always positive
    if (paramName === 'std' && value <= 0) {
      updatedParams.std = 0.1; // Minimum allowed value for std
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
      <div>
        <label className="block text-xs text-gray-600 mb-0.5">
          {meanMetadata.label}
          <span className="text-xs text-gray-400 ml-1">(Average value)</span>
        </label>
        <input
          type="number"
          value={parameters.mean}
          onChange={handleMeanChange}
          disabled={disabled}
          min={meanMetadata.min}
          step={meanMetadata.step}
          className="w-full px-2 py-1 text-xs border rounded"
        />
        {errors.mean && <p className="text-xs text-red-500 mt-1">{errors.mean}</p>}
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-0.5">
          {stdMetadata.label}
          <span className="text-xs text-gray-400 ml-1">(Variability around mean)</span>
        </label>
        <input
          type="number"
          value={parameters.std}
          onChange={handleStdChange}
          disabled={disabled}
          min={stdMetadata.min}
          step={stdMetadata.step}
          className="w-full px-2 py-1 text-xs border rounded"
        />
        {errors.std && <p className="text-xs text-red-500 mt-1">{errors.std}</p>}
      </div>
      <div className="text-[10px] text-gray-500 mt-1 italic leading-tight">
        Normal distribution generates a bell curve centered at the Mean with most values falling within 3 Standard Deviations from the Mean.
      </div>
    </div>
  );
};