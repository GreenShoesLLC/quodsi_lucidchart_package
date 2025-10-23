import React from "react";
import { 
  DistributionType,
  getDistributionDisplayName,
  isDistributionTypeSupported } from "@quodsi/shared";

interface DistributionTypeSelectorProps {
  distributionType: DistributionType;
  onChange: (type: DistributionType) => void;
  disabled?: boolean;
  allowedTypes?: DistributionType[];
}

export const DistributionTypeSelector: React.FC<DistributionTypeSelectorProps> = ({
  distributionType,
  onChange,
  disabled = false,
  allowedTypes,
}) => {
  // Filter distribution types to only show supported ones and if allowedTypes is provided, filter further
  const supportedTypes = Object.values(DistributionType)
    .filter(type => isDistributionTypeSupported(type))
    .filter(type => !allowedTypes || allowedTypes.includes(type));
  
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

  // If there's only one option and it matches the current distribution type, don't render the selector
  if (supportedTypes.length === 1 && supportedTypes[0] === distributionType) {
    return null; // Don't render anything
  }
  
  return (
    <div>
      <label className="block text-xs text-gray-600 font-medium mb-0.5">
        Distribution Type
      </label>
      <select
        value={distributionType}
        onChange={handleChange}
        disabled={disabled}
        className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
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