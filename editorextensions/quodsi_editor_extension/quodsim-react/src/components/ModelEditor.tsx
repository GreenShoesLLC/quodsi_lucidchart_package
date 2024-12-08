import React from "react";
import BaseEditor from "./BaseEditor";
import { Model, PeriodUnit, SimulationTimeType, SimulationObjectType } from "@quodsi/shared";

interface Props {
  model: Model;
  onSave: (model: Model) => void;
  onCancel: () => void;
}

const ModelEditor: React.FC<Props> = ({ model, onSave, onCancel }) => {
  return (
    <BaseEditor
      data={{ ...model, type: SimulationObjectType.Model }}
      onSave={onSave}
      onCancel={onCancel}
      messageType="modelSaved"
    >
      {(localModel, handleChange) => (
        <div>
          <div className="quodsi-field">
            <label htmlFor="name" className="quodsi-label">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              className="quodsi-input"
              value={localModel.name}
              onChange={handleChange}
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="reps" className="quodsi-label">Reps</label>
            <input
              type="number"
              id="reps"
              name="reps"
              className="quodsi-input"
              value={localModel.reps}
              onChange={handleChange}
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="simulationTimeType" className="quodsi-label">Simulation Time Type</label>
            <select
              id="simulationTimeType"
              name="simulationTimeType"
              className="quodsi-select"
              value={localModel.simulationTimeType}
              onChange={handleChange}
            >
              {Object.values(SimulationTimeType).map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {localModel.simulationTimeType === SimulationTimeType.Clock && (
            <div className="quodsi-operation-step">
              <div className="quodsi-field">
                <label htmlFor="runClockPeriod" className="quodsi-label">Run Clock Period</label>
                <input
                  type="number"
                  id="runClockPeriod"
                  name="runClockPeriod"
                  className="quodsi-input"
                  value={localModel.runClockPeriod}
                  onChange={handleChange}
                />
              </div>

              <div className="quodsi-field">
                <label htmlFor="runClockPeriodUnit" className="quodsi-label">Run Clock Period Unit</label>
                <select
                  id="runClockPeriodUnit"
                  name="runClockPeriodUnit"
                  className="quodsi-select"
                  value={localModel.runClockPeriodUnit}
                  onChange={handleChange}
                >
                  {Object.values(PeriodUnit).map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div className="quodsi-field">
                <label htmlFor="warmupClockPeriod" className="quodsi-label">Warmup Clock Period</label>
                <input
                  type="number"
                  id="warmupClockPeriod"
                  name="warmupClockPeriod"
                  className="quodsi-input"
                  value={localModel.warmupClockPeriod}
                  onChange={handleChange}
                />
              </div>

              <div className="quodsi-field">
                <label htmlFor="warmupClockPeriodUnit" className="quodsi-label">Warmup Clock Period Unit</label>
                <select
                  id="warmupClockPeriodUnit"
                  name="warmupClockPeriodUnit"
                  className="quodsi-select"
                  value={localModel.warmupClockPeriodUnit}
                  onChange={handleChange}
                >
                  {Object.values(PeriodUnit).map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {localModel.simulationTimeType === SimulationTimeType.CalendarDate && (
            <div className="quodsi-operation-step">
              <div className="quodsi-field">
                <label htmlFor="warmupDateTime" className="quodsi-label">Warmup Date Time</label>
                <input
                  type="datetime-local"
                  id="warmupDateTime"
                  name="warmupDateTime"
                  className="quodsi-input"
                  value={localModel.warmupDateTime?.toISOString().slice(0, 16) || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="quodsi-field">
                <label htmlFor="startDateTime" className="quodsi-label">Start Date Time</label>
                <input
                  type="datetime-local"
                  id="startDateTime"
                  name="startDateTime"
                  className="quodsi-input"
                  value={localModel.startDateTime?.toISOString().slice(0, 16) || ""}
                  onChange={handleChange}
                />
              </div>

              <div className="quodsi-field">
                <label htmlFor="finishDateTime" className="quodsi-label">Finish Date Time</label>
                <input
                  type="datetime-local"
                  id="finishDateTime"
                  name="finishDateTime"
                  className="quodsi-input"
                  value={localModel.finishDateTime?.toISOString().slice(0, 16) || ""}
                  onChange={handleChange}
                />
              </div>
            </div>
          )}

          <div className="quodsi-field">
            <label htmlFor="seed" className="quodsi-label">Seed</label>
            <input
              type="number"
              id="seed"
              name="seed"
              className="quodsi-input"
              value={localModel.seed}
              onChange={handleChange}
            />
          </div>

          <div className="quodsi-field">
            <label htmlFor="oneClockUnit" className="quodsi-label">One Clock Unit</label>
            <select
              id="oneClockUnit"
              name="oneClockUnit"
              className="quodsi-select"
              value={localModel.oneClockUnit}
              onChange={handleChange}
            >
              {Object.values(PeriodUnit).map((unit) => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default ModelEditor;