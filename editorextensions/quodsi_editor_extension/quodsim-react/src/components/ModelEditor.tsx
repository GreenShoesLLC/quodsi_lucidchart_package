import React from "react";
import BaseEditor from "./BaseEditor";
import { Model } from "@quodsi/shared";
import { PeriodUnit } from "@quodsi/shared";
import { SimulationTimeType } from "@quodsi/shared";
import { SimulationObjectType } from "@quodsi/shared";

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
        <div className="form-container">
          <div className="form-group">
            <label htmlFor="name">Name:</label>
            <input
              type="text"
              name="name"
              id="name"
              className="lucid-styling"
              value={localModel.name}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reps">Reps:</label>
            <input
              type="number"
              name="reps"
              id="reps"
              className="lucid-styling"
              value={localModel.reps}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="simulationTimeType">Simulation Time Type:</label>
            <select
              name="simulationTimeType"
              id="simulationTimeType"
              className="lucid-styling"
              value={localModel.simulationTimeType}
              onChange={handleChange}
            >
              {Object.values(SimulationTimeType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          {localModel.simulationTimeType === SimulationTimeType.Clock && (
            <>
              <div className="form-group">
                <label htmlFor="runClockPeriod">Run Clock Period:</label>
                <input
                  type="number"
                  name="runClockPeriod"
                  id="runClockPeriod"
                  className="lucid-styling"
                  value={localModel.runClockPeriod}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="runClockPeriodUnit">
                  Run Clock Period Unit:
                </label>
                <select
                  name="runClockPeriodUnit"
                  id="runClockPeriodUnit"
                  className="lucid-styling"
                  value={localModel.runClockPeriodUnit}
                  onChange={handleChange}
                >
                  {Object.values(PeriodUnit).map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="warmupClockPeriod">Warmup Clock Period:</label>
                <input
                  type="number"
                  name="warmupClockPeriod"
                  id="warmupClockPeriod"
                  className="lucid-styling"
                  value={localModel.warmupClockPeriod}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="warmupClockPeriodUnit">
                  Warmup Clock Period Unit:
                </label>
                <select
                  name="warmupClockPeriodUnit"
                  id="warmupClockPeriodUnit"
                  className="lucid-styling"
                  value={localModel.warmupClockPeriodUnit}
                  onChange={handleChange}
                >
                  {Object.values(PeriodUnit).map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {localModel.simulationTimeType ===
            SimulationTimeType.CalendarDate && (
            <>
              <div className="form-group">
                <label htmlFor="warmupDateTime">Warmup Date Time:</label>
                <input
                  type="datetime-local"
                  name="warmupDateTime"
                  id="warmupDateTime"
                  className="lucid-styling"
                  value={
                    localModel.warmupDateTime?.toISOString().slice(0, 16) || ""
                  }
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="startDateTime">Start Date Time:</label>
                <input
                  type="datetime-local"
                  name="startDateTime"
                  id="startDateTime"
                  className="lucid-styling"
                  value={
                    localModel.startDateTime?.toISOString().slice(0, 16) || ""
                  }
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label htmlFor="finishDateTime">Finish Date Time:</label>
                <input
                  type="datetime-local"
                  name="finishDateTime"
                  id="finishDateTime"
                  className="lucid-styling"
                  value={
                    localModel.finishDateTime?.toISOString().slice(0, 16) || ""
                  }
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label htmlFor="seed">Seed:</label>
            <input
              type="number"
              name="seed"
              id="seed"
              className="lucid-styling"
              value={localModel.seed}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label htmlFor="oneClockUnit">One Clock Unit:</label>
            <select
              name="oneClockUnit"
              id="oneClockUnit"
              className="lucid-styling"
              value={localModel.oneClockUnit}
              onChange={handleChange}
            >
              {Object.values(PeriodUnit).map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default ModelEditor;
