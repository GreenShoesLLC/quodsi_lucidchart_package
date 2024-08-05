import React, { useState } from 'react';
import { Model } from '../app/models/model';
import { PeriodUnit } from '../app/models/enums/PeriodUnit';
import { SimulationTimeType } from '../app/models/enums/simulation_time_type';

interface Props {
  model: Model;
  onSave: (model: Model) => void;
  onCancel: () => void;
}

const ModelEditor: React.FC<Props> = ({ model, onSave, onCancel }) => {
  const [localModel, setLocalModel] = useState<Model>(model);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalModel(prevModel => ({
      ...prevModel,
      [name]: getValueByType(name, value)
    }));
  };

  const getValueByType = (name: string, value: string) => {
    switch (name) {
      case 'reps':
      case 'forecastDays':
      case 'seed':
      case 'warmupClockPeriod':
      case 'runClockPeriod':
        return Number(value);
      case 'oneClockUnit':
      case 'warmupClockPeriodUnit':
      case 'runClockPeriodUnit':
        return value as PeriodUnit;
      case 'simulationTimeType':
        return value as SimulationTimeType;
      case 'warmupDateTime':
      case 'startDateTime':
      case 'finishDateTime':
        return value ? new Date(value) : null;
      default:
        return value;
    }
  };

  const handleSave = () => {
    onSave(localModel);
  };

  return (
    <div>
      <label>
        Name:
        <input type="text" name="name" value={localModel.name} onChange={handleChange} />
      </label>
      <label>
        Reps:
        <input type="number" name="reps" value={localModel.reps} onChange={handleChange} />
      </label>
      <label>
        Forecast Days:
        <input type="number" name="forecastDays" value={localModel.forecastDays} onChange={handleChange} />
      </label>
      <label>
        Seed:
        <input type="number" name="seed" value={localModel.seed} onChange={handleChange} />
      </label>
      <label>
        One Clock Unit:
        <select name="oneClockUnit" value={localModel.oneClockUnit} onChange={handleChange}>
          {Object.values(PeriodUnit).map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </label>
      <label>
        Simulation Time Type:
        <select name="simulationTimeType" value={localModel.simulationTimeType} onChange={handleChange}>
          {Object.values(SimulationTimeType).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </label>
      <label>
        Warmup Clock Period:
        <input type="number" name="warmupClockPeriod" value={localModel.warmupClockPeriod} onChange={handleChange} />
      </label>
      <label>
        Warmup Clock Period Unit:
        <select name="warmupClockPeriodUnit" value={localModel.warmupClockPeriodUnit} onChange={handleChange}>
          {Object.values(PeriodUnit).map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </label>
      <label>
        Run Clock Period:
        <input type="number" name="runClockPeriod" value={localModel.runClockPeriod} onChange={handleChange} />
      </label>
      <label>
        Run Clock Period Unit:
        <select name="runClockPeriodUnit" value={localModel.runClockPeriodUnit} onChange={handleChange}>
          {Object.values(PeriodUnit).map(unit => (
            <option key={unit} value={unit}>{unit}</option>
          ))}
        </select>
      </label>
      <label>
        Warmup Date Time:
        <input type="datetime-local" name="warmupDateTime" value={localModel.warmupDateTime?.toISOString().slice(0, 16) || ''} onChange={handleChange} />
      </label>
      <label>
        Start Date Time:
        <input type="datetime-local" name="startDateTime" value={localModel.startDateTime?.toISOString().slice(0, 16) || ''} onChange={handleChange} />
      </label>
      <label>
        Finish Date Time:
        <input type="datetime-local" name="finishDateTime" value={localModel.finishDateTime?.toISOString().slice(0, 16) || ''} onChange={handleChange} />
      </label>
      <button onClick={handleSave}>Save</button>
      <button onClick={onCancel}>Cancel</button>
    </div>
  );
};

export default ModelEditor;