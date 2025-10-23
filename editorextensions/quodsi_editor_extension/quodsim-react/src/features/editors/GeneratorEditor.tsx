import React from "react";
import BaseEditor from "./BaseEditor";
import {
  Duration,
  Generator,
  SimulationObjectType,
  EditorReferenceData,
  PeriodUnit,
  Distribution,
  StateListManager,
  ComponentType,
} from "@quodsi/shared";
import { Clock, Users, Timer, PlayCircle, Settings, Hash, Zap } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import StatesEditor from "./StatesEditor";
import StateModificationsEditor from "./StateModificationsEditor";


interface Props {
  generator: Generator;
  onSave: (generator: Generator) => void;
  onCancel: () => void;
  referenceData: EditorReferenceData;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
}

type GeneratorTab = "basic" | "frequency" | "start" | "states" | "events";

const GeneratorEditor: React.FC<Props> = ({
  generator,
  onSave,
  onCancel,
  referenceData,
  states,
  onStatesChange,
}) => {
  const [activeTab, setActiveTab] = React.useState<GeneratorTab>("basic");
  const entities = referenceData.entities || [];

  if (!generator?.id) {
    return <div className="text-red-500 text-sm">Invalid generator data</div>;
  }

  const handleDurationChange = (
    name: keyof Pick<
      Generator,
      "periodIntervalDuration" | "periodicStartDuration"
    >,
    periodUnit: PeriodUnit,
    distribution: Distribution
  ) => {
    // Create a new Generator instance to preserve class methods
    const updatedGenerator = new Generator(
      generator.id,
      generator.name,
      generator.activityKeyId,
      generator.entityId,
      generator.periodicOccurrences,
      {
        ...generator.periodIntervalDuration,
        ...(name === "periodIntervalDuration"
          ? {
              durationPeriodUnit: periodUnit,
              distribution,
            }
          : {}),
      },
      generator.entitiesPerCreation,
      {
        ...generator.periodicStartDuration,
        ...(name === "periodicStartDuration"
          ? {
              durationPeriodUnit: periodUnit,
              distribution,
            }
          : {}),
      },
      generator.maxEntities,
      generator.x,
      generator.y
    );

    // Preserve state modifications
    updatedGenerator.initialStateModifications = generator.initialStateModifications || [];

    onSave(updatedGenerator);
  };

  return (
    <BaseEditor
      data={{
        ...generator,
        type: SimulationObjectType.Generator,
        // Ensure all PositionedSimulationObject methods are available
        setLocation: (x: number, y: number) => generator.setLocation(x, y),
        getLocation: () => generator.getLocation(),
        hasLocation: () => generator.hasLocation(),
        clone: () => generator.clone(),
      }}
      onSave={(updatedData) => {
        // Create a new Generator instance to preserve class methods
        const updatedGenerator = new Generator(
          updatedData.id,
          updatedData.name,
          updatedData.activityKeyId,
          updatedData.entityId,
          updatedData.periodicOccurrences,
          updatedData.periodIntervalDuration,
          updatedData.entitiesPerCreation,
          updatedData.periodicStartDuration,
          updatedData.maxEntities,
          updatedData.x,
          updatedData.y
        );

        // Preserve state modifications
        updatedGenerator.initialStateModifications = updatedData.initialStateModifications || [];

        onSave(updatedGenerator);
      }}
      onCancel={onCancel}
      messageType="generatorSaved"
    >
      {(localGenerator, handleChange) => (
        <div className="space-y-2">
          {/* Tab Navigation */}
          <div className="border-b bg-gray-50">
            <div className="flex">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                title="Basic Settings"
                className={`px-3 py-2 border-b-2 ${
                  activeTab === "basic"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("frequency")}
                title="Frequency Settings"
                className={`px-3 py-2 border-b-2 ${
                  activeTab === "frequency"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Timer className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("start")}
                title="Start Configuration"
                className={`px-3 py-2 border-b-2 ${
                  activeTab === "start"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <PlayCircle className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("states")}
                title="State Management"
                className={`px-3 py-2 border-b-2 ${
                  activeTab === "states"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Hash className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("events")}
                title="Event Modifications"
                className={`px-3 py-2 border-b-2 ${
                  activeTab === "events"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Zap className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {activeTab === "basic" && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Settings className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">Basic Settings</span>
                </div>
                <div className="space-y-2">
                  {/* Name Section */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Generator Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-2 py-1.5 text-xs border rounded"
                      value={localGenerator.name}
                      onChange={handleChange}
                      placeholder="Enter generator name"
                    />
                  </div>

                  {/* Entity Selection */}
                  <div className="pt-2 border-t">
                    <div className="mb-1">
                      <div className="text-xs font-medium text-gray-700 mb-0.5">
                        Entity Template
                      </div>
                      <div className="text-xs text-gray-500">
                        Type of entity this generator creates
                      </div>
                    </div>
                    <select
                      name="entityId"
                      className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                      value={localGenerator.entityId}
                      onChange={handleChange}
                    >
                      {entities.map((entity) => (
                        <option key={entity.id} value={entity.id}>
                          {entity.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Generation Configuration */}
                  <div className="pt-2 border-t">
                    <div className="text-xs font-medium text-gray-700 mb-1">
                      Generation Configuration
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Entities Per Creation
                        </label>
                        <input
                          type="number"
                          name="entitiesPerCreation"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={localGenerator.entitiesPerCreation}
                          onChange={handleChange}
                          min="1"
                        />
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                          Per creation event
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">
                          Max Entities
                        </label>
                        <input
                          type="number"
                          name="maxEntities"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={localGenerator.maxEntities}
                          onChange={handleChange}
                          min="1"
                        />
                        <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                          Limit (999999 = ∞)
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "frequency" && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Timer className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">Frequency Settings</span>
                </div>
                <div className="space-y-2">
                  {/* Interarrival Time */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Interarrival Time
                    </label>
                    <EnhancedDurationEditor
                      periodUnit={
                        localGenerator.periodIntervalDuration.durationPeriodUnit
                      }
                      distribution={
                        localGenerator.periodIntervalDuration.distribution
                      }
                      onChange={(periodUnit, distribution) =>
                        handleDurationChange(
                          "periodIntervalDuration",
                          periodUnit,
                          distribution
                        )
                      }
                      compact={true}
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      Between creations
                    </p>
                  </div>

                  {/* Periodic Occurrences */}
                  <div className="pt-2 border-t">
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Periodic Occurrences
                    </label>
                    <input
                      type="number"
                      name="periodicOccurrences"
                      className="w-full px-2 py-1 text-xs border rounded"
                      value={localGenerator.periodicOccurrences}
                      onChange={handleChange}
                      min="0"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      Times to create (999999 = ∞)
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "start" && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <PlayCircle className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">Start Configuration</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">
                      Start Delay
                    </label>
                    <EnhancedDurationEditor
                      periodUnit={
                        localGenerator.periodicStartDuration.durationPeriodUnit
                      }
                      distribution={localGenerator.periodicStartDuration.distribution}
                      onChange={(periodUnit, distribution) =>
                        handleDurationChange(
                          "periodicStartDuration",
                          periodUnit,
                          distribution
                        )
                      }
                      compact={true}
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      Initial delay
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "states" && (
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">
                  State Definitions
                </div>
                <StatesEditor
                  states={states}
                  onStatesChange={onStatesChange}
                  defaultComponentType={ComponentType.ENTITY}
                />
              </div>
            )}

            {activeTab === "events" && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">Event Modifications</span>
                </div>
                <StateModificationsEditor
                  modifications={localGenerator.initialStateModifications || []}
                  onModificationsChange={(mods) =>
                    handleChange({
                      target: {
                        name: "initialStateModifications",
                        value: mods,
                      },
                    } as any)
                  }
                  states={states}
                  title="Initial State Modifications"
                  description="Applied to new entities"
                  filterComponentType={ComponentType.ENTITY}
                  allowCrossComponent={false}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default GeneratorEditor;
