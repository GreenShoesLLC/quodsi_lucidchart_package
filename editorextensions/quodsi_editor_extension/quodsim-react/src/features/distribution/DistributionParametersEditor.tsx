import React, { useRef, useEffect } from "react";

import {
  Distribution,
  DistributionType,
  ConstantParameters,
  UniformParameters,
  TriangularParameters,
  NormalParameters,
  ExponentialParameters,
  createDefaultDistribution,
} from "@quodsi/lucid-shared";

import { ConstantParameterEditor } from "./parameters/ConstantParameterEditor";
import { UniformParameterEditor } from "./parameters/UniformParameterEditor";
import { TriangularParameterEditor } from "./parameters/TriangularParameterEditor";
import { NormalParameterEditor } from "./parameters/NormalParameterEditor";
import { ExponentialParameterEditor } from "./parameters/ExponentialParameterEditor";

interface DistributionParametersEditorProps {
  elementId?: string;
  distribution: Distribution | null;
  distributionType: DistributionType;
  onChange: (updatedDistribution: Distribution) => void;
  disabled?: boolean;
}

export const DistributionParametersEditor: React.FC<
  DistributionParametersEditorProps
> = ({ elementId, distribution, distributionType, onChange, disabled = false }) => {
  // Track previous distribution to detect unnecessary fallbacks
  const previousDistributionRef = useRef<Distribution | null>(null);
  const previousTypeRef = useRef<DistributionType | null>(null);

  // Defensive check: Only create default distribution when necessary
  const effectiveDistribution = React.useMemo(() => {
    // Case 1: Distribution exists and types match - use it
    if (distribution?.distributionType === distributionType) {
      previousDistributionRef.current = distribution;
      previousTypeRef.current = distributionType;
      return distribution;
    }

    // Case 2: Explicit type change - create new default
    if (previousTypeRef.current !== null && previousTypeRef.current !== distributionType) {
      console.log(`[DistributionParametersEditor] Type changed from ${previousTypeRef.current} to ${distributionType}, creating default distribution`);
      const newDist = createDefaultDistribution(distributionType);
      previousDistributionRef.current = newDist;
      previousTypeRef.current = distributionType;
      return newDist;
    }

    // Case 3: Initial load or distribution is null - create default
    if (!distribution) {
      console.log(`[DistributionParametersEditor] No distribution provided, creating default ${distributionType}`);
      const newDist = createDefaultDistribution(distributionType);
      previousDistributionRef.current = newDist;
      previousTypeRef.current = distributionType;
      return newDist;
    }

    // Case 4: Type mismatch but not an explicit change - WARNING
    console.warn(
      `[DistributionParametersEditor] Type mismatch detected! ` +
      `Expected ${distributionType}, got ${distribution.distributionType}. ` +
      `This may cause parameter loss. Creating default distribution.`
    );
    const newDist = createDefaultDistribution(distributionType);
    previousDistributionRef.current = newDist;
    previousTypeRef.current = distributionType;
    return newDist;
  }, [distribution, distributionType]);

  // Handler for parameter updates
  const handleParameterUpdate = (updatedParameters: any) => {
    const updatedDistribution = new Distribution(
      distributionType,
      updatedParameters,
      effectiveDistribution.description || ""
    );

    onChange(updatedDistribution);
  };

  // Render the appropriate parameter editor based on distribution type
  const renderParameterEditor = () => {
    switch (distributionType) {
      case DistributionType.CONSTANT:
        return (
          <ConstantParameterEditor
            elementId={elementId}
            parameters={effectiveDistribution.parameters as ConstantParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      case DistributionType.UNIFORM:
        return (
          <UniformParameterEditor
            elementId={elementId}
            parameters={effectiveDistribution.parameters as UniformParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      case DistributionType.TRIANGULAR:
        return (
          <TriangularParameterEditor
            elementId={elementId}
            parameters={
              effectiveDistribution.parameters as TriangularParameters
            }
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      case DistributionType.NORMAL:
        return (
          <NormalParameterEditor
            elementId={elementId}
            parameters={effectiveDistribution.parameters as NormalParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      case DistributionType.EXPONENTIAL:
        return (
          <ExponentialParameterEditor
            elementId={elementId}
            parameters={effectiveDistribution.parameters as ExponentialParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      default:
        return (
          <div className="text-sm text-red-500">
            Unsupported distribution type: {distributionType}
          </div>
        );
    }
  };

  return <div className="parameters-editor">{renderParameterEditor()}</div>;
};
