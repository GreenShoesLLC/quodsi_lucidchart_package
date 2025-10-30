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
  elementId?: string;
  periodUnit: PeriodUnit;
  distribution: Distribution;
  onChange: (periodUnit: PeriodUnit, distribution: Distribution) => void;
  label?: string;
  compact?: boolean;
  allowedDistributionTypes?: DistributionType[];
}

export const EnhancedDurationEditor: React.FC<EnhancedDurationEditorProps> = ({
  elementId,
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
    // Create new distribution
    let newDistribution: Distribution;

    if (type === DistributionType.CONSTANT) {
      newDistribution = ConstantDistribution.create(1);
    } else {
      newDistribution = createDefaultDistribution(type);
    }

    // Notify parent immediately (no local buffering)
    onChange(periodUnit, newDistribution);
  };

  // Handle distribution parameter changes
  const handleDistributionChange = (updatedDistribution: Distribution) => {
    // Notify parent immediately (no local buffering)
    onChange(periodUnit, updatedDistribution);
  };

  // Handle period unit change
  const handlePeriodUnitChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    onChange(event.target.value as PeriodUnit, distribution);
  };

  // Check if we have only one allowed distribution type that matches the current type
  const isFixedDistribution =
    allowedDistributionTypes &&
    allowedDistributionTypes.length === 1 &&
    allowedDistributionTypes[0] === distribution.distributionType;

  return (
    <div className={`duration-editor ${compact ? "compact" : ""} space-y-0.5`}>
      {/* Label - enhanced to include distribution type info when fixed */}
      <div className="text-xs font-medium text-gray-700 mb-0.5">
        {isFixedDistribution && distribution.distributionType === DistributionType.CONSTANT
          ? `${label}`
          : label}
      </div>

      {/* Distribution Type Selector - only shown if not fixed */}
      <div>
        <DistributionTypeSelector
          distributionType={distribution.distributionType}
          onChange={handleDistributionTypeChange}
          allowedTypes={allowedDistributionTypes}
        />
      </div>

      {/* Distribution Parameters Editor */}
      <div>
        <DistributionParametersEditor
          elementId={elementId}
          distribution={distribution}
          distributionType={distribution.distributionType}
          onChange={handleDistributionChange}
        />
      </div>

      {/* Period Unit Selector */}
      <div>
        <select
          name="durationPeriodUnit"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
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
