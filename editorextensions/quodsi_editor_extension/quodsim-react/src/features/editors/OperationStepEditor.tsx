import React from "react";
import {
  OperationStep,
  Duration,
  PeriodUnit,
  Distribution,
  ResourceRequirement,
} from "@quodsi/shared";
import { X, Edit2, Plus, Info } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import { convertRootClausesToStructure, generatePreview } from "../../utils/resourceRequirementConverter";

interface OperationStepEditorProps {
  activityId?: string;
  step: OperationStep;
  index: number;
  onDelete: (index: number) => void;
  onChange: (updatedStep: OperationStep) => void;
  resourceRequirements?: ResourceRequirement[];
  availableResources?: Array<{ id: string; name: string }>;
  onOpenRequirementModal?: (requirementId: string) => void;
  onCreateRequirement?: () => void;
}

export const OperationStepEditor: React.FC<OperationStepEditorProps> = ({
  activityId,
  step,
  index,
  onDelete,
  onChange,
  resourceRequirements = [],
  availableResources = [],
  onOpenRequirementModal,
  onCreateRequirement,
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
    const value = e.target.value;
    
    if (value === "__new__") {
      // User selected "Create New..." option
      if (onCreateRequirement) {
        onCreateRequirement();
      }
    } else {
      // Normal requirement selection
      onChange({
        ...step,
        requirementId: value === "" ? null : value,
      });
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const quantity = parseInt(e.target.value) || 1;
    onChange({
      ...step,
      quantity,
    });
  };

  const handleEditRequirement = () => {
    if (step.requirementId && onOpenRequirementModal) {
      onOpenRequirementModal(step.requirementId);
    }
  };

  const getResourceName = (id: string): string => {
    return availableResources.find(r => r.id === id)?.name || 'Unknown';
  };

  const generateRequirementPreview = (req: ResourceRequirement): string => {
    const structure = convertRootClausesToStructure(req.rootClauses);
    return generatePreview(structure, getResourceName);
  };

  const selectedRequirement = step.requirementId 
    ? resourceRequirements.find(r => r.id === step.requirementId)
    : null;

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
          elementId={activityId}
          periodUnit={step.duration.durationPeriodUnit}
          distribution={step.duration.distribution}
          onChange={handleDurationChange}
          label="Duration"
          compact={true}
        />

        <div>
          <label className="block text-xs text-gray-600 mb-0.5">
            <span className="inline-flex items-center gap-1">
              Resource Requirement
              <span title="Specify which resources must be available for this operation step to execute. Resources are seized at the start of the step and released when complete.">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </span>
          </label>
          <div className="flex gap-1">
            <select
              value={step.requirementId || ""}
              onChange={handleRequirementChange}
              className="flex-1 px-1 py-0.5 text-xs border rounded bg-white"
            >
              <option value="">None</option>
              {onCreateRequirement && (
                <option value="__new__" className="font-semibold text-blue-600">
                  + Create New...
                </option>
              )}
              {resourceRequirements.map((req) => (
                <option key={req.id} value={req.id}>
                  {req.name}
                </option>
              ))}
            </select>
            
            {/* Edit button - only show if requirement selected and edit handler provided */}
            {step.requirementId && step.requirementId !== "__new__" && onOpenRequirementModal && (
              <button
                onClick={handleEditRequirement}
                className="px-1 py-0.5 border rounded bg-gray-50 hover:bg-gray-100 transition"
                title="Edit requirement"
              >
                <Edit2 className="w-3 h-3 text-blue-600" />
              </button>
            )}
          </div>

          {/* Preview of selected requirement */}
          {selectedRequirement && (
            <div className="mt-0.5 p-1 bg-blue-50 rounded border border-blue-200">
              <div className="text-[10px] text-blue-900 font-medium leading-tight">
                {selectedRequirement.name}
              </div>
              <div className="text-[10px] text-blue-700 leading-tight">
                {generateRequirementPreview(selectedRequirement)}
              </div>
            </div>
          )}
        </div>

        {/* Quantity field - only show when requirement is selected */}
        {step.requirementId && step.requirementId !== "__new__" && (
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">
              <span className="inline-flex items-center gap-1">
                Quantity
                <span title="Number of resource units needed to satisfy this requirement. The activity will wait until this many units are available.">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </span>
            </label>
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
  );
};
