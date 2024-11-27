import React from "react";
import {
  SimComponentType,
  SimComponentTypes,
} from "src/types/simComponentTypes";

interface SimulationComponentSelectorProps {
  currentType?: SimComponentType;
  onTypeChange: (newType: SimComponentType) => void;
  disabled?: boolean;
}

export const SimulationComponentSelector: React.FC<
  SimulationComponentSelectorProps
> = ({ currentType, onTypeChange, disabled = false }) => {
  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = event.target.value as SimComponentType;
    console.log("[SimComponentSelector] Type change initiated:", {
      from: currentType,
      to: newType,
      timestamp: new Date().toISOString(),
    });
    onTypeChange(newType);
  };

  return (
    <div className="w-full p-4 bg-gray-50 border-b">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Component Type
      </label>
      <select
        value={currentType || ""}
        onChange={handleChange}
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
