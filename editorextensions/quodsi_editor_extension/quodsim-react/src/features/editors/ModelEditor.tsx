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
  StateListManager,
  ComponentType,
} from "@quodsi/shared";
import { Settings, Clock, Hash, Package, PlaySquare } from "lucide-react";
import BaseEditor from "./BaseEditor";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import StatesEditor from "./StatesEditor";
import ScenarioEditor from "./ScenarioEditor";
import { ResourceRequirementsManager } from "./ResourceRequirementsManager";
import { ResourceRequirementModal } from "./ResourceRequirementModal";
import { convertStructureToRootClauses, convertRootClausesToStructure, TeamStructure } from "../../utils/resourceRequirementConverter";
import { useMessaging } from "../../messaging/MessageProvider";

import { EditorReferenceData, ResourceRequirement } from "@quodsi/shared";

interface Props {
  model: Model;
  onSave: (model: Model) => void;
  onCancel: () => void;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
  referenceData?: EditorReferenceData;
  resourceRequirements?: any[];
}

type EditorTab = "basic" | "states" | "requirements" | "scenarios";

const ModelEditor: React.FC<Props> = ({ model, onSave, onCancel, states, onStatesChange, referenceData, resourceRequirements }) => {
  const [activeTab, setActiveTab] = useState<EditorTab>("basic");
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<{ id: string; name: string; structure: TeamStructure } | null>(null);
  const { selection } = useMessaging();

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
      warmupDateTime: data.warmupDateTime || null,
      startDateTime: data.startDateTime || null,
      finishDateTime: data.finishDateTime || null,
    };
  };

  // Create local state with extracted model data
  const [localModel, setLocalModel] = useState<Model>(extractModelData(model));

  // Handlers
  const handleSave = (updatedModel: Model) => {
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
      warmupDateTime: updatedModel.warmupDateTime || null,
      startDateTime: updatedModel.startDateTime || null,
      finishDateTime: updatedModel.finishDateTime || null,
    };

    // Update our local state immediately with the new model data
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
    <BaseEditor
      data={localModel}
      onSave={handleSave}
      onCancel={onCancel}
      messageType="modelSaved"
    >
      {(localModel, handleChange) => (
        <div className="space-y-2">
          {/* Basic Settings */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Settings className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Basic Settings</span>
            </div>
            <div className="space-y-1">
              <input
                type="text"
                name="name"
                className="w-full px-2 py-1 text-xs border rounded"
                value={localModel.name}
                placeholder="Model Name"
                onChange={handleChange}
              />
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="block text-xs text-gray-600">Reps</label>
                  <input
                    type="number"
                    name="reps"
                    className="w-full px-1 py-0.5 text-xs border rounded"
                    value={localModel.reps}
                    onChange={handleChange}
                    min="1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Time Settings */}
          <div>
            <div className="flex items-center gap-1 mb-1">
              <Clock className="w-3 h-3 text-blue-600" />
              <span className="text-xs font-medium text-gray-700">Time Settings</span>
            </div>

            <div className="space-y-1">
              <select
                name="simulationTimeType"
                className="w-full px-2 py-1 text-xs border rounded bg-white"
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
                className="w-full px-2 py-1 text-xs border rounded bg-white"
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
              <div className="space-y-1 mt-1">
                <EnhancedDurationEditor
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
                <EnhancedDurationEditor
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
            )}

            {localModel.simulationTimeType === SimulationTimeType.CalendarDate && (
              <div className="space-y-1 mt-1">
                <div>
                  <label className="block text-xs text-gray-600">Start Date</label>
                  <input
                    type="datetime-local"
                    name="startDateTime"
                    className="w-full px-1 py-0.5 text-xs border rounded"
                    value={
                      localModel.startDateTime?.toISOString().slice(0, 16) || ""
                    }
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Finish Date</label>
                  <input
                    type="datetime-local"
                    name="finishDateTime"
                    className="w-full px-1 py-0.5 text-xs border rounded"
                    value={
                      localModel.finishDateTime?.toISOString().slice(0, 16) || ""
                    }
                    onChange={handleChange}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Warmup Date</label>
                  <input
                    type="datetime-local"
                    name="warmupDateTime"
                    className="w-full px-1 py-0.5 text-xs border rounded"
                    value={
                      localModel.warmupDateTime?.toISOString().slice(0, 16) || ""
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
    <div className="flex flex-col bg-white">
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
          onClick={() => setActiveTab("requirements")}
          title="Resource Requirements"
          className={`px-3 py-2 border-b-2 ${
            activeTab === "requirements"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Package className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("scenarios")}
          title="Simulation Scenarios"
          className={`px-3 py-2 border-b-2 ${
            activeTab === "scenarios"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <PlaySquare className="w-4 h-4" />
        </button>
      </div>
    </div>

      {activeTab === "basic" && <ModelForm />}
      {activeTab === "states" && (
        <StatesEditor
          states={states}
          onStatesChange={onStatesChange}
          defaultComponentType={ComponentType.MODEL}
        />
      )}
      {activeTab === "requirements" && (
        <ResourceRequirementsManager
          requirements={resourceRequirements || []}
          availableResources={referenceData?.resources || []}
          onAdd={() => {
            setEditingRequirement(null);
            setRequirementModalOpen(true);
          }}
          onEdit={(req) => {
            const structure = convertRootClausesToStructure(req.rootClauses);
            setEditingRequirement({ id: req.id, name: req.name, structure });
            setRequirementModalOpen(true);
          }}
          onDelete={(id) => {
            // Note: Actual deletion should be handled through messaging
            console.log('Delete requirement:', id);
            // TODO: Send delete message to extension
          }}
          getUsageCount={(id) => {
            // TODO: Calculate actual usage count from activities
            return 0;
          }}
        />
      )}
      {activeTab === "scenarios" && (
        <ScenarioEditor
          documentId={selection.documentContext?.documentId}
        />
      )}

      {/* Resource Requirement Modal */}
      <ResourceRequirementModal
        isOpen={requirementModalOpen}
        onClose={() => {
          setRequirementModalOpen(false);
          setEditingRequirement(null);
        }}
        onSave={(data) => {
          const rootClauses = convertStructureToRootClauses(data.structure);
          if (editingRequirement) {
            // Update existing requirement
            const updated = new ResourceRequirement(editingRequirement.id, data.name, rootClauses);
            // TODO: Send update message to extension
            console.log('Update requirement:', updated);
          } else {
            // Create new requirement
            const newReq = new ResourceRequirement(`req-${Date.now()}`, data.name, rootClauses);
            // TODO: Send create message to extension
            console.log('Create requirement:', newReq);
          }
          setRequirementModalOpen(false);
          setEditingRequirement(null);
        }}
        editingRequirement={editingRequirement}
        availableResources={referenceData?.resources || []}
      />
    </div>
  );
};

export default ModelEditor;
