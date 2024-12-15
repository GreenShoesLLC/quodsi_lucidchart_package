import React from "react";
import { OperationStep, Duration } from "@quodsi/shared";
import { X } from "lucide-react";
import { CompactDurationEditor } from "./CompactDurationEditor";

interface OperationStepEditorProps {
  step: OperationStep;
  index: number;
  onDelete: () => void;
  onChange: (updatedStep: OperationStep) => void;
}

export const OperationStepEditor: React.FC<OperationStepEditorProps> = ({
  step,
  index,
  onDelete,
  onChange,
}) => {
  const handleDurationChange = (updatedDuration: Duration) => {
    onChange({ ...step, duration: updatedDuration });
  };

  return (
    <div className="bg-white rounded mb-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm">Step {index + 1}</span>
        <button
          onClick={onDelete}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <CompactDurationEditor
        duration={step.duration}
        onChange={handleDurationChange}
        lengthLabel="Duration"
      />
    </div>
  );
};
