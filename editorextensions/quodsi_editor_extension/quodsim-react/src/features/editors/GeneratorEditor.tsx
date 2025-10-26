import React, { useState, useEffect } from "react";
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
import { Clock, Users, Timer, Flag, Settings, Hash, Zap, Info } from "lucide-react";
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
  // Helper function to extract generator data from various formats
  const extractGeneratorData = (gen: any): Generator => {
    const data = gen.data || gen;
    const extractedGenerator = new Generator(
      data.id || "",
      data.name || "New Generator",
      data.activityKeyId || "",
      data.entityId || "",
      data.periodicOccurrences || 999999,
      data.periodIntervalDuration || new Duration(),
      data.entitiesPerCreation || 1,
      data.periodicStartDuration || new Duration(),
      data.maxEntities || 999999,
      data.x || 0,
      data.y || 0
    );

    // Always create new array to ensure reference changes for proper change detection
    extractedGenerator.initialStateModifications = data.initialStateModifications
      ? [...data.initialStateModifications]
      : [];

    return extractedGenerator;
  };

  // State management
  const [formData, setFormData] = useState<Generator>(() => extractGeneratorData(generator));
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<GeneratorTab>("basic");

  const entities = referenceData.entities || [];

  if (!generator?.id) {
    return <div className="text-red-500 text-sm">Invalid generator data</div>;
  }

  // Sync with generator prop changes (only when no unsaved changes and not saving)
  useEffect(() => {
    if (!hasChanges && !isSaving) {
      setFormData(extractGeneratorData(generator));
    }
  }, [generator, hasChanges, isSaving]);

  // Clear the saving flag after a short delay to allow for the new data to arrive
  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => {
        setIsSaving(false);
        setHasChanges(false);
      }, 500); // Give the parent component time to update

      return () => clearTimeout(timer);
    }
  }, [isSaving]);

  // Input change handler for basic fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedGenerator = new Generator(
        prev.id,
        name === 'name' ? value : prev.name,
        prev.activityKeyId,
        name === 'entityId' ? value : prev.entityId,
        name === 'periodicOccurrences' ? parseInt(value) || 999999 : prev.periodicOccurrences,
        prev.periodIntervalDuration,
        name === 'entitiesPerCreation' ? parseInt(value) || 1 : prev.entitiesPerCreation,
        prev.periodicStartDuration,
        name === 'maxEntities' ? parseInt(value) || 999999 : prev.maxEntities,
        prev.x,
        prev.y
      );

      // Preserve state modifications
      updatedGenerator.initialStateModifications = prev.initialStateModifications || [];

      return updatedGenerator;
    });
    setHasChanges(true);
  };

  // Duration change handler - auto-saves immediately (preserves existing UX)
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
      formData.id,
      formData.name,
      formData.activityKeyId,
      formData.entityId,
      formData.periodicOccurrences,
      {
        ...formData.periodIntervalDuration,
        ...(name === "periodIntervalDuration"
          ? {
              durationPeriodUnit: periodUnit,
              distribution,
            }
          : {}),
      },
      formData.entitiesPerCreation,
      {
        ...formData.periodicStartDuration,
        ...(name === "periodicStartDuration"
          ? {
              durationPeriodUnit: periodUnit,
              distribution,
            }
          : {}),
      },
      formData.maxEntities,
      formData.x,
      formData.y
    );

    // Preserve state modifications
    updatedGenerator.initialStateModifications = formData.initialStateModifications || [];

    // Auto-save immediately
    onSave(updatedGenerator);
    // Update local state to match
    setFormData(updatedGenerator);
    setIsSaving(true);
  };

  // State modifications change handler - auto-saves immediately
  const handleStateModificationsChange = (mods: any[]) => {
    const updatedGenerator = new Generator(
      formData.id,
      formData.name,
      formData.activityKeyId,
      formData.entityId,
      formData.periodicOccurrences,
      formData.periodIntervalDuration,
      formData.entitiesPerCreation,
      formData.periodicStartDuration,
      formData.maxEntities,
      formData.x,
      formData.y
    );

    // Update state modifications
    updatedGenerator.initialStateModifications = mods;

    // Auto-save immediately
    onSave(updatedGenerator);
    // Update local state to match
    setFormData(updatedGenerator);
    setIsSaving(true);
  };

  // Save handler
  const handleSave = () => {
    // Create a new Generator instance with updated data
    const updatedGenerator = new Generator(
      formData.id,
      formData.name,
      formData.activityKeyId,
      formData.entityId,
      formData.periodicOccurrences,
      formData.periodIntervalDuration,
      formData.entitiesPerCreation,
      formData.periodicStartDuration,
      formData.maxEntities,
      formData.x,
      formData.y
    );

    // Preserve state modifications
    updatedGenerator.initialStateModifications = formData.initialStateModifications || [];

    onSave(updatedGenerator);
    setIsSaving(true); // Will be cleared by useEffect after 500ms
  };

  // Cancel handler - resets form without closing the editor
  const handleCancel = () => {
    setFormData(extractGeneratorData(generator));
    setHasChanges(false);
  };

  return (
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
            <Flag className="w-4 h-4" />
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
          <button
            type="button"
            onClick={() => setActiveTab("states")}
            title="State Definitions"
            className={`px-3 py-2 border-b-2 ${
              activeTab === "states"
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            <Hash className="w-4 h-4" />
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
              <span title="Configure generator name, entity, and how many entities are created per event">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
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
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Enter generator name"
                />
              </div>

              {/* Entity Selection */}
              <div className="pt-2 border-t">
                <div className="mb-1">
                  <div className="text-xs font-medium text-gray-700 mb-0.5">
                    Entity
                  </div>
                  <div className="text-xs text-gray-500">
                    Type of entity this generator creates
                  </div>
                </div>
                <select
                  name="entityId"
                  className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                  value={formData.entityId}
                  onChange={handleInputChange}
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
                      value={formData.entitiesPerCreation}
                      onChange={handleInputChange}
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
                      value={formData.maxEntities}
                      onChange={handleInputChange}
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
              <span title="Set the time interval between entity creation events and total number of occurrences">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <div className="space-y-2">
              {/* Interarrival Time */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Interarrival Time
                </label>
                <EnhancedDurationEditor
                  periodUnit={
                    formData.periodIntervalDuration.durationPeriodUnit
                  }
                  distribution={
                    formData.periodIntervalDuration.distribution
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
                  value={formData.periodicOccurrences}
                  onChange={handleInputChange}
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
              <Flag className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Start Configuration</span>
              <span title="Define when the generator begins creating entities (initial delay)">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Start Delay
                </label>
                <EnhancedDurationEditor
                  periodUnit={
                    formData.periodicStartDuration.durationPeriodUnit
                  }
                  distribution={formData.periodicStartDuration.distribution}
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

        {activeTab === "events" && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Zap className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Event Modifications</span>
              <span title="Set initial state values for entities when they are created">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <StateModificationsEditor
              modifications={formData.initialStateModifications || []}
              onModificationsChange={handleStateModificationsChange}
              states={states}
              title="Initial State Modifications"
              description="Applied to new entities"
              filterComponentType={ComponentType.ENTITY}
              allowCrossComponent={false}
            />
          </div>
        )}

        {activeTab === "states" && (
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Hash className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">State Definitions</span>
              <span title="Define custom state variables for entities created by this generator">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <StatesEditor
              states={states}
              onStatesChange={onStatesChange}
              defaultComponentType={ComponentType.ENTITY}
            />
          </div>
        )}
      </div>

      {/* Save/Cancel Buttons - Only show for Generator tabs (States tab auto-saves) */}
      {activeTab !== "states" && (
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges}
            className={`px-3 py-1.5 text-xs rounded ${
              hasChanges
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(GeneratorEditor);
