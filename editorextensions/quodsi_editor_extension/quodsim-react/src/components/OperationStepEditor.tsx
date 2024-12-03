// OperationStepEditor.tsx
import React from "react";
import { DurationType } from "src/shared/types/elements/DurationType";
import { PeriodUnit } from "src/shared/types/elements/PeriodUnit";
import { OperationStep } from "src/shared/types/elements/OperationStep";

interface OperationStepEditorProps {
  operationSteps: OperationStep[];
  onOperationStepChange: (updatedSteps: OperationStep[]) => void;
}

const OperationStepEditor: React.FC<OperationStepEditorProps> = ({
  operationSteps,
  onOperationStepChange,
}) => {
  const handleStepChange = (index: number, field: string, value: any) => {
    const updatedSteps = operationSteps.map((step, i) =>
      i === index ? { ...step, [field]: value } : step
    );
    onOperationStepChange(updatedSteps);
  };

  const handleAddStep = () => {
    const newStep: OperationStep = {
      resourceSetRequest: null,
      duration: {
        durationLength: 0,
        durationPeriodUnit: PeriodUnit.MINUTES,
        durationType: DurationType.CONSTANT,
        distribution: null,
      },
    };
    onOperationStepChange([...operationSteps, newStep]);
  };

  const handleRemoveStep = (index: number) => {
    const updatedSteps = operationSteps.filter((_, i) => i !== index);
    onOperationStepChange(updatedSteps);
  };

  return (
    <div className="operation-steps-container">
      <button
        type="button"
        className="lucid-styling tertiary"
        onClick={handleAddStep}
      >
        Add Operation Step
      </button>
      {operationSteps.map((step, index) => (
        <div key={index} className="editor-operation-step">
          <div className="editor-field">
            <label htmlFor={`durationLength-${index}`}>Duration Length:</label>
            <input
              type="number"
              id={`durationLength-${index}`}
              className="lucid-styling"
              value={step.duration.durationLength}
              onChange={(e) =>
                handleStepChange(index, "duration", {
                  ...step.duration,
                  durationLength: parseFloat(e.target.value),
                })
              }
            />
          </div>
          <div className="editor-field">
            <label htmlFor={`durationPeriodUnit-${index}`}>
              Duration Period Unit:
            </label>
            <select
              id={`durationPeriodUnit-${index}`}
              className="lucid-styling"
              value={step.duration.durationPeriodUnit}
              onChange={(e) =>
                handleStepChange(index, "duration", {
                  ...step.duration,
                  durationPeriodUnit: e.target.value as PeriodUnit,
                })
              }
            >
              {Object.values(PeriodUnit).map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
          <div className="editor-field">
            <label htmlFor={`durationType-${index}`}>Duration Type:</label>
            <select
              id={`durationType-${index}`}
              className="lucid-styling"
              value={step.duration.durationType}
              onChange={(e) =>
                handleStepChange(index, "duration", {
                  ...step.duration,
                  durationType: e.target.value as DurationType,
                })
              }
            >
              {Object.values(DurationType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="lucid-styling secondary"
            onClick={() => handleRemoveStep(index)}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
};

export default React.memo(OperationStepEditor);
