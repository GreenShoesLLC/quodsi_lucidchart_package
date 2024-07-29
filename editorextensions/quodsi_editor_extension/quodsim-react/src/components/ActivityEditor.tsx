import React, { useState } from 'react';
import { Activity, OperationStep} from '../app/models/activity';
import { PeriodUnit } from '../app/models/enums/PeriodUnit';
import { DurationType } from '../app/models/enums/DurationType';

interface Props {
  activity: Activity;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
}

const ActivityEditor: React.FC<Props> = ({ activity, onSave, onCancel }) => {
  const [localActivity, setLocalActivity] = useState<Activity>(activity);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLocalActivity({ ...localActivity, [name]: value });
  };

  const handleOperationStepChange = (index: number, field: string, value: any) => {
    const newOperationSteps = localActivity.operationSteps.map((step, i) => {
      if (i === index) {
        return { ...step, [field]: value };
      }
      return step;
    });
    setLocalActivity({ ...localActivity, operationSteps: newOperationSteps });
  };

  const handleSave = () => {
    onSave(localActivity);
    // Send message back to parent
    window.parent.postMessage({
      messagetype: 'activitySaved',
      data: localActivity
    }, '*');
  };

  const handleAddOperationStep = () => {
    const newOperationStep: OperationStep = {
      resourceSetRequest: null,
      duration: {
        durationLength: 0,
        durationPeriodUnit: PeriodUnit.MINUTES,
        durationType: DurationType.CONSTANT,
        distribution: null
      }
    };
    setLocalActivity({ ...localActivity, operationSteps: [...localActivity.operationSteps, newOperationStep] });
  };

  const handleRemoveOperationStep = (index: number) => {
    const newOperationSteps = localActivity.operationSteps.filter((_, i) => i !== index);
    setLocalActivity({ ...localActivity, operationSteps: newOperationSteps });
  };

  return (
    <div>
      <label>
        Name:
        <input type="text" name="name" value={localActivity.name} onChange={handleChange} />
      </label>
      <label>
        Capacity:
        <input type="number" name="capacity" value={localActivity.capacity} onChange={handleChange} />
      </label>
      <label>
        Input Buffer Capacity:
        <input type="number" name="inputBufferCapacity" value={localActivity.inputBufferCapacity} onChange={handleChange} />
      </label>
      <label>
        Output Buffer Capacity:
        <input type="number" name="outputBufferCapacity" value={localActivity.outputBufferCapacity} onChange={handleChange} />
      </label>
      <div>
        <label>Operation Steps:</label>
        <button onClick={handleAddOperationStep}>Add Operation Step</button>
        {localActivity.operationSteps.map((step, index) => (
          <div key={index}>
            <label>
              Duration Length:
              <input
                type="number"
                value={step.duration.durationLength}
                onChange={(e) => handleOperationStepChange(index, 'duration', { ...step.duration, durationLength: parseFloat(e.target.value) })}
              />
            </label>
            <label>
              Duration Period Unit:
              <select
                value={step.duration.durationPeriodUnit}
                onChange={(e) => handleOperationStepChange(index, 'duration', { ...step.duration, durationPeriodUnit: e.target.value as PeriodUnit })}
              >
                {Object.values(PeriodUnit).map((unit) => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </label>
            <label>
              Duration Type:
              <select
                value={step.duration.durationType}
                onChange={(e) => handleOperationStepChange(index, 'duration', { ...step.duration, durationType: e.target.value as DurationType })}
              >
                {Object.values(DurationType).map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <button onClick={() => handleRemoveOperationStep(index)}>Remove</button>
          </div>
        ))}
      </div>
      <button onClick={handleSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default ActivityEditor;
