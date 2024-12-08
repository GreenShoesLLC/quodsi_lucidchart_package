import React from "react";
import { DurationType, PeriodUnit, OperationStep } from "@quodsi/shared";

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
    <div className="quodsi-field">
      <div className="quodsi-operation-step-header">
        <h3 className="quodsi-label">Operation Steps</h3>
        <button
          type="button"
          className="quodsi-button quodsi-button-primary"
          onClick={handleAddStep}
        >
          Add Operation Step
        </button>
      </div>
      
      {operationSteps.map((step, index) => (
        <div key={index} className="quodsi-operation-step">
          <div className="quodsi-field">
            <label htmlFor={`durationLength-${index}`} className="quodsi-label">
              Duration Length
            </label>
            <input
              type="number"
              id={`durationLength-${index}`}
              className="quodsi-input"
              value={step.duration.durationLength}
              onChange={(e) =>
                handleStepChange(index, "duration", {
                  ...step.duration,
                  durationLength: parseFloat(e.target.value),
                })
              }
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor={`durationPeriodUnit-${index}`} className="quodsi-label">
              Duration Period Unit
            </label>
            <select
              id={`durationPeriodUnit-${index}`}
              className="quodsi-select"
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

          <div className="quodsi-field">
            <label htmlFor={`durationType-${index}`} className="quodsi-label">
              Duration Type
            </label>
            <select
              id={`durationType-${index}`}
              className="quodsi-select"
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
            className="quodsi-button quodsi-button-danger"
            onClick={() => handleRemoveStep(index)}
          >
            Remove Step
          </button>
        </div>
      ))}
    </div>
  );
};

export default React.memo(OperationStepEditor);