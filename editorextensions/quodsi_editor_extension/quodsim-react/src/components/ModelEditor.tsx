import React, { useState } from "react";
import {
  Model,
  PeriodUnit,
  SimulationTimeType,
  SimulationObjectType,
  Duration,
  Distribution,
  ConstantDistribution,
} from "@quodsi/shared";
import { Settings, Clock } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import BaseEditor from "./BaseEditor";
import OutputForm from "./OutputForm";

interface Props {
  model: Model;
  onSave: (model: Model) => void;
  onCancel: () => void;
}

type EditorTab = "model" | "output";

const ModelEditor: React.FC<Props> = ({ model, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<EditorTab>("model");

  const createSyntheticEvent = (
    name: string,
    value: any
  ): React.ChangeEvent<HTMLInputElement | HTMLSelectElement> => {
    return {
      target: { name, value },
      currentTarget: { name, value },
    } as React.ChangeEvent<HTMLInputElement | HTMLSelectElement>;
  };

  const handleDurationChange = (
    periodField: "warmupClockPeriod" | "runClockPeriod",
    periodUnitField: "warmupClockPeriodUnit" | "runClockPeriodUnit",
    periodUnit: PeriodUnit,
    distribution: Distribution
  ) => {
    const value =
      distribution.distributionType === "constant"
        ? (distribution.parameters as { value: number }).value
        : 0;

    onSave({
      ...model,
      [periodField]: value,
      [periodUnitField]: periodUnit,
    });
  };

  const ModelForm = () => (
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
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Warmup Time
                    </label>
                    <EnhancedDurationEditor
                      periodUnit={
                        localModel.warmupClockPeriodUnit || PeriodUnit.MINUTES
                      }
                      distribution={ConstantDistribution.create(
                        localModel.warmupClockPeriod || 0
                      )}
                      onChange={(periodUnit, distribution) =>
                        handleDurationChange(
                          "warmupClockPeriod",
                          "warmupClockPeriodUnit",
                          periodUnit,
                          distribution
                        )
                      }
                      compact={true}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Run Time
                    </label>
                    <EnhancedDurationEditor
                      periodUnit={
                        localModel.runClockPeriodUnit || PeriodUnit.MINUTES
                      }
                      distribution={ConstantDistribution.create(
                        localModel.runClockPeriod || 0
                      )}
                      onChange={(periodUnit, distribution) =>
                        handleDurationChange(
                          "runClockPeriod",
                          "runClockPeriodUnit",
                          periodUnit,
                          distribution
                        )
                      }
                      compact={true}
                    />
                  </div>
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

  return (
    <div className="flex flex-col h-full">
      <div className="border-b">
        <div className="flex">
          <button
            onClick={() => setActiveTab("model")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "model"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Model
          </button>
          <button
            onClick={() => setActiveTab("output")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "output"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Output Page
          </button>
        </div>
      </div>

      {activeTab === "model" ? <ModelForm /> : <OutputForm />}
    </div>
  );
};

export default ModelEditor;
