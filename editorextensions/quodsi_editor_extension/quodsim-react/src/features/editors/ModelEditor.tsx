import React, { useState, useEffect } from "react";
import {
  Model,
  PeriodUnit,
  SimulationTimeType,
  SimulationObjectType,
  StateListManager,
  ComponentType,
  EnvelopeMessageType,
  EnvelopeBase,
} from "@quodsi/shared";
import { Settings, Hash, PlaySquare, FileJson, Info, Users } from "lucide-react";
import StatesEditor from "./StatesEditor";
import { AccordionSection } from "../shared/AccordionSection";
import ScenarioEditor from "./ScenarioEditor";
import { ResourceRequirementsManager } from "./ResourceRequirementsManager";
import { ResourceRequirementModal } from "./ResourceRequirementModal";
import { convertStructureToRootClauses, convertRootClausesToStructure, TeamStructure } from "../../utils/resourceRequirementConverter";
import { useMessaging } from "../../messaging/MessageProvider";
import { ModelDefinitionViewer } from "../modelPanel/ModelDefinitionViewer";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";

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
  const isDevelopment = process.env.NODE_ENV === 'development';

  const [activeTab, setActiveTab] = useState<EditorTab>("basic");
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<{ id: string; name: string; structure: TeamStructure } | null>(null);
  const [isModelViewerOpen, setIsModelViewerOpen] = useState(false);
  const [modelJson, setModelJson] = useState<any>(null);
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false); // Start collapsed
  const { selection } = useMessaging();
  const { requestModelJson, updateResourceRequirements } = useModelOpsSender();

  // Listen for MODEL_JSON_RESPONSE
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase;

      // Check if this is a MODEL_JSON_RESPONSE message
      if (msg?.type === EnvelopeMessageType.MODEL_JSON_RESPONSE) {
        const data = msg.data as {
          success: boolean;
          modelJson?: any;
          error?: string;
        };

        if (data.success && data.modelJson) {
          setModelJson(data.modelJson);
          setIsModelViewerOpen(true);
        } else {
          console.error('[ModelEditor] Failed to get model JSON:', data.error);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Helper function to ensure all model properties are present
  const extractModelData = (mod: any): Model => {
    const data = (mod as any).data || mod;

    const result = {
      id: data.id || "",
      name: data.name || "New Model",
      type: SimulationObjectType.Model,
      reps: data.reps || 1,
      seed: data.seed || 0,
      simulationTimeType: data.simulationTimeType || SimulationTimeType.Clock,
      oneClockUnit: data.oneClockUnit || PeriodUnit.HOURS,
      warmupClockPeriod: data.warmupClockPeriod || 0,
      warmupClockPeriodUnit: data.warmupClockPeriodUnit || PeriodUnit.HOURS,
      runClockPeriod: data.runClockPeriod || 0,
      runClockPeriodUnit: data.runClockPeriodUnit || PeriodUnit.HOURS,
      warmupDateTime: data.warmupDateTime || null,
      startDateTime: data.startDateTime || null,
      finishDateTime: data.finishDateTime || null,
    };

    return result;
  };

  // Helper function to identify auto-generated requirements (ID matches resource ID)
  const isAutoRequirement = (req: ResourceRequirement): boolean => {
    return referenceData?.resources?.some(r => r.id === req.id) || false;
  };

  // Direct form state management
  const [formData, setFormData] = useState<Model>(() => {
    const initialData = extractModelData(model);
    if (isDevelopment) {
      console.log('[ModelEditor] useState INITIALIZATION:', {
        initialData,
        runClockPeriod: initialData.runClockPeriod
      });
    }
    return initialData;
  });
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with model prop changes (only when no unsaved changes and not saving)
  useEffect(() => {
    if (isDevelopment) {
      console.log('[ModelEditor] useEffect TRIGGERED:', {
        hasChanges,
        isSaving,
        modelId: model?.id,
        currentFormDataId: formData.id,
        modelRunClockPeriod: model?.runClockPeriod || ((model as any)?.data?.runClockPeriod),
        formDataRunClockPeriod: formData.runClockPeriod,
        willUpdate: !hasChanges && !isSaving,
        modelPropType: typeof model,
        modelPropKeys: model ? Object.keys(model) : []
      });
    }

    if (!hasChanges && !isSaving) {
      const newFormData = extractModelData(model);
      setFormData(newFormData);

      if (isDevelopment) {
        console.log('[ModelEditor] useEffect UPDATED formData:', {
          newFormData,
          runClockPeriod: newFormData.runClockPeriod
        });
      }
    } else {
      if (isDevelopment) {
        console.log('[ModelEditor] useEffect SKIPPED', {
          hasChanges,
          isSaving,
          reason: hasChanges ? 'hasChanges=true' : 'isSaving=true'
        });
      }
    }
  }, [model, hasChanges, isSaving, isDevelopment]);

  // Listen for save confirmation and clear isSaving flag immediately
  useEffect(() => {
    const handleSaveConfirmation = (event: MessageEvent) => {
      const msg = event.data as EnvelopeBase;

      // Check if this is an ELEMENT_UPDATE_RESULT message
      if (msg?.type === EnvelopeMessageType.ELEMENT_UPDATE_RESULT) {
        const data = msg.data as {
          success: boolean;
          elementId: string;
          errorMessage?: string;
        };

        if (data.success && isSaving) {
          if (isDevelopment) {
            console.log('[ModelEditor] Save confirmed, clearing isSaving flag');
          }
          // Clear flags immediately when save is confirmed
          setIsSaving(false);
          setHasChanges(false);
        } else if (!data.success) {
          if (isDevelopment) {
            console.error('[ModelEditor] Save failed:', data.errorMessage);
          }
          // On error, just clear isSaving but keep hasChanges so user can retry
          setIsSaving(false);
        }
      }
    };

    window.addEventListener('message', handleSaveConfirmation);
    return () => window.removeEventListener('message', handleSaveConfirmation);
  }, [isSaving, isDevelopment]);

  // Handle form input changes with type conversion
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Convert values based on input type
    let convertedValue: any = value;
    if (type === 'number') {
      const numValue = parseFloat(value);
      convertedValue = isNaN(numValue) ? 0 : numValue;
    } else if (type === 'datetime-local') {
      convertedValue = value ? new Date(value) : null;
    }

    if (isDevelopment) {
      console.log('[ModelEditor] handleChange:', {
        name,
        value,
        type,
        convertedValue,
        previousValue: formData[name as keyof Model]
      });
    }

    setFormData(prev => ({
      ...prev,
      [name]: convertedValue
    }));
    setHasChanges(true);
  };

  // Handle save
  const handleSave = () => {
    const modelToSave: Model = {
      ...formData,
      type: "Model" as any,
      // Ensure all properties have defaults
      reps: formData.reps || 1,
      seed: formData.seed || 12345,
      simulationTimeType: formData.simulationTimeType || SimulationTimeType.Clock,
      oneClockUnit: formData.oneClockUnit || PeriodUnit.HOURS,
      warmupClockPeriod: formData.warmupClockPeriod || 0,
      warmupClockPeriodUnit: formData.warmupClockPeriodUnit || PeriodUnit.HOURS,
      runClockPeriod: formData.runClockPeriod || 0,
      runClockPeriodUnit: formData.runClockPeriodUnit || PeriodUnit.HOURS,
      warmupDateTime: formData.warmupDateTime || null,
      startDateTime: formData.startDateTime || null,
      finishDateTime: formData.finishDateTime || null,
    };

    if (isDevelopment) {
      console.log('[ModelEditor] handleSave CALLED:', {
        formData,
        modelToSave,
        runClockPeriod: modelToSave.runClockPeriod,
        hasChanges
      });
    }

    onSave(modelToSave);
    setIsSaving(true); // Will be cleared by useEffect after 500ms

    if (isDevelopment) {
      console.log('[ModelEditor] handleSave COMPLETED - isSaving set to true');
    }
  };

  // Handle cancel
  const handleCancel = () => {
    setFormData(extractModelData(model));
    setHasChanges(false);
    onCancel();
  };

  const handleViewModelClick = () => {
    // Request model JSON from extension
    requestModelJson(selection.documentContext?.documentId || '');
  };

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
            title="State Definitions"
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
          <Users className="w-4 h-4" />
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

      {activeTab === "basic" && (
        <>
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="w-full">
            <div className="space-y-2">
                  <div className="flex items-center gap-1 mb-1 p-2">
                    <Settings className="w-3 h-3 text-blue-600" />
                    <span className="text-xs font-medium text-gray-700">Basic Settings</span>
                    <span title="Configure model name, simulation time settings, and runtime parameters">
                      <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    </span>
                  </div>
                  {/* Model Name - Always Visible WITH LABEL */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Model Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-2 py-1 text-xs border rounded"
                      value={formData.name}
                      placeholder="Enter model name"
                      onChange={handleChange}
                    />
                </div>

                {/* Run Time - Conditional: Only in Clock mode */}
                {formData.simulationTimeType === SimulationTimeType.Clock && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Run Time
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="number"
                        name="runClockPeriod"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={formData.runClockPeriod || 0}
                        onChange={handleChange}
                        min="0"
                      />
                      <select
                        name="runClockPeriodUnit"
                        className="w-full px-2 py-1 text-xs border rounded bg-white"
                        value={formData.runClockPeriodUnit || PeriodUnit.HOURS}
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

                {/* Advanced Settings - Accordion */}
                <AccordionSection
                  title="Advanced Settings"
                  isExpanded={isAdvancedExpanded}
                  onToggle={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                >
                  <div className="space-y-2">
                    {/* Replications */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Replications
                      </label>
                      <input
                        type="number"
                        name="reps"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={formData.reps}
                        onChange={handleChange}
                        min="1"
                      />
                    </div>

                    {/* Time Mode */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Time Mode
                      </label>
                      <select
                        name="simulationTimeType"
                        className="w-full px-2 py-1 text-xs border rounded bg-white"
                        value={formData.simulationTimeType}
                        onChange={handleChange}
                      >
                        {Object.values(SimulationTimeType).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clock Mode Fields - Conditional */}
                    {formData.simulationTimeType === SimulationTimeType.Clock && (
                      <>
                        {/* Clock Unit */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Clock Unit
                          </label>
                          <select
                            name="oneClockUnit"
                            className="w-full px-2 py-1 text-xs border rounded bg-white"
                            value={formData.oneClockUnit}
                            onChange={handleChange}
                          >
                            {Object.values(PeriodUnit).map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Warmup Time - Simple number + dropdown */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Warmup Time
                          </label>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="number"
                              name="warmupClockPeriod"
                              className="w-full px-2 py-1 text-xs border rounded"
                              value={formData.warmupClockPeriod || 0}
                              onChange={handleChange}
                              min="0"
                            />
                            <select
                              name="warmupClockPeriodUnit"
                              className="w-full px-2 py-1 text-xs border rounded bg-white"
                              value={formData.warmupClockPeriodUnit || PeriodUnit.HOURS}
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
                      </>
                    )}

                    {/* Calendar Date Mode Fields - Conditional */}
                    {formData.simulationTimeType === SimulationTimeType.CalendarDate && (
                      <>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Start Date
                          </label>
                          <input
                            type="datetime-local"
                            name="startDateTime"
                            className="w-full px-2 py-1 text-xs border rounded"
                            value={formData.startDateTime?.toISOString().slice(0, 16) || ""}
                            onChange={handleChange}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Finish Date
                          </label>
                          <input
                            type="datetime-local"
                            name="finishDateTime"
                            className="w-full px-2 py-1 text-xs border rounded"
                            value={formData.finishDateTime?.toISOString().slice(0, 16) || ""}
                            onChange={handleChange}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Warmup Date
                          </label>
                          <input
                            type="datetime-local"
                            name="warmupDateTime"
                            className="w-full px-2 py-1 text-xs border rounded"
                            value={formData.warmupDateTime?.toISOString().slice(0, 16) || ""}
                            onChange={handleChange}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </AccordionSection>
              </div>

              {/* Save/Cancel Buttons */}
              <div className="flex space-x-2 mt-2 justify-end">
                <button
                  type="submit"
                  className="px-2 py-1 bg-blue-600 text-white rounded shadow-sm hover:bg-blue-700 transition-colors text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                  disabled={!hasChanges}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-2 py-1 bg-white text-gray-700 border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition-colors text-xs font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  Cancel
                </button>
              </div>
            </form>
        <button
          type="button"
          className="w-full text-xs px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-600 rounded transition-colors flex items-center justify-center gap-1 mt-2"
          onClick={handleViewModelClick}
          title="View Model Definition as JSON"
        >
          <FileJson className="w-3 h-3" />
          View Model JSON
        </button>
        </>
      )}
      {activeTab === "states" && (
        <div>
          <div className="flex items-center gap-1 mb-1 p-2">
            <Hash className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">State Definitions</span>
            <span title="Define model-level state variables that can be accessed and modified throughout the simulation">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </div>
          <StatesEditor
            states={states}
            onStatesChange={onStatesChange}
            defaultComponentType={ComponentType.MODEL}
          />
        </div>
      )}
      {activeTab === "requirements" && (
        <div>
          <div className="flex items-center gap-1 mb-1 p-2">
            <Users className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">Resource Requirements</span>
            <span title="Create reusable resource requirement templates that define which resources are needed for activities">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </div>
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
              // Filter out the deleted requirement
              const afterDelete = (resourceRequirements || []).filter(req => req.id !== id);

              // IMPORTANT: Only send custom requirements to storage (filter out auto-requirements)
              // Auto-requirements (ID matches resource ID) are auto-generated by the extension
              const customOnly = afterDelete.filter(req => !isAutoRequirement(req));

              // Serialize the custom-only array
              const serialized = customOnly.map(req => ({
                id: req.id,
                name: req.name,
                type: SimulationObjectType.ResourceRequirement,
                rootClauses: req.rootClauses
              }));

              if (isDevelopment) {
                console.log('[ModelEditor] Deleting requirement:', id);
                console.log('[ModelEditor] Filtered to custom-only requirements:', {
                  afterDeleteCount: afterDelete.length,
                  customOnlyCount: customOnly.length,
                  serialized
                });
              }

              // Send custom-only array to extension
              updateResourceRequirements(serialized);
            }}
            getUsageCount={(id) => {
              // Calculate how many operation steps use this requirement
              const activities = referenceData?.activities || [];
              let count = 0;
              for (const activity of activities) {
                const reqIds = activity.operationStepRequirementIds || [];
                count += reqIds.filter(reqId => reqId === id).length;
              }
              return count;
            }}
          />
        </div>
      )}
      {activeTab === "scenarios" && (
        <div>
          <div className="flex items-center gap-1 mb-1 p-2">
            <PlaySquare className="w-3 h-3 text-blue-600" />
            <span className="text-xs font-medium text-gray-700">Simulation Scenarios</span>
            <span title="Configure and manage simulation scenarios with different parameter sets and run configurations">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </div>
          <ScenarioEditor
            documentId={selection.documentContext?.documentId}
          />
        </div>
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

          // Create the updated/new requirement
          let updatedRequirement: ResourceRequirement;
          let updatedList: ResourceRequirement[];

          if (editingRequirement) {
            // Update existing requirement (could be editing auto or custom)
            updatedRequirement = new ResourceRequirement(editingRequirement.id, data.name, rootClauses);
            updatedList = (resourceRequirements || []).map(req =>
              req.id === editingRequirement.id ? updatedRequirement : req
            );
            if (isDevelopment) {
              console.log('[ModelEditor] Updating existing requirement:', updatedRequirement);
            }
          } else {
            // Create new requirement (always custom)
            updatedRequirement = new ResourceRequirement(`req-${Date.now()}`, data.name, rootClauses);
            updatedList = [...(resourceRequirements || []), updatedRequirement];
            if (isDevelopment) {
              console.log('[ModelEditor] Creating new requirement:', updatedRequirement);
            }
          }

          // IMPORTANT: Only send custom requirements to storage (filter out unmodified auto-requirements)
          // - New requirements (ID starts with "req-") are always custom
          // - Edited requirements (even if ID matches resource) become custom overrides
          // - Unmodified auto-requirements (ID matches resource, wasn't just edited) are filtered out
          const customOnly = updatedList.filter(req =>
            !isAutoRequirement(req) || req.id === updatedRequirement.id
          );

          // Serialize the custom-only array
          const serialized = customOnly.map(req => ({
            id: req.id,
            name: req.name,
            type: SimulationObjectType.ResourceRequirement,
            rootClauses: req.rootClauses
          }));

          if (isDevelopment) {
            console.log('[ModelEditor] Filtered to custom-only requirements:', {
              updatedListCount: updatedList.length,
              customOnlyCount: customOnly.length,
              serialized
            });
          }

          // Send custom-only array to extension
          updateResourceRequirements(serialized);

          // Close modal
          setRequirementModalOpen(false);
          setEditingRequirement(null);
        }}
        editingRequirement={editingRequirement}
        availableResources={referenceData?.resources || []}
      />

      {/* Model Definition Viewer Modal */}
      {isModelViewerOpen && modelJson && (
        <ModelDefinitionViewer
          modelJson={modelJson}
          onClose={() => setIsModelViewerOpen(false)}
        />
      )}
    </div>
  );
};

export default React.memo(ModelEditor);
