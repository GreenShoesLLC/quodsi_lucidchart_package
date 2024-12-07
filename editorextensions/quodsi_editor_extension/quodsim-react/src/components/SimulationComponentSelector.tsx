import React from "react";
import { SimComponentType } from "@quodsi/shared";
import { SimComponentTypes } from "@quodsi/shared";

interface SimulationComponentSelectorProps {
  currentType?: SimComponentType;
  elementId: string;
  onTypeChange: (newType: SimComponentType, elementId: string) => void;
  disabled?: boolean;
}

export const SimulationComponentSelector: React.FC<
  SimulationComponentSelectorProps
> = ({ currentType, elementId, onTypeChange, disabled = false }) => {
  return (
    <div className="w-full p-4 bg-gray-50 border-b">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Component Type
      </label>
      <select
        value={currentType || ""}
        onChange={(e) =>
          onTypeChange(e.target.value as SimComponentType, elementId)
        }
        disabled={disabled}
        className="block w-full p-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="" disabled>
          Select Component Type
        </option>
        {SimComponentTypes.map(({ type, displayName, description }) => (
          <option key={type} value={type} title={description}>
            {displayName}
          </option>
        ))}
      </select>
    </div>
  );
};
