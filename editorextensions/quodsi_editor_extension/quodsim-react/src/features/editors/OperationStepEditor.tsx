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
    <div className="bg-gray-50 rounded p-1 border border-gray-200">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-gray-700">Step {index + 1}</span>
        <button
          onClick={() => onDelete(index)}
          className="text-gray-400 hover:text-red-500 p-0.5"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      <div className="space-y-1">
        <EnhancedDurationEditor
          periodUnit={step.duration.durationPeriodUnit}
          distribution={step.duration.distribution}
          onChange={handleDurationChange}
          label="Duration"
          compact={true}
        />

        <div className="grid grid-cols-2 gap-1">
          <div>
            <label className="block text-xs text-gray-600">Resource</label>
            <select
              value={step.requirementId || ""}
              onChange={handleRequirementChange}
              className="w-full px-1 py-0.5 text-xs border rounded"
            >
              <option value="">None</option>
              {resourceRequirements.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.name}
                </option>
              ))}
            </select>
          </div>
          
          {step.requirementId && (
            <div>
              <label className="block text-xs text-gray-600">Qty</label>
              <input
                type="number"
                value={step.quantity}
                onChange={handleQuantityChange}
                min="1"
                className="w-full px-1 py-0.5 text-xs border rounded"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
