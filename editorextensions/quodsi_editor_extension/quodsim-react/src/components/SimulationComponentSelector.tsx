import React from "react";
import { SimComponentType } from "@quodsi/shared";
import { SimComponentTypes } from "@quodsi/shared";

interface SimulationComponentSelectorProps {
  currentType?: SimComponentType;
  elementId: string;
  onTypeChange: (newType: SimComponentType, elementId: string) => void;
  disabled?: boolean;
}

export const SimulationComponentSelector: React.FC<SimulationComponentSelectorProps> = ({ 
  currentType, 
  elementId, 
  onTypeChange, 
  disabled = false 
}) => {
  return (
    <div className="quodsi-form">
      <div className="quodsi-field">
        <label className="quodsi-label">
          Component Type
        </label>
        <select
          value={currentType || ""}
          onChange={(e) => onTypeChange(e.target.value as SimComponentType, elementId)}
          disabled={disabled}
          className={`quodsi-select ${disabled ? 'quodsi-input-loading' : ''}`}
        >
          <option value="" disabled>
            Select Component Type
          </option>
          {SimComponentTypes.map(({ type, displayName, description }) => (
            <option 
              key={type} 
              value={type} 
              title={description}
            >
              {displayName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
