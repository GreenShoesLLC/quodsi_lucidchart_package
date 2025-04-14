import React from "react";
import {
  TriangularParameters,
  TRIANGULAR_PARAMETER_METADATA,
  TriangularDistribution,
} from "@quodsi/shared";

interface TriangularParameterEditorProps {
  parameters: TriangularParameters;
  onChange: (updatedParameters: TriangularParameters) => void;
  disabled?: boolean;
}

export const TriangularParameterEditor: React.FC<TriangularParameterEditorProps> = ({
  parameters,
  onChange,
  disabled = false,
}) => {
  // Get metadata
  const leftMetadata = TRIANGULAR_PARAMETER_METADATA.left;
  const modeMetadata = TRIANGULAR_PARAMETER_METADATA.mode;
  const rightMetadata = TRIANGULAR_PARAMETER_METADATA.right;

  const handleParameterChange = (paramName: keyof TriangularParameters, value: number, preAdjustedParams?: TriangularParameters) => {
    // Use pre-adjusted parameters if provided, otherwise create new updated params
    const updatedParams: TriangularParameters = preAdjustedParams || {
      ...parameters,
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
      ...parameters,
      left: leftValue
    };
    
    // If left becomes greater than mode, cascade adjustments with 1-unit spacing
    if (leftValue > parameters.mode) {
      // Set mode to 1 more than left
      updatedParams.mode = leftValue + 1;
      
      // Set right to 1 more than mode
      if (updatedParams.mode > parameters.right) {
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
      ...parameters,
      mode: modeValue
    };
    
    // If mode becomes greater than right, set right to mode + 1
    if (modeValue > parameters.right) {
      updatedParams.right = modeValue + 1;
    }
    
    // If mode becomes less than left, set left to mode - 1 (but not below 0)
    if (modeValue < parameters.left) {
      updatedParams.left = Math.max(0, modeValue - 1);
    }
    
    handleParameterChange('mode', modeValue, updatedParams);
  };

  const handleRightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    const rightValue = isNaN(newValue) ? 0 : newValue;
    
    // Create a copy of parameters with the new right value
    const updatedParams: TriangularParameters = {
      ...parameters,
      right: rightValue
    };
    
    // If right becomes less than mode, cascade adjustments with 1-unit spacing
    if (rightValue < parameters.mode) {
      // Set mode to 1 less than right (but not less than 0)
      updatedParams.mode = Math.max(0, rightValue - 1);
      
      // Set left to 1 less than mode (but not less than 0)
      if (updatedParams.mode < parameters.left) {
        updatedParams.left = Math.max(0, updatedParams.mode - 1);
      }
    }
    
    handleParameterChange('right', rightValue, updatedParams);
  };

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {leftMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.left}
          onChange={handleLeftChange}
          disabled={disabled}
          min={leftMetadata.min}
          step={leftMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {modeMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.mode}
          onChange={handleModeChange}
          disabled={disabled}
          min={modeMetadata.min}
          step={modeMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      <div>
        <label className="block text-xs text-gray-600 mb-1">
          {rightMetadata.label}
        </label>
        <input
          type="number"
          value={parameters.right}
          onChange={handleRightChange}
          disabled={disabled}
          min={rightMetadata.min}
          step={rightMetadata.step}
          className="w-full px-2 py-1 text-sm border rounded"
        />
      </div>
      <div className="text-xs text-gray-500 mt-1 italic">
        Triangular distribution generates random values with increasing probability up to the Mode (peak) and then decreasing probability to the Maximum. Most likely value is the Mode.
      </div>
    </div>
  );
};