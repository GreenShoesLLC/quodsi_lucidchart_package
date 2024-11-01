// Update ActivityEditor.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { Activity } from '../app/models/activity';
import { PeriodUnit } from '../app/models/enums/PeriodUnit';
import { DurationType } from '../app/models/enums/DurationType';
import { OperationStep } from 'src/app/models/operationStep';

interface Props {
  activity: Activity;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
}

const ActivityEditor: React.FC<Props> = ({ activity, onSave, onCancel }) => {
  const [localActivity, setLocalActivity] = useState<Activity>(activity);

  useEffect(() => {
    setLocalActivity(activity);
  }, [activity]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalActivity(prev => ({
      ...prev,
      [name]: name === 'capacity' || name === 'inputBufferCapacity' || name === 'outputBufferCapacity' ? parseInt(value, 10) : value
    }));
  };

  const handleOperationStepChange = useCallback((index: number, field: string, value: any) => {
    setLocalActivity(prev => ({
      ...prev,
      operationSteps: prev.operationSteps.map((step, i) =>
        i === index ? { ...step, [field]: value } : step
      )
    }));
  }, []);

  const handleSave = useCallback(() => {
    onSave(localActivity);
    window.parent.postMessage({
      messagetype: 'activitySaved',
      data: localActivity
    }, '*');
  }, [localActivity, onSave]);

  const handleAddOperationStep = useCallback(() => {
    const newOperationStep: OperationStep = {
      resourceSetRequest: null,
      duration: {
        durationLength: 0,
        durationPeriodUnit: PeriodUnit.MINUTES,
        durationType: DurationType.CONSTANT,
        distribution: null
      }
    };
    setLocalActivity(prev => ({ ...prev, operationSteps: [...prev.operationSteps, newOperationStep] }));
  }, []);

  const handleRemoveOperationStep = useCallback((index: number) => {
    setLocalActivity(prev => ({ ...prev, operationSteps: prev.operationSteps.filter((_, i) => i !== index) }));
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    handleSave();
  };

  return (
    <form onSubmit={handleSubmit} className="editor-form">
      <div className="editor-container">
        <div className="editor-field">
          <label htmlFor="name">Name:</label>
          <input type="text" id="name" name="name" className="lucid-styling" value={localActivity.name} onChange={handleChange} />
        </div>
        <div className="editor-field">
          <label htmlFor="capacity">Capacity:</label>
          <input type="number" id="capacity" name="capacity" className="lucid-styling" value={localActivity.capacity} onChange={handleChange} />
        </div>
        <div className="editor-field">
          <label htmlFor="inputBufferCapacity">Input Buffer Capacity:</label>
          <input type="number" id="inputBufferCapacity" name="inputBufferCapacity" className="lucid-styling" value={localActivity.inputBufferCapacity} onChange={handleChange} />
        </div>
        <div className="editor-field">
          <label htmlFor="outputBufferCapacity">Output Buffer Capacity:</label>
          <input type="number" id="outputBufferCapacity" name="outputBufferCapacity" className="lucid-styling" value={localActivity.outputBufferCapacity} onChange={handleChange} />
        </div>
      </div>

      <div className="editor-field">
        <label>Operation Steps:</label>
        <button type="button" className="lucid-styling tertiary" onClick={handleAddOperationStep}>Add Operation Step</button>
        {localActivity.operationSteps.map((step, index) => (
          <div key={index} className="editor-operation-step">
            <div className="editor-field">
              <label htmlFor={`durationLength-${index}`}>Duration Length:</label>
              <input
                type="number"
                id={`durationLength-${index}`}
                className="lucid-styling"
                value={step.duration.durationLength}
                onChange={(e) => handleOperationStepChange(index, 'duration', { ...step.duration, durationLength: parseFloat(e.target.value) })}
              />
            </div>
            <div className="editor-field">
              <label htmlFor={`durationPeriodUnit-${index}`}>Duration Period Unit:</label>
              <select
                id={`durationPeriodUnit-${index}`}
                className="lucid-styling"
                value={step.duration.durationPeriodUnit}
                onChange={(e) => handleOperationStepChange(index, 'duration', { ...step.duration, durationPeriodUnit: e.target.value as PeriodUnit })}
              >
                {Object.values(PeriodUnit).map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
            <div className="editor-field">
              <label htmlFor={`durationType-${index}`}>Duration Type:</label>
              <select
                id={`durationType-${index}`}
                className="lucid-styling"
                value={step.duration.durationType}
                onChange={(e) => handleOperationStepChange(index, 'duration', { ...step.duration, durationType: e.target.value as DurationType })}
              >
                {Object.values(DurationType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <button type="button" className="lucid-styling secondary" onClick={() => handleRemoveOperationStep(index)}>Remove</button>
          </div>
        ))}
      </div>
      <div className="editor-buttons">
        <button type="submit" className="lucid-styling primary">Save</button>
        <button type="button" onClick={onCancel} className="lucid-styling secondary">Cancel</button>
      </div>
    </form>
  );
};

export default React.memo(ActivityEditor);