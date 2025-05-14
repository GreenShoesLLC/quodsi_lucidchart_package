import React from "react";
import {
  OperationStep,
  Duration,
  PeriodUnit,
  Distribution,
  ResourceRequirement,
} from "@quodsi/shared";
import { X } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";

interface OperationStepEditorProps {
  step: OperationStep;
  index: number;
  onDelete: (index: number) => void;
  onChange: (updatedStep: OperationStep) => void;
  resourceRequirements?: ResourceRequirement[];
}

export const OperationStepEditor: React.FC<OperationStepEditorProps> = ({
  step,
  index,
  onDelete,
  onChange,
  resourceRequirements = [],
}) => {
  // Debug logging
  React.useEffect(() => {
    console.log("OperationStepEditor Debug:", {
      stepRequirementId: step.requirementId,
      availableRequirements:
        resourceRequirements?.map((r) => ({ id: r.id, name: r.name })) || [],
      requirementFound: resourceRequirements?.some(
        (r) => r.id === step.requirementId
      ),
    });
  }, [step.requirementId, resourceRequirements]);

  // Updated to handle separate periodUnit and distribution within existing Duration
  const handleDurationChange = (
    periodUnit: PeriodUnit,
    distribution: Distribution
  ) => {
    onChange({
      ...step,
      duration: {
        ...step.duration,
        durationPeriodUnit: periodUnit,
        distribution,
      },
    });
  };

  const handleRequirementChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const requirementId = e.target.value;
    onChange({
      ...step,
      requirementId: requirementId === "" ? null : requirementId,
    });
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = parseInt(e.target.value) || 1;
    onChange({
      ...step,
      quantity,
    });
  };

  return (
    <div className="bg-white rounded mb-2 p-2 border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Step {index + 1}</span>
        <button
          onClick={() => onDelete(index)}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {/* Updated Duration Editor */}
        <EnhancedDurationEditor
          periodUnit={step.duration.durationPeriodUnit}
          distribution={step.duration.distribution}
          onChange={handleDurationChange}
          label="Duration"
          compact={true}
        />

        {/* Resource Requirement Selection */}
        <div>
          <label className="block text-xs text-gray-600 mb-1">
            Resource Requirement
          </label>
          <select
            value={step.requirementId || ""}
            onChange={handleRequirementChange}
            className="w-full px-2 py-1 text-sm border rounded"
          >
            <option value="">None</option>
            {resourceRequirements.map((req) => (
              <option key={req.id} value={req.id}>
                {req.name}
              </option>
            ))}
          </select>
        </div>

        {/* Quantity input - only show if requirement is selected */}
        {step.requirementId && (
          <div>
            <label className="block text-xs text-gray-600 mb-1">Quantity</label>
            <input
              type="number"
              value={step.quantity}
              onChange={handleQuantityChange}
              min="1"
              className="w-full px-2 py-1 text-sm border rounded"
            />
          </div>
        )}
      </div>
    </div>
  );
};
