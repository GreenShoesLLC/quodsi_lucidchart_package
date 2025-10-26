import React, { useState, useEffect } from "react";
import { Settings, Plus, Layers, DollarSign, Hash, ArrowRightLeft, Zap, Info } from "lucide-react";
import {
  Activity,
  OperationStep,
  PeriodUnit,
  SimulationObjectType,
  createOperationStep,
  ConstantDistribution,
  EditorReferenceData,
  Duration,
  ConnectType,
  ActivityFinancialProperties,
  StateListManager,
  ComponentType,
  Connector,
} from "@quodsi/shared";
import { OperationStepEditor } from "./OperationStepEditor";
import StatesEditor from "./StatesEditor";
import StateModificationsEditor from "./StateModificationsEditor";
import { ResourceRequirementModal } from "./ResourceRequirementModal";
import { RoutingConfigurationContent } from "./RoutingConfigurationContent";
import { convertStructureToRootClauses, convertRootClausesToStructure, TeamStructure } from "../../utils/resourceRequirementConverter";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";


// Main Activity Editor Component
interface ActivityEditorProps {
  activity: any;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
  referenceData?: EditorReferenceData;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
  outgoingConnectors?: Connector[];
}

type ActivityTab = "basic" | "opsteps" | "financial" | "connectors" | "states" | "events";

const ActivityEditor: React.FC<ActivityEditorProps> = ({
  activity,
  onSave,
  onCancel,
  referenceData,
  states,
  onStatesChange,
  outgoingConnectors = [],
}) => {
  const [activeTab, setActiveTab] = useState<ActivityTab>("basic");
  const [requirementModalOpen, setRequirementModalOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState<{ id: string; name: string; structure: TeamStructure } | null>(null);

  // Get message sender for updating resource requirements
  const { updateResourceRequirements } = useModelOpsSender();

  // Helper functions
  const bufferToDisplay = (value: number | null | undefined): number =>
    value === null || value === undefined ? 999999 : value;

  const displayToBuffer = (value: number): number =>
    value >= 999999 ? Infinity : value;

  const extractActivityData = (act: any): Activity => {
    // Handle completely missing data case
    if (!act) {
      const activity = new Activity(
        "", // Empty ID
        "New Activity",
        1, // Default capacity
        bufferToDisplay(null),
        bufferToDisplay(null),
        [],
        0,
        0
      );
      activity.connectType = ConnectType.Probability; // Set default
      return activity;
    }

    // Extract data safely
    const data = act.data || act;
    const id = data.id || act.id || "";

    const activity = new Activity(
      id,
      data.name || "New Activity",
      data.capacity || 1,
      bufferToDisplay(data.inputBufferCapacity),
      bufferToDisplay(data.outputBufferCapacity),
      data.operationSteps || [],
      data.x || 0,
      data.y || 0
    );

    // Preserve connectType if it exists, otherwise use default
    activity.connectType = data.connectType || ConnectType.Probability;

    // Initialize financialProperties if it doesn't exist
    activity.financialProperties = data.financialProperties
      ? ActivityFinancialProperties.fromJSON(data.financialProperties)
      : new ActivityFinancialProperties();

    // Always create new arrays to ensure reference changes for proper change detection
    activity.preProcessingStateModifications = data.preProcessingStateModifications
      ? [...data.preProcessingStateModifications]
      : [];
    activity.postProcessingStateModifications = data.postProcessingStateModifications
      ? [...data.postProcessingStateModifications]
      : [];

    return activity;
  };

  // State management for BaseEditor replacement
  const [formData, setFormData] = useState<Activity>(() => extractActivityData(activity));
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with activity prop changes (only when no unsaved changes and not saving)
  useEffect(() => {
    if (!hasChanges && !isSaving) {
      setFormData(extractActivityData(activity));
    }
  }, [activity, hasChanges, isSaving]);

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

  // Handlers
  // Input change handler for basic fields
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updatedActivity = new Activity(
        prev.id,
        name === 'name' ? value : prev.name,
        name === 'capacity' ? parseInt(value) || 1 : prev.capacity,
        name === 'inputBufferCapacity' ? displayToBuffer(parseInt(value) || 0) : prev.inputBufferCapacity,
        name === 'outputBufferCapacity' ? displayToBuffer(parseInt(value) || 0) : prev.outputBufferCapacity,
        prev.operationSteps,
        prev.x,
        prev.y
      );

      // Preserve connectType
      updatedActivity.connectType = prev.connectType;

      // Preserve financialProperties
      updatedActivity.financialProperties = prev.financialProperties;

      // Preserve state modifications
      updatedActivity.preProcessingStateModifications = prev.preProcessingStateModifications;
      updatedActivity.postProcessingStateModifications = prev.postProcessingStateModifications;

      return updatedActivity;
    });
    setHasChanges(true);
  };

  // Save handler
  const handleSave = () => {
    const activityToSave = new Activity(
      formData.id,
      formData.name,
      formData.capacity,
      displayToBuffer(formData.inputBufferCapacity),
      displayToBuffer(formData.outputBufferCapacity),
      formData.operationSteps,
      formData.x,
      formData.y
    );

    // Preserve connectType
    activityToSave.connectType = formData.connectType;

    // Preserve financialProperties
    activityToSave.financialProperties = formData.financialProperties;

    // Preserve state modifications
    activityToSave.preProcessingStateModifications = formData.preProcessingStateModifications;
    activityToSave.postProcessingStateModifications = formData.postProcessingStateModifications;

    onSave(activityToSave);
    setIsSaving(true); // Will be cleared by useEffect after 500ms
  };

  // Cancel handler - resets form without closing the editor
  const handleCancel = () => {
    setFormData(extractActivityData(activity));
    setHasChanges(false);
  };

  const handleOperationStepChange = (index: number, updatedStep: OperationStep) => {
    setFormData(prev => {
      const newOperationSteps = [...prev.operationSteps];
      newOperationSteps[index] = updatedStep;

      const updatedActivity = new Activity(
        prev.id,
        prev.name,
        prev.capacity,
        prev.inputBufferCapacity,
        prev.outputBufferCapacity,
        newOperationSteps,
        prev.x,
        prev.y
      );

      // Preserve connectType
      updatedActivity.connectType = prev.connectType;

      // Preserve financialProperties
      updatedActivity.financialProperties = prev.financialProperties;

      // Preserve state modifications
      updatedActivity.preProcessingStateModifications = prev.preProcessingStateModifications;
      updatedActivity.postProcessingStateModifications = prev.postProcessingStateModifications;

      return updatedActivity;
    });
    setHasChanges(true);
  };

  const handleAddOperationStep = () => {
    // Create a new operation step with a default constant distribution
    const newStep = createOperationStep(
      new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1))
    );

    setFormData(prev => {
      const newOperationSteps = [...prev.operationSteps, newStep];

      const updatedActivity = new Activity(
        prev.id,
        prev.name,
        prev.capacity,
        prev.inputBufferCapacity,
        prev.outputBufferCapacity,
        newOperationSteps,
        prev.x,
        prev.y
      );

      // Preserve connectType
      updatedActivity.connectType = prev.connectType;

      // Preserve financialProperties
      updatedActivity.financialProperties = prev.financialProperties;

      // Preserve state modifications
      updatedActivity.preProcessingStateModifications = prev.preProcessingStateModifications;
      updatedActivity.postProcessingStateModifications = prev.postProcessingStateModifications;

      return updatedActivity;
    });
    setHasChanges(true);
  };

  const handleOperationStepDelete = React.useCallback((index: number) => {
    setFormData(prev => {
      const newOperationSteps = prev.operationSteps.filter((_, i) => i !== index);

      const updatedActivity = new Activity(
        prev.id,
        prev.name,
        prev.capacity,
        prev.inputBufferCapacity,
        prev.outputBufferCapacity,
        newOperationSteps,
        prev.x,
        prev.y
      );

      // Preserve connectType
      updatedActivity.connectType = prev.connectType;

      // Preserve financialProperties
      updatedActivity.financialProperties = prev.financialProperties;

      // Preserve state modifications
      updatedActivity.preProcessingStateModifications = prev.preProcessingStateModifications;
      updatedActivity.postProcessingStateModifications = prev.postProcessingStateModifications;

      return updatedActivity;
    });
    setHasChanges(true);
  }, []);

  const handleFinancialChange = (field: keyof ActivityFinancialProperties, value: any) => {
    setFormData(prev => {
      const currentFinancial = prev.financialProperties || new ActivityFinancialProperties();
      const updatedFinancial = new ActivityFinancialProperties({
        enabled: currentFinancial.enabled,
        fixedCost: currentFinancial.fixedCost,
        costPerEntityProcessed: currentFinancial.costPerEntityProcessed,
        costPerHourActive: currentFinancial.costPerHourActive,
        costPerHourIdle: currentFinancial.costPerHourIdle,
        resourceCostMultiplier: currentFinancial.resourceCostMultiplier,
        [field]: value,
      });

      const updatedActivity = new Activity(
        prev.id,
        prev.name,
        prev.capacity,
        prev.inputBufferCapacity,
        prev.outputBufferCapacity,
        prev.operationSteps,
        prev.x,
        prev.y
      );

      // Preserve connectType
      updatedActivity.connectType = prev.connectType;

      // Update financialProperties
      updatedActivity.financialProperties = updatedFinancial;

      // Preserve state modifications
      updatedActivity.preProcessingStateModifications = prev.preProcessingStateModifications;
      updatedActivity.postProcessingStateModifications = prev.postProcessingStateModifications;

      return updatedActivity;
    });
    setHasChanges(true);
  };

  // ConnectType change handler
  const handleConnectTypeChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const newConnectType = e.target.value as ConnectType;
    setFormData(prev => {
      const updatedActivity = new Activity(
        prev.id,
        prev.name,
        prev.capacity,
        prev.inputBufferCapacity,
        prev.outputBufferCapacity,
        prev.operationSteps,
        prev.x,
        prev.y
      );

      // Update connectType
      updatedActivity.connectType = newConnectType;

      // Preserve financialProperties
      updatedActivity.financialProperties = prev.financialProperties;

      // Preserve state modifications
      updatedActivity.preProcessingStateModifications = prev.preProcessingStateModifications;
      updatedActivity.postProcessingStateModifications = prev.postProcessingStateModifications;

      return updatedActivity;
    });
    setHasChanges(true);
  };

  // State modifications change handlers - auto-save immediately
  const handlePreProcessingChange = (mods: any[]) => {
    const updatedActivity = new Activity(
      formData.id,
      formData.name,
      formData.capacity,
      formData.inputBufferCapacity,
      formData.outputBufferCapacity,
      formData.operationSteps,
      formData.x,
      formData.y
    );

    // Preserve connectType
    updatedActivity.connectType = formData.connectType;

    // Preserve financialProperties
    updatedActivity.financialProperties = formData.financialProperties;

    // Update pre-processing state modifications
    updatedActivity.preProcessingStateModifications = mods;

    // Preserve post-processing state modifications
    updatedActivity.postProcessingStateModifications = formData.postProcessingStateModifications;

    // Auto-save immediately
    onSave(updatedActivity);
    // Update local state to match
    setFormData(updatedActivity);
    setIsSaving(true);
  };

  const handlePostProcessingChange = (mods: any[]) => {
    const updatedActivity = new Activity(
      formData.id,
      formData.name,
      formData.capacity,
      formData.inputBufferCapacity,
      formData.outputBufferCapacity,
      formData.operationSteps,
      formData.x,
      formData.y
    );

    // Preserve connectType
    updatedActivity.connectType = formData.connectType;

    // Preserve financialProperties
    updatedActivity.financialProperties = formData.financialProperties;

    // Preserve pre-processing state modifications
    updatedActivity.preProcessingStateModifications = formData.preProcessingStateModifications;

    // Update post-processing state modifications
    updatedActivity.postProcessingStateModifications = mods;

    // Auto-save immediately
    onSave(updatedActivity);
    // Update local state to match
    setFormData(updatedActivity);
    setIsSaving(true);
  };

  // Resource Requirement Modal Handlers
  const handleOpenRequirementModal = (requirementId: string) => {
    const req = referenceData?.resourceRequirements?.find(r => r.id === requirementId);
    if (req) {
      const structure = convertRootClausesToStructure(req.rootClauses);
      setEditingRequirement({ id: req.id, name: req.name, structure });
      setRequirementModalOpen(true);
    }
  };

  const handleCreateRequirement = () => {
    setEditingRequirement(null);
    setRequirementModalOpen(true);
  };

  const handleSaveRequirement = (data: { name: string; structure: TeamStructure }) => {
    const rootClauses = convertStructureToRootClauses(data.structure);

    // Get the current requirements array
    const currentRequirements = referenceData?.resourceRequirements || [];

    let updatedRequirements;

    if (editingRequirement) {
      // Update existing requirement
      updatedRequirements = currentRequirements.map(req =>
        req.id === editingRequirement.id
          ? {
              id: req.id,
              name: data.name,
              type: SimulationObjectType.ResourceRequirement,
              rootClauses
            }
          : req
      );
    } else {
      // Create new requirement with generated ID
      const newRequirement = {
        id: `rr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        type: SimulationObjectType.ResourceRequirement,
        rootClauses
      };
      updatedRequirements = [...currentRequirements, newRequirement];
    }

    // Send update message to extension
    updateResourceRequirements(updatedRequirements);

    // Close modal
    setRequirementModalOpen(false);
    setEditingRequirement(null);
  };

  if (!formData?.id) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
        <div className="text-red-600 font-medium">Invalid activity data</div>
        <div className="text-xs text-red-500 mt-1">Activity data missing required properties</div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
          {/* Tab Navigation */}
          <div className="border-b bg-gray-50">
            <div className="flex">
              <button
                type="button"
                onClick={() => setActiveTab("basic")}
                title="Basic Settings"
                className={`px-2 py-1.5 border-b-2 ${
                  activeTab === "basic"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("opsteps")}
                title="Operation Steps"
                className={`px-2 py-1.5 border-b-2 ${
                  activeTab === "opsteps"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("financial")}
                title="Financial Settings"
                className={`px-2 py-1.5 border-b-2 ${
                  activeTab === "financial"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <DollarSign className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("connectors")}
                title="Routing Configuration"
                className={`px-2 py-1.5 border-b-2 ${
                  activeTab === "connectors"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("events")}
                title="Event Modifications"
                className={`px-2 py-1.5 border-b-2 ${
                  activeTab === "events"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("states")}
                title="State Definitions"
                className={`px-2 py-1.5 border-b-2 ${
                  activeTab === "states"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
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
                  <span title="Configure activity name, processing capacity (parallel entities), and queue buffer limits">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>
                <div className="space-y-2">
                  {/* Name Section */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Activity Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-2 py-1.5 text-xs border rounded"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Enter activity name"
                    />
                  </div>

                  {/* Capacity Section */}
                  <div className="pt-2 border-t">
                    <div className="mb-1">
                      <div className="text-xs font-medium text-gray-700 mb-0.5">
                        Capacity Configuration
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight">
                        Max parallel entities
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Capacity</label>
                      <input
                        type="number"
                        name="capacity"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={formData.capacity}
                        onChange={handleInputChange}
                        min="1"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  {/* Buffer Section */}
                  <div className="pt-2 border-t">
                    <div className="mb-1">
                      <div className="text-xs font-medium text-gray-700 mb-0.5">
                        Buffer Configuration
                      </div>
                      <div className="text-[10px] text-gray-500 leading-tight">
                        Queue limits (999999 = ∞)
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Input Buffer</label>
                        <input
                          type="number"
                          name="inputBufferCapacity"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={
                            formData.inputBufferCapacity === Infinity
                              ? 999999
                              : formData.inputBufferCapacity
                          }
                          onChange={handleInputChange}
                          min="0"
                          max="999999"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Output Buffer</label>
                        <input
                          type="number"
                          name="outputBufferCapacity"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={
                            formData.outputBufferCapacity === Infinity
                              ? 999999
                              : formData.outputBufferCapacity
                          }
                          onChange={handleInputChange}
                          min="0"
                          max="999999"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "opsteps" && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-blue-500" />
                    <span className="text-xs font-medium text-gray-700">Operation Steps</span>
                    <span title="Define sequential processing steps with durations and resource requirements for this activity">
                      <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOperationStep}
                    className="flex items-center gap-1 px-1 py-0.5 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {formData.operationSteps.map((step, index) => (
                    <OperationStepEditor
                      key={index}
                      step={step}
                      index={index}
                      onChange={(updatedStep) =>
                        handleOperationStepChange(index, updatedStep)
                      }
                      onDelete={() =>
                        handleOperationStepDelete(index)
                      }
                      resourceRequirements={referenceData?.resourceRequirements}
                      availableResources={referenceData?.resources}
                      onOpenRequirementModal={handleOpenRequirementModal}
                      onCreateRequirement={handleCreateRequirement}
                    />
                  ))}
                </div>
              </div>
            )}

            {activeTab === "financial" && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <DollarSign className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">Financial Settings</span>
                  <span title="Track activity costs including fixed costs, per-entity costs, time-based costs, and resource cost multipliers">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>
                <div className="space-y-1">
                  {/* Enable Financial Tracking */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="financialEnabled"
                      checked={formData.financialProperties?.enabled || false}
                      onChange={(e) =>
                        handleFinancialChange("enabled", e.target.checked)
                      }
                      className="w-3 h-3"
                    />
                    <label htmlFor="financialEnabled" className="text-xs font-medium text-gray-700">
                      Enable Financial Tracking
                    </label>
                  </div>

                  {/* Cost Components */}
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium text-gray-600 mb-0.5">Cost Components</div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">Fixed Cost</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={formData.financialProperties?.fixedCost || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "fixedCost",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={!formData.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">Cost Per Entity</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={formData.financialProperties?.costPerEntityProcessed || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerEntityProcessed",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={!formData.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">Cost/Hr Active</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={formData.financialProperties?.costPerHourActive || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerHourActive",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={!formData.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">Cost/Hr Idle</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={formData.financialProperties?.costPerHourIdle || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerHourIdle",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={!formData.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {/* Resource Cost Settings */}
                  <div className="space-y-0.5 pt-0.5 border-t">
                    <div className="text-xs font-medium text-gray-600 mb-0.5">Resource Cost</div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">Cost Multiplier</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={formData.financialProperties?.resourceCostMultiplier || 1}
                        onChange={(e) =>
                          handleFinancialChange(
                            "resourceCostMultiplier",
                            parseFloat(e.target.value) || 1
                          )
                        }
                        disabled={!formData.financialProperties?.enabled}
                        min="0"
                        step="0.1"
                        placeholder="1.0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "connectors" && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <ArrowRightLeft className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">Routing Configuration</span>
                  <span title="Configure how entities are routed to downstream activities using probability, state conditions, or entity templates">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>
                <RoutingConfigurationContent
                  localData={formData}
                  handleChange={handleConnectTypeChange}
                  outgoingConnectors={outgoingConnectors}
                  referenceData={referenceData || { activities: [], resources: [], entities: [], resourceRequirements: [] }}
                  states={states}
                  showHeader={false}
                />
              </div>
            )}

            {activeTab === "events" && (
              <div className="space-y-2">
                <div className="flex items-center gap-1 mb-1">
                  <Zap className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">Event Modifications</span>
                  <span title="Configure state modifications that occur when entities enter (pre-processing) and exit (post-processing) this activity">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>

                {/* Pre-Processing State Modifications */}
                <div className="border-b pb-2">
                  <StateModificationsEditor
                    modifications={formData.preProcessingStateModifications || []}
                    onModificationsChange={handlePreProcessingChange}
                    states={states}
                    title="Pre-Processing State Modifications"
                    description="Applied before entry"
                    allowCrossComponent={true}
                  />
                </div>

                {/* Post-Processing State Modifications */}
                <div>
                  <StateModificationsEditor
                    modifications={formData.postProcessingStateModifications || []}
                    onModificationsChange={handlePostProcessingChange}
                    states={states}
                    title="Post-Processing State Modifications"
                    description="Applied after completion"
                    allowCrossComponent={true}
                  />
                </div>
              </div>
            )}

            {activeTab === "states" && (
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <Hash className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">State Definitions</span>
                  <span title="Define custom state variables that this activity can track and modify">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>
                <StatesEditor
                  states={states}
                  onStatesChange={onStatesChange}
                  defaultComponentType={ComponentType.ACTIVITY}
                />
              </div>
            )}
          </div>

      {/* Save/Cancel Buttons - Only show for tabs that require manual save (not States or Events which auto-save) */}
      {activeTab !== "states" && activeTab !== "events" && (
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
    
    {/* Resource Requirement Modal */}
    <ResourceRequirementModal
      isOpen={requirementModalOpen}
      onClose={() => {
        setRequirementModalOpen(false);
        setEditingRequirement(null);
      }}
      onSave={handleSaveRequirement}
      editingRequirement={editingRequirement}
      availableResources={referenceData?.resources || []}
    />
  </>
  );
};

export default React.memo(ActivityEditor);
