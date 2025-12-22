import React from "react";
import { Info } from "lucide-react";
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

  // Distribution-specific help text
  const distributionHelpText: Partial<Record<DistributionType, string>> = {
    [DistributionType.CONSTANT]: "A fixed value with no variation. Use when duration is always exactly the same.",
    [DistributionType.EXPONENTIAL]: "Models time between independent events at a constant average rate. Characterized by many short intervals and fewer long intervals. Use for arrival times or service durations in queuing systems.",
    [DistributionType.NORMAL]: "Bell curve distribution where values cluster around the mean. Use for naturally occurring variation, measurement variations, or human-driven processes.",
    [DistributionType.TRIANGULAR]: "Models situations with known minimum, maximum, and most likely values. Use for task durations when you have a best estimate and min/max bounds.",
    [DistributionType.UNIFORM]: "All values between minimum and maximum are equally likely. Use for completely random selection within known bounds.",
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

  return (
    <div className={`duration-editor ${compact ? "compact" : ""} space-y-0.5`}>
      {/* Distribution Type - label and selector inline */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-700 whitespace-nowrap">
          {label} Type
        </label>
        <div className="flex-1">
          <DistributionTypeSelector
            distributionType={distribution.distributionType}
            onChange={handleDistributionTypeChange}
            allowedTypes={allowedDistributionTypes}
            hideLabel
          />
        </div>
        <span title={distributionHelpText[distribution.distributionType] || "Statistical distribution for random value generation."}>
          <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
        </span>
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
        <label className="block text-xs text-gray-600 font-medium mb-0.5">
          <span className="inline-flex items-center gap-1">
            Time Unit
            <span title="The time unit for the duration values. All duration parameters will be interpreted in this unit.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
        </label>
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
