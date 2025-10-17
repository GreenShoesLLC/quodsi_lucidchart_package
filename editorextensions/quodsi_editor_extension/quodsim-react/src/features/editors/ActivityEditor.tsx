import React, { useState } from "react";
import { Settings, Plus, Layers, DollarSign, Hash, ArrowRightLeft } from "lucide-react";
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
import BaseEditor from "./BaseEditor";
import { OperationStepEditor } from "./OperationStepEditor";
import StatesEditor from "./StatesEditor";
import StateModificationsEditor from "./StateModificationsEditor";
import { ResourceRequirementModal } from "./ResourceRequirementModal";
import ConnectorsEditor from "./ConnectorsEditor";
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

type ActivityTab = "basic" | "opsteps" | "financial" | "connectors" | "states";

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

  // Debug logging to verify referenceData is received
  React.useEffect(() => {
    console.log('[ActivityEditor] referenceData received:', {
      hasReferenceData: !!referenceData,
      resourcesCount: referenceData?.resources?.length || 0,
      requirementsCount: referenceData?.resourceRequirements?.length || 0,
      resources: referenceData?.resources,
      requirements: referenceData?.resourceRequirements
    });
  }, [referenceData]);

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

    // Preserve state modifications if they exist
    activity.preProcessingStateModifications = data.preProcessingStateModifications || [];
    activity.postProcessingStateModifications = data.postProcessingStateModifications || [];

    return activity;
  };

  // Extract and prepare activity data for BaseEditor
  const extractedActivity = React.useMemo(() => extractActivityData(activity), [activity]);

  // Handlers
  const handleSave = (updatedActivity: Activity) => {
    const activityToSave = new Activity(
      updatedActivity.id,
      updatedActivity.name,
      updatedActivity.capacity,
      displayToBuffer(updatedActivity.inputBufferCapacity),
      displayToBuffer(updatedActivity.outputBufferCapacity),
      updatedActivity.operationSteps,
      updatedActivity.x,
      updatedActivity.y
    );

    // Preserve connectType
    activityToSave.connectType = updatedActivity.connectType;

    // Preserve financialProperties
    activityToSave.financialProperties = updatedActivity.financialProperties;

    // Preserve state modifications
    activityToSave.preProcessingStateModifications = updatedActivity.preProcessingStateModifications;
    activityToSave.postProcessingStateModifications = updatedActivity.postProcessingStateModifications;

    onSave(activityToSave);
  };

  const handleOperationStepChange = (
    index: number,
    updatedStep: OperationStep,
    localData: Activity,
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void
  ) => {
    const newOperationSteps = [...localData.operationSteps];
    newOperationSteps[index] = updatedStep;

    handleChange({
      target: {
        name: "operationSteps",
        value: newOperationSteps,
      },
    } as any);
  };

  const handleAddOperationStep = (
    localData: Activity,
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void
  ) => {
    // Create a new operation step with a default constant distribution
    const newStep = createOperationStep(
      new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1))
    );

    const newOperationSteps = [...localData.operationSteps, newStep];
    handleChange({
      target: {
        name: "operationSteps",
        value: newOperationSteps,
      },
    } as any);
  };

  const handleOperationStepDelete = React.useCallback(
    (
      index: number,
      localData: Activity,
      handleChange: (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
      ) => void
    ) => {
      const newOperationSteps = localData.operationSteps.filter(
        (_, i) => i !== index
      );
      handleChange({
        target: {
          name: "operationSteps",
          value: newOperationSteps,
        },
      } as any);
    },
    []
  );

  const handleFinancialChange = (
    field: keyof ActivityFinancialProperties,
    value: any,
    localData: Activity,
    handleChange: (
      e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => void
  ) => {
    const currentFinancial = localData.financialProperties || new ActivityFinancialProperties();
    const updatedFinancial = new ActivityFinancialProperties({
      enabled: currentFinancial.enabled,
      fixedCost: currentFinancial.fixedCost,
      costPerEntityProcessed: currentFinancial.costPerEntityProcessed,
      costPerHourActive: currentFinancial.costPerHourActive,
      costPerHourIdle: currentFinancial.costPerHourIdle,
      resourceCostMultiplier: currentFinancial.resourceCostMultiplier,
      [field]: value,
    });

    handleChange({
      target: {
        name: "financialProperties",
        value: updatedFinancial,
      },
    } as any);
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
      console.log('[ActivityEditor] Updating requirement:', editingRequirement.id, data.name);
    } else {
      // Create new requirement with generated ID
      const newRequirement = {
        id: `rr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        type: SimulationObjectType.ResourceRequirement,
        rootClauses
      };
      updatedRequirements = [...currentRequirements, newRequirement];
      console.log('[ActivityEditor] Creating new requirement:', newRequirement.id, data.name);
    }

    // Send update message to extension
    updateResourceRequirements(updatedRequirements);

    // Close modal
    setRequirementModalOpen(false);
    setEditingRequirement(null);
  };

  if (!extractedActivity?.id) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
        <div className="text-red-600 font-medium">Invalid activity data</div>
        <div className="text-xs text-red-500 mt-1">Activity data missing required properties</div>
      </div>
    );
  }

  return (
    <>
    <BaseEditor
      data={{
        ...extractedActivity,
        type: SimulationObjectType.Activity,
        // Ensure all Activity methods are available
        setLocation: (x: number, y: number) => extractedActivity.setLocation(x, y),
        getLocation: () => extractedActivity.getLocation(),
        hasLocation: () => extractedActivity.hasLocation(),
        clone: () => extractedActivity.clone(),
        resetLocation: () => extractedActivity.resetLocation(),
        toJSON: () => extractedActivity.toJSON(),
      }}
      onSave={(updatedData) => {
        // Create a new Activity instance to preserve class methods
        const updatedActivity = new Activity(
          updatedData.id,
          updatedData.name,
          updatedData.capacity,
          displayToBuffer(updatedData.inputBufferCapacity),
          displayToBuffer(updatedData.outputBufferCapacity),
          updatedData.operationSteps,
          updatedData.x,
          updatedData.y
        );

        // Preserve connectType
        updatedActivity.connectType = updatedData.connectType || ConnectType.Probability;

        // Preserve financialProperties
        updatedActivity.financialProperties = updatedData.financialProperties;

        // Preserve state modifications
        updatedActivity.preProcessingStateModifications = updatedData.preProcessingStateModifications || [];
        updatedActivity.postProcessingStateModifications = updatedData.postProcessingStateModifications || [];

        onSave(updatedActivity);
      }}
      onCancel={onCancel}
      messageType="activitySaved"
    >
      {(localData, handleChange) => (
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
                onClick={() => setActiveTab("opsteps")}
                title="Operation Steps"
                className={`px-3 py-2 border-b-2 ${
                  activeTab === "opsteps"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Layers className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("financial")}
                title="Financial Settings"
                className={`px-3 py-2 border-b-2 ${
                  activeTab === "financial"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <DollarSign className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("connectors")}
                title="Routing Configuration"
                className={`px-3 py-2 border-b-2 ${
                  activeTab === "connectors"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <ArrowRightLeft className="w-4 h-4" />
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
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-2">
            {activeTab === "basic" && (
              <div>
                <div className="flex items-center gap-1 mb-2">
                  <Settings className="w-3 h-3 text-blue-500" />
                  <span className="text-xs font-medium text-gray-700">Basic Settings</span>
                </div>
                <div className="space-y-4">
                  {/* Name Section */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Activity Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-2 py-1.5 text-xs border rounded"
                      value={localData.name}
                      onChange={handleChange}
                      placeholder="Enter activity name"
                    />
                  </div>

                  {/* Capacity Section */}
                  <div className="pt-3 border-t">
                    <div className="mb-2">
                      <div className="text-xs font-medium text-gray-700 mb-0.5">
                        Capacity Configuration
                      </div>
                      <div className="text-xs text-gray-500">
                        Maximum number of entities that can be processed in parallel
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Capacity</label>
                      <input
                        type="number"
                        name="capacity"
                        className="w-full px-2 py-1.5 text-xs border rounded"
                        value={localData.capacity}
                        onChange={handleChange}
                        min="1"
                        placeholder="1"
                      />
                    </div>
                  </div>

                  {/* Buffer Section */}
                  <div className="pt-3 border-t">
                    <div className="mb-2">
                      <div className="text-xs font-medium text-gray-700 mb-0.5">
                        Buffer Configuration
                      </div>
                      <div className="text-xs text-gray-500">
                        Entity storage capacity before and after processing (999999 = unlimited)
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Input Buffer</label>
                        <input
                          type="number"
                          name="inputBufferCapacity"
                          className="w-full px-2 py-1.5 text-xs border rounded"
                          value={
                            localData.inputBufferCapacity === Infinity
                              ? 999999
                              : localData.inputBufferCapacity
                          }
                          onChange={handleChange}
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
                          className="w-full px-2 py-1.5 text-xs border rounded"
                          value={
                            localData.outputBufferCapacity === Infinity
                              ? 999999
                              : localData.outputBufferCapacity
                          }
                          onChange={handleChange}
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
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddOperationStep(localData, handleChange)}
                    className="flex items-center gap-1 px-1 py-0.5 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
                  >
                    <Plus className="w-3 h-3" />
                    Add
                  </button>
                </div>
                <div className="space-y-1">
                  {localData.operationSteps.map((step, index) => (
                    <OperationStepEditor
                      key={index}
                      step={step}
                      index={index}
                      onChange={(updatedStep) =>
                        handleOperationStepChange(
                          index,
                          updatedStep,
                          localData,
                          handleChange
                        )
                      }
                      onDelete={() =>
                        handleOperationStepDelete(index, localData, handleChange)
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
                </div>
                <div className="space-y-2">
                  {/* Enable Financial Tracking */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="financialEnabled"
                      checked={localData.financialProperties?.enabled || false}
                      onChange={(e) =>
                        handleFinancialChange(
                          "enabled",
                          e.target.checked,
                          localData,
                          handleChange
                        )
                      }
                      className="w-3 h-3"
                    />
                    <label htmlFor="financialEnabled" className="text-xs font-medium text-gray-700">
                      Enable Financial Tracking
                    </label>
                  </div>

                  {/* Cost Components */}
                  <div className="space-y-1 pt-1">
                    <div className="text-xs font-medium text-gray-600 mb-1">Cost Components</div>
                    <div>
                      <label className="block text-xs text-gray-600">Fixed Cost</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localData.financialProperties?.fixedCost || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "fixedCost",
                            parseFloat(e.target.value) || 0,
                            localData,
                            handleChange
                          )
                        }
                        disabled={!localData.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        One-time cost at activity initialization
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Cost Per Entity Processed</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localData.financialProperties?.costPerEntityProcessed || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerEntityProcessed",
                            parseFloat(e.target.value) || 0,
                            localData,
                            handleChange
                          )
                        }
                        disabled={!localData.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Variable cost per entity processed
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Cost Per Hour Active</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localData.financialProperties?.costPerHourActive || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerHourActive",
                            parseFloat(e.target.value) || 0,
                            localData,
                            handleChange
                          )
                        }
                        disabled={!localData.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Hourly cost during entity processing
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600">Cost Per Hour Idle</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localData.financialProperties?.costPerHourIdle || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerHourIdle",
                            parseFloat(e.target.value) || 0,
                            localData,
                            handleChange
                          )
                        }
                        disabled={!localData.financialProperties?.enabled}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Hourly cost during idle periods
                      </p>
                    </div>
                  </div>

                  {/* Resource Cost Settings */}
                  <div className="space-y-1 pt-1 border-t">
                    <div className="text-xs font-medium text-gray-600 mb-1">Resource Cost Settings</div>
                    <div>
                      <label className="block text-xs text-gray-600">Resource Cost Multiplier</label>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localData.financialProperties?.resourceCostMultiplier || 1}
                        onChange={(e) =>
                          handleFinancialChange(
                            "resourceCostMultiplier",
                            parseFloat(e.target.value) || 1,
                            localData,
                            handleChange
                          )
                        }
                        disabled={!localData.financialProperties?.enabled}
                        min="0"
                        step="0.1"
                        placeholder="1.0"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">
                        Multiplier for resource costs (e.g., 1.5 for overtime)
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "connectors" && (
              <ConnectorsEditor
                activity={localData}
                outgoingConnectors={outgoingConnectors}
                onSave={handleSave}
                onCancel={onCancel}
                referenceData={referenceData || { activities: [], resources: [], entities: [], resourceRequirements: [] }}
                states={states}
              />
            )}

            {activeTab === "states" && (
              <div className="space-y-4">
                {/* State Definitions Section */}
                <div className="border-b pb-4">
                  <div className="text-xs font-semibold text-gray-700 mb-2">
                    State Definitions
                  </div>
                  <StatesEditor
                    states={states}
                    onStatesChange={onStatesChange}
                    defaultComponentType={ComponentType.ACTIVITY}
                  />
                </div>

                {/* Pre-Processing State Modifications */}
                <div className="border-b pb-4">
                  <StateModificationsEditor
                    modifications={localData.preProcessingStateModifications || []}
                    onModificationsChange={(mods) =>
                      handleChange({
                        target: {
                          name: "preProcessingStateModifications",
                          value: mods,
                        },
                      } as any)
                    }
                    states={states}
                    title="Pre-Processing State Modifications"
                    description="Modifications applied before entities enter the activity"
                    allowCrossComponent={true}
                  />
                </div>

                {/* Post-Processing State Modifications */}
                <div>
                  <StateModificationsEditor
                    modifications={localData.postProcessingStateModifications || []}
                    onModificationsChange={(mods) =>
                      handleChange({
                        target: {
                          name: "postProcessingStateModifications",
                          value: mods,
                        },
                      } as any)
                    }
                    states={states}
                    title="Post-Processing State Modifications"
                    description="Modifications applied after entities complete the activity"
                    allowCrossComponent={true}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </BaseEditor>
    
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
