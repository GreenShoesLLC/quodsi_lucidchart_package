import React, { useMemo, useCallback } from "react";
import {
  Distribution,
  DistributionType,
  DistributionParameters,
  CORE_NUMERIC_DISTRIBUTIONS,
  backendStringToDistributionType,
  createDefaultDistribution,
} from "@quodsi/lucid-shared";
import { DistributionTypeSelector } from "../../distribution/DistributionTypeSelector";
import { DistributionParametersEditor } from "../../distribution/DistributionParametersEditor";

interface Props {
  distributionType: string;
  distributionParameters: Record<string, any>;
  onChange: (type: string, params: Record<string, any>) => void;
}

/**
 * Editor component for NUMBER state sampling distributions.
 * Wraps existing DistributionTypeSelector and DistributionParametersEditor.
 */
const NumberDistributionEditor: React.FC<Props> = ({
  distributionType,
  distributionParameters,
  onChange,
}) => {
  // Convert backend string to DistributionType enum
  const currentDistributionType = useMemo(() => {
    const enumType = backendStringToDistributionType(distributionType);
    return enumType || DistributionType.CONSTANT;
  }, [distributionType]);

  // Create a Distribution object for the parameters editor
  const distribution = useMemo(() => {
    try {
      // Cast to DistributionParameters since we're getting this from external source
      return new Distribution(
        currentDistributionType,
        distributionParameters as DistributionParameters,
        ""
      );
    } catch {
      // If parameters are invalid, create default
      return createDefaultDistribution(currentDistributionType);
    }
  }, [currentDistributionType, distributionParameters]);

  // Handle distribution type change - atomically update both type and parameters
  const handleTypeChange = useCallback((newType: DistributionType) => {
    const defaultDist = createDefaultDistribution(newType);
    onChange(newType, defaultDist.parameters);
  }, [onChange]);

  // Handle parameter changes - keep same type, update params
  const handleDistributionChange = useCallback((updatedDistribution: Distribution) => {
    onChange(distributionType, updatedDistribution.parameters);
  }, [onChange, distributionType]);

  return (
    <div className="space-y-3">
      {/* Distribution type selector - filtered to core set */}
      <DistributionTypeSelector
        distributionType={currentDistributionType}
        onChange={handleTypeChange}
        allowedTypes={CORE_NUMERIC_DISTRIBUTIONS}
      />

      {/* Distribution parameters editor */}
      <DistributionParametersEditor
        distribution={distribution}
        distributionType={currentDistributionType}
        onChange={handleDistributionChange}
      />
    </div>
  );
};

export default NumberDistributionEditor;
