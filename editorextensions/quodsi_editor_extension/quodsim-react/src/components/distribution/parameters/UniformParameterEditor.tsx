import React, { useState } from "react";
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
  // State for error messages
  const [errors, setErrors] = useState<{low?: string; high?: string}>({});
  
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
    
    // Create a copy of the updated parameters
    const updatedParams: UniformParameters = {
      ...parameters,
      low: lowValue
    };
    
    // If the new low value is greater than or equal to the high value,
    // automatically increase the high value to be low + 1
    if (lowValue >= parameters.high) {
      updatedParams.high = lowValue + 1;
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
    
    // Create a copy of the updated parameters
    const updatedParams: UniformParameters = {
      ...parameters,
      high: highValue
    };
    
    // If the new high value is less than or equal to the low value,
    // automatically decrease the low value to be high - 1
    if (highValue <= parameters.low) {
      updatedParams.low = Math.max(0, highValue - 1);
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
        <label className="block text-xs text-gray-600 mb-1">
          {lowMetadata.label}
          <span className="text-xs text-gray-400 ml-1">(Lower bound)</span>
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
        {errors.low && <p className="text-xs text-red-500 mt-1">{errors.low}</p>}
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {highMetadata.label}
          <span className="text-xs text-gray-400 ml-1">(Upper bound)</span>
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
        {errors.high && <p className="text-xs text-red-500 mt-1">{errors.high}</p>}
      </div>
      <div className="text-xs text-gray-500 mt-1 italic">
        Uniform distribution generates random values with equal probability between Minimum and Maximum.
      </div>
    </div>
  );
};