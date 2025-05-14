import React from "react";
import {
  PeriodUnit,
  Distribution,
  DistributionType,
  createDefaultDistribution,
  ConstantDistribution,
} from "@quodsi/shared";

import "./EnhancedDurationEditor.css";
import { DistributionTypeSelector } from "src/features/distribution/DistributionTypeSelector";
import { DistributionParametersEditor } from "src/features/distribution/DistributionParametersEditor";

interface EnhancedDurationEditorProps {
  periodUnit: PeriodUnit;
  distribution: Distribution;
  onChange: (periodUnit: PeriodUnit, distribution: Distribution) => void;
  label?: string;
  compact?: boolean;
  allowedDistributionTypes?: DistributionType[];
}

export const EnhancedDurationEditorOld: React.FC<
  EnhancedDurationEditorProps
> = ({
  periodUnit,
  distribution,
  onChange,
  label = "Duration",
  compact = false,
  allowedDistributionTypes,
}) => {
  // Map for period unit display
  const periodUnitDisplay: Record<PeriodUnit, string> = {
    [PeriodUnit.MINUTES]: "Minutes",
    [PeriodUnit.HOURS]: "Hours",
    [PeriodUnit.DAYS]: "Days",
    [PeriodUnit.SECONDS]: "Seconds",
  };

  // Handle distribution type change
  const handleDistributionTypeChange = (type: DistributionType) => {
    // Use factory method to create default distribution
    const newDistribution = createDefaultDistribution(type);

    // If CONSTANT, ensure a default value
    if (type === DistributionType.CONSTANT) {
      const constantDistribution = ConstantDistribution.create(1);
      onChange(periodUnit, constantDistribution);
    } else {
      onChange(periodUnit, newDistribution);
    }
  };

  // Handle distribution parameter changes
  const handleDistributionChange = (updatedDistribution: Distribution) => {
    onChange(periodUnit, updatedDistribution);
  };

  // Handle period unit change
  const handlePeriodUnitChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    onChange(event.target.value as PeriodUnit, distribution);
  };

  // Get current distribution type, defaulting to CONSTANT if not set
  const distributionType =
    distribution?.distributionType || DistributionType.CONSTANT;

  // Check if we have only one allowed distribution type that matches the current type
  const isFixedDistribution =
    allowedDistributionTypes &&
    allowedDistributionTypes.length === 1 &&
    allowedDistributionTypes[0] === distributionType;

  return (
    <div className={`duration-editor ${compact ? "compact" : ""}`}>
      {/* Label - enhanced to include distribution type info when fixed */}
      <div className="text-sm font-medium text-gray-700 mb-1">
        {isFixedDistribution && distributionType === DistributionType.CONSTANT
          ? `${label}`
          : label}
      </div>

      {/* Distribution Type Selector - only shown if not fixed */}
      <div className="mb-2">
        <DistributionTypeSelector
          distributionType={distributionType}
          onChange={handleDistributionTypeChange}
          allowedTypes={allowedDistributionTypes}
        />
      </div>

      {/* Distribution Parameters Editor */}
      <div className="mb-2">
        <DistributionParametersEditor
          distribution={distribution}
          distributionType={distributionType}
          onChange={handleDistributionChange}
        />
      </div>

      {/* Period Unit Selector */}
      <div>
        <select
          name="durationPeriodUnit"
          className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
          value={periodUnit}
          onChange={handlePeriodUnitChange}
        >
          {Object.values(PeriodUnit).map((unit) => (
            <option key={unit} value={unit}>
              {periodUnitDisplay[unit]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};
