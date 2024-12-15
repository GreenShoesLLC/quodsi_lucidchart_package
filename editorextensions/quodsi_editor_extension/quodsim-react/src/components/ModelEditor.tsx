import React from "react";
import {
  Model,
  PeriodUnit,
  SimulationTimeType,
  SimulationObjectType,
  Duration,
  DurationType,
} from "@quodsi/shared";
import { Settings, Clock, Calendar, Hash } from "lucide-react";
import { CompactDurationEditor } from "./CompactDurationEditor";
import BaseEditor from "./BaseEditor";

interface Props {
  model: Model;
  onSave: (model: Model) => void;
  onCancel: () => void;
}

const ModelEditor: React.FC<Props> = ({ model, onSave, onCancel }) => {
  const createSyntheticEvent = (
    name: string,
    value: any
  ): React.ChangeEvent<HTMLInputElement | HTMLSelectElement> => {
    return {
      target: {
        name,
        value,
      },
      currentTarget: {
        name,
        value,
      },
    } as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
  };

  return (
    <BaseEditor
      data={{ ...model, type: SimulationObjectType.Model }}
      onSave={onSave}
      onCancel={onCancel}
      messageType="modelSaved"
    >
      {(localModel, handleChange) => (
        <div className="space-y-4 p-3">
          {/* Basic Settings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Basic Settings</span>
            </div>
            <input
              type="text"
              name="name"
              className="w-full px-2 py-1 text-sm border rounded"
              value={localModel.name}
              placeholder="Model Name"
              onChange={handleChange}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Reps</label>
                <input
                  type="number"
                  name="reps"
                  className="w-full px-2 py-1 text-sm border rounded"
                  value={localModel.reps}
                  onChange={handleChange}
                  min="1"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Seed</label>
                <input
                  type="number"
                  name="seed"
                  className="w-full px-2 py-1 text-sm border rounded"
                  value={localModel.seed}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Time Settings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Time Settings</span>
            </div>

            <div className="space-y-2">
              <select
                name="simulationTimeType"
                className="w-full px-2 py-1 text-sm border rounded"
                value={localModel.simulationTimeType}
                onChange={handleChange}
              >
                {Object.values(SimulationTimeType).map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              <select
                name="oneClockUnit"
                className="w-full px-2 py-1 text-sm border rounded"
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

            {localModel.simulationTimeType === SimulationTimeType.Clock && (
              <div className="space-y-2 pt-2">
                <div className="space-y-2">
                  <CompactDurationEditor
                    duration={
                      new Duration(
                        localModel.runClockPeriod || 0,
                        localModel.runClockPeriodUnit || PeriodUnit.MINUTES,
                        DurationType.CONSTANT
                      )
                    }
                    onChange={(duration) => {
                      handleChange(
                        createSyntheticEvent(
                          "runClockPeriod",
                          duration.durationLength
                        )
                      );
                      handleChange(
                        createSyntheticEvent(
                          "runClockPeriodUnit",
                          duration.durationPeriodUnit
                        )
                      );
                    }}
                    lengthLabel="Run Time"
                  />

                  <CompactDurationEditor
                    duration={
                      new Duration(
                        localModel.warmupClockPeriod || 0,
                        localModel.warmupClockPeriodUnit || PeriodUnit.MINUTES,
                        DurationType.CONSTANT
                      )
                    }
                    onChange={(duration) => {
                      handleChange(
                        createSyntheticEvent(
                          "warmupClockPeriod",
                          duration.durationLength
                        )
                      );
                      handleChange(
                        createSyntheticEvent(
                          "warmupClockPeriodUnit",
                          duration.durationPeriodUnit
                        )
                      );
                    }}
                    lengthLabel="Warmup Time"
                  />
                </div>
              </div>
            )}

            {localModel.simulationTimeType ===
              SimulationTimeType.CalendarDate && (
              <div className="space-y-2 pt-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Start Date
                  </label>
                  <input
                    type="datetime-local"
                    name="startDateTime"
                    className="w-full px-2 py-1 text-sm border rounded"
                    value={
                      localModel.startDateTime?.toISOString().slice(0, 16) || ""
                    }
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Finish Date
                  </label>
                  <input
                    type="datetime-local"
                    name="finishDateTime"
                    className="w-full px-2 py-1 text-sm border rounded"
                    value={
                      localModel.finishDateTime?.toISOString().slice(0, 16) ||
                      ""
                    }
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">
                    Warmup Date
                  </label>
                  <input
                    type="datetime-local"
                    name="warmupDateTime"
                    className="w-full px-2 py-1 text-sm border rounded"
                    value={
                      localModel.warmupDateTime?.toISOString().slice(0, 16) ||
                      ""
                    }
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default ModelEditor;
