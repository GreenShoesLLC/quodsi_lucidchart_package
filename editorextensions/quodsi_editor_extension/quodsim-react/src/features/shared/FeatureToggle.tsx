import React from 'react';

interface FeatureToggleProps {
  label: string;
  isEnabled: boolean;
  onChange: (isEnabled: boolean) => void;
  id?: string;
}

/**
 * FeatureToggle component for toggling feature flags
 */
export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  label,
  isEnabled,
  onChange,
  id = 'feature-toggle'
}) => {
  return (
    <div className="flex items-center">
      <div className="flex items-center h-5">
        <input
          id={id}
          type="checkbox"
          checked={isEnabled}
          onChange={(e) => onChange(e.target.checked)}
          className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
        />
      </div>
      <div className="ml-2 text-sm">
        <label htmlFor={id} className="font-medium text-gray-700">
          {label}
        </label>
      </div>
    </div>
  );
};
