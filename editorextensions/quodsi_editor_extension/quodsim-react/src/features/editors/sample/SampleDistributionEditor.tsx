import React, { useCallback, useEffect } from "react";
import { State, StateType, DistributionType } from "@quodsi/lucid-shared";
import CategoryProbabilityEditor from "./CategoryProbabilityEditor";
import BooleanProbabilityEditor from "./BooleanProbabilityEditor";
import NumberDistributionEditor from "./NumberDistributionEditor";

interface Props {
  state: State;
  distributionType?: string;
  distributionParameters?: Record<string, any>;
  onChange: (distributionType: string, distributionParameters: Record<string, any>) => void;
}

/**
 * Main container component for SAMPLE operation distribution configuration.
 * Switches between different editors based on the state's data type.
 */
const SampleDistributionEditor: React.FC<Props> = ({
  state,
  distributionType,
  distributionParameters,
  onChange,
}) => {
  // Initialize with defaults based on state type if not set
  useEffect(() => {
    if (!distributionType || !distributionParameters) {
      initializeDefaults();
    }
  }, [state.dataType]); // Re-initialize when state type changes

  const initializeDefaults = useCallback(() => {
    switch (state.dataType) {
      case StateType.CATEGORY:
        // Initialize with equal probabilities for all category values
        if (state.categoryValues && state.categoryValues.length > 0) {
          const equalProb = 1.0 / state.categoryValues.length;
          const probs: Record<string, number> = {};
          state.categoryValues.forEach((cat) => {
            probs[cat] = equalProb;
          });
          onChange("sample_multinomial_one", { probabilities: probs });
        }
        break;
      case StateType.BOOLEAN:
        // Default 50% probability
        onChange("bernoulli", { p: 0.5 });
        break;
      case StateType.NUMBER:
        // Default to constant distribution with value 0
        onChange(DistributionType.CONSTANT, { value: 0 });
        break;
      case StateType.STRING:
        // STRING sampling uses similar approach to CATEGORY
        // but without predefined values - user must define them
        onChange("sample_multinomial_one", { probabilities: {} });
        break;
    }
  }, [state, onChange]);

  // Handle CATEGORY probability changes
  const handleCategoryChange = useCallback((probabilities: Record<string, number>) => {
    onChange("sample_multinomial_one", { probabilities });
  }, [onChange]);

  // Handle BOOLEAN probability changes
  const handleBooleanChange = useCallback((p: number) => {
    onChange("bernoulli", { p });
  }, [onChange]);

  // Render appropriate editor based on state type
  switch (state.dataType) {
    case StateType.CATEGORY:
      return (
        <CategoryProbabilityEditor
          categoryValues={state.categoryValues || []}
          probabilities={distributionParameters?.probabilities || {}}
          onChange={handleCategoryChange}
        />
      );

    case StateType.BOOLEAN:
      return (
        <BooleanProbabilityEditor
          probability={distributionParameters?.p ?? 0.5}
          onChange={handleBooleanChange}
        />
      );

    case StateType.NUMBER:
      return (
        <NumberDistributionEditor
          distributionType={distributionType || DistributionType.CONSTANT}
          distributionParameters={distributionParameters || { value: 0 }}
          onChange={onChange}
        />
      );

    case StateType.STRING:
      // STRING states are less common for SAMPLE, show a message
      return (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-xs text-yellow-700">
            STRING state sampling is not yet fully supported.
            Consider using a CATEGORY state for discrete value sampling.
          </p>
        </div>
      );

    default:
      return (
        <div className="p-3 bg-gray-50 border border-gray-200 rounded">
          <p className="text-xs text-gray-600">
            Unsupported state type for SAMPLE operation: {state.dataType}
          </p>
        </div>
      );
  }
};

export default SampleDistributionEditor;
