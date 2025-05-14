import React, { useState } from "react";
import {
  Model,
  PeriodUnit,
  SimulationTimeType,
  SimulationObjectType,
  Duration,
  Distribution,
  ConstantDistribution,
  DistributionType,
} from "@quodsi/shared";
import { Settings, Clock } from "lucide-react";

import BaseEditorOld from "./BaseEditorOld";
import OutputFormOld from "./OutputFormOld";
import { EnhancedDurationEditorOld } from "./EnhancedDurationEditorOld";

interface Props {
  model: Model;
  onSave: (model: Model) => void;
  onCancel: () => void;
}

type EditorTab = "model" | "output";

const ModelEditorOld: React.FC<Props> = ({ model, onSave, onCancel }) => {
  const [activeTab, setActiveTab] = useState<EditorTab>("model");

  // Helper function to ensure all model properties are present
  const extractModelData = (mod: any): Model => {
    const data = mod.data || mod;
    return {
      id: data.id || "",
      name: data.name || "New Model",
      type: SimulationObjectType.Model,
      reps: data.reps || 1,
      seed: data.seed || 0,
      simulationTimeType: data.simulationTimeType || SimulationTimeType.Clock,
      oneClockUnit: data.oneClockUnit || PeriodUnit.MINUTES,
      warmupClockPeriod: data.warmupClockPeriod || 0,
      warmupClockPeriodUnit: data.warmupClockPeriodUnit || PeriodUnit.MINUTES,
      runClockPeriod: data.runClockPeriod || 0,
      runClockPeriodUnit: data.runClockPeriodUnit || PeriodUnit.MINUTES,
      // Adding missing properties
      forecastDays: data.forecastDays || 30,
      warmupDateTime: data.warmupDateTime || null,
      startDateTime: data.startDateTime || null,
      finishDateTime: data.finishDateTime || null,
    };
  };

  // Create local state with extracted model data
  const [localModel, setLocalModel] = useState<Model>(extractModelData(model));

  // Handlers
  const handleSave = (updatedModel: Model) => {
    console.log("ModelEditor - Before Save:", updatedModel);
    console.log("ModelEditor - Type value:", updatedModel.type);
    console.log(
      "ModelEditor - Type === SimulationObjectType.Model:",
      updatedModel.type === SimulationObjectType.Model
    );
    console.log(
      "ModelEditor - Type is string 'Model':",
      updatedModel.type === "Model"
    );
    console.log("ModelEditor - Type toString():", String(updatedModel.type));

    const modelToSave: Model = {
      ...updatedModel,
      type: "Model" as any, // Use string 'Model' instead of enum to match what ModelPanel.ts expects
      // Ensure all properties are included
      reps: updatedModel.reps || 1,
      seed: updatedModel.seed || 12345,
      simulationTimeType:
        updatedModel.simulationTimeType || SimulationTimeType.Clock,
      oneClockUnit: updatedModel.oneClockUnit || PeriodUnit.MINUTES,
      warmupClockPeriod: updatedModel.warmupClockPeriod || 0,
      warmupClockPeriodUnit:
        updatedModel.warmupClockPeriodUnit || PeriodUnit.MINUTES,
      runClockPeriod: updatedModel.runClockPeriod || 0,
      runClockPeriodUnit: updatedModel.runClockPeriodUnit || PeriodUnit.MINUTES,
      // Add missing properties
      forecastDays: updatedModel.forecastDays || 30,
      warmupDateTime: updatedModel.warmupDateTime || null,
      startDateTime: updatedModel.startDateTime || null,
      finishDateTime: updatedModel.finishDateTime || null,
    };

    console.log("ModelEditor - After Save Transform:", modelToSave);

    // Update our local state immediately with the new model data
    // This ensures our UI reflects the changes even if we don't get a refresh from the extension
    setLocalModel(modelToSave);

    // Then send to parent
    onSave(modelToSave);
  };

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
    distribution: Distribution,
    localData: Model,
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void
  ) => {
    const value =
      distribution.distributionType === "constant"
        ? (distribution.parameters as { value: number }).value
        : 0;

    // Update through handleChange so BaseEditor state is updated properly
    handleChange(createSyntheticEvent(periodField, value));
    handleChange(createSyntheticEvent(periodUnitField, periodUnit));
  };

  const ModelForm = () => (
    <BaseEditorOld
      data={localModel}
      onSave={handleSave}
      onCancel={onCancel}
      messageType="modelSaved"
    >
      {(localModel, handleChange) => (
        <div className="space-y-4 p-3">
          {/* Basic Settings */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-2">
              <Settings className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Basic Settings
              </span>
            </div>
            <input
              type="text"
              name="name"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              value={localModel.name}
              placeholder="Model Name"
              onChange={handleChange}
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 font-medium mb-1">
                  Reps
                </label>
                <input
                  type="number"
                  name="reps"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  value={localModel.reps}
                  onChange={handleChange}
                  min="1"
                />
              </div>
              {/* Seed field removed as requested */}
            </div>
          </div>

          {/* Time Settings */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">
                Time Settings
              </span>
            </div>

            <div className="space-y-3">
              <select
                name="simulationTimeType"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
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
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none bg-white"
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
                    <EnhancedDurationEditorOld
                      label="Warmup Time"
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
                          distribution,
                          localModel,
                          handleChange
                        )
                      }
                      compact={true}
                      allowedDistributionTypes={[DistributionType.CONSTANT]}
                    />
                  </div>
                  <div>
                    <EnhancedDurationEditorOld
                      label="Run Time"
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
                          distribution,
                          localModel,
                          handleChange
                        )
                      }
                      compact={true}
                      allowedDistributionTypes={[DistributionType.CONSTANT]}
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
    </BaseEditorOld>
  );

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="border-b bg-gray-50">
        <div className="flex">
          <button
            onClick={() => setActiveTab("model")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "model"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            }`}
          >
            Model
          </button>
          <button
            onClick={() => setActiveTab("output")}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === "output"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
            }`}
          >
            Output Page
          </button>
        </div>
      </div>

      {activeTab === "model" ? <ModelForm /> : <OutputFormOld />}
    </div>
  );
};

export default ModelEditorOld;
