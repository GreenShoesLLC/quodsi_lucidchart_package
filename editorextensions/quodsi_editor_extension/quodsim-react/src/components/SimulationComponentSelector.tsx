import React from "react";
import { SimComponentType } from "@quodsi/shared";
import { SimComponentTypes } from "@quodsi/shared";
import { Settings } from "lucide-react";

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
    <div className="space-y-2 p-2">
      <div className="flex items-center gap-1 mb-1">
        <Settings className="w-4 h-4 text-blue-500" />
        <span className="text-xs font-medium text-gray-700">
          Component Type
        </span>
      </div>
      <select
        value={currentType || ""}
        onChange={(e) =>
          onTypeChange(e.target.value as SimComponentType, elementId)
        }
        disabled={disabled}
        className="w-full px-2 py-1 text-sm border rounded"
      >
        {/* <option value="">None</option> */}
        {SimComponentTypes.map(({ type, displayName, description }) => (
          <option key={type} value={type} title={description}>
            {displayName}
          </option>
        ))}
      </select>
    </div>
  );
};
