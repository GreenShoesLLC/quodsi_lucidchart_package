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

  const handleParameterChange = (paramName: keyof TriangularParameters, value: number) => {
    const updatedParams: TriangularParameters = {
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
    handleParameterChange('left', isNaN(newValue) ? 0 : newValue);
  };

  const handleModeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleParameterChange('mode', isNaN(newValue) ? 0 : newValue);
  };

  const handleRightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value);
    handleParameterChange('right', isNaN(newValue) ? 0 : newValue);
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
    </div>
  );
};