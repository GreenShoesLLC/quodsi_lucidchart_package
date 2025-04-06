import React from "react";
import { 
  DistributionType,
  getDistributionDisplayName,
  isDistributionTypeSupported } from "@quodsi/shared";

interface DistributionTypeSelectorProps {
  distributionType: DistributionType;
  onChange: (type: DistributionType) => void;
  disabled?: boolean;
}

export const DistributionTypeSelector: React.FC<DistributionTypeSelectorProps> = ({
  distributionType,
  onChange,
  disabled = false,
}) => {
  // Filter distribution types to only show supported ones
  const supportedTypes = Object.values(DistributionType)
    .filter(type => isDistributionTypeSupported(type));
  
  // Define groups for the dropdown - in future versions, we might add more groups
  const groups = [
    {
      label: "Common Distributions",
      options: supportedTypes,
    }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value as DistributionType);
  };

  return (
    <div>
      <label className="block text-xs text-gray-600 mb-1">
        Distribution Type
      </label>
      <select
        value={distributionType}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-2 py-1 text-sm border rounded"
      >
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((type) => (
              <option key={type} value={type}>
                {getDistributionDisplayName(type)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
};