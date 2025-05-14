import React from "react";

import {
  Distribution,
  DistributionType,
  ConstantParameters,
  UniformParameters,
  TriangularParameters,
  NormalParameters,
  createDefaultDistribution,
} from "@quodsi/shared";

import { ConstantParameterEditor } from "./parameters/ConstantParameterEditor";
import { UniformParameterEditor } from "./parameters/UniformParameterEditor";
import { TriangularParameterEditor } from "./parameters/TriangularParameterEditor";
import { NormalParameterEditor } from "./parameters/NormalParameterEditor";

interface DistributionParametersEditorProps {
  distribution: Distribution | null;
  distributionType: DistributionType;
  onChange: (updatedDistribution: Distribution) => void;
  disabled?: boolean;
}

export const DistributionParametersEditor: React.FC<
  DistributionParametersEditorProps
> = ({ distribution, distributionType, onChange, disabled = false }) => {
  // If distribution is null or has a different type, create a new default distribution
  const effectiveDistribution =
    distribution?.distributionType === distributionType
      ? distribution
      : createDefaultDistribution(distributionType);

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
            parameters={effectiveDistribution.parameters as ConstantParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      case DistributionType.UNIFORM:
        return (
          <UniformParameterEditor
            parameters={effectiveDistribution.parameters as UniformParameters}
            onChange={handleParameterUpdate}
            disabled={disabled}
          />
        );
      case DistributionType.TRIANGULAR:
        return (
          <TriangularParameterEditor
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
            parameters={effectiveDistribution.parameters as NormalParameters}
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
