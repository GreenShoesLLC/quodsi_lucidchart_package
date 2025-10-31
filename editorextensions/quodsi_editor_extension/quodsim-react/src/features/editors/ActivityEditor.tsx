import React, { useState } from "react";
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
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";

// ============================================================================
// CONSTANTS
// ============================================================================

// Constant representing "infinity" for buffer capacity display
// (999999 is used to represent unlimited capacity in the UI)
const INFINITY_DISPLAY_VALUE = 999999;

/**
 * Tab navigation configuration for ActivityEditor.
 * Defines all available tabs, their icons, titles, and tooltips.
 */
const TAB_CONFIG = [
  {
    id: "basic" as const,
    title: "Basic Settings",
    icon: Settings,
    tooltip: "Configure activity name, processing capacity (parallel entities), and queue buffer limits"
  },
  {
    id: "opsteps" as const,
    title: "Operation Steps",
    icon: Layers,
    tooltip: "Define sequential processing steps with durations and resource requirements for this activity"
  },
  {
    id: "financial" as const,
    title: "Financial Settings",
    icon: DollarSign,
    tooltip: "Track activity costs including fixed costs, per-entity costs, time-based costs, and resource cost multipliers"
  },
  {
    id: "connectors" as const,
    title: "Routing Configuration",
    icon: ArrowRightLeft,
    tooltip: "Configure how entities are routed to downstream activities using probability, state conditions, or entity templates"
  },
  {
    id: "events" as const,
    title: "Event Modifications",
    icon: Zap,
    tooltip: "Configure state modifications that occur when entities enter (pre-processing) and exit (post-processing) this activity"
  },
  {
    id: "states" as const,
    title: "State Definitions",
    icon: Hash,
    tooltip: "Define custom state variables that this activity can track and modify"
  },
];

/**
 * TabHeader - Consistent header for tab content sections
 *
 * Displays an icon, title, and tooltip for each tab's content area.
 * Used across all activity editor tabs for visual consistency.
 *
 * @param icon - Lucide icon component to display
 * @param title - Tab section title
 * @param tooltip - Helpful description shown on hover
 */
const TabHeader: React.FC<{ icon: React.ElementType; title: string; tooltip: string }> = ({
  icon: Icon,
  title,
  tooltip,
}) => (
  <div className="flex items-center gap-1 mb-1">
    <Icon className="w-3 h-3 text-blue-500" />
    <span className="text-xs font-medium text-gray-700">{title}</span>
    <span title={tooltip}>
      <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
    </span>
  </div>
);

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for activity data - accepts various formats
 */
type ActivityInput = Activity | { data: Partial<Activity> } | Partial<Activity>;

/**
 * Type for tracking resource requirement being edited in modal
 */
interface EditingRequirement {
  id: string;
  name: string;
  structure: TeamStructure;
}

/**
 * Props for the ActivityEditor component
 */
interface ActivityEditorProps {
  /** The activity to edit (can be Activity instance or raw data object) */
  activity: ActivityInput;
  /** Callback when user clicks Save - receives the updated Activity */
  onSave: (activity: Activity) => void;
  /** Callback when user clicks Cancel */
  onCancel: () => void;
  /** Reference data for dropdowns (resources, requirements, etc.) */
  referenceData?: EditorReferenceData;
  /** State manager for model-level states */
  states: StateListManager;
  /** Callback when states are modified */
  onStatesChange: (states: StateListManager) => void;
  /** Connectors leaving this activity (for routing configuration) */
  outgoingConnectors?: Connector[];
}

/**
 * Available tabs in the activity editor
 */
type ActivityTab = "basic" | "opsteps" | "financial" | "connectors" | "states" | "events";

/**
 * ActivityEditor - Comprehensive editor for Activity simulation objects
 *
 * This component provides a tabbed interface for editing all aspects of an Activity:
 * - Basic: Name, capacity, buffer sizes
 * - Operation Steps: Processing durations and resource requirements
 * - Financial: Cost tracking properties
 * - Connectors: Routing rules for outgoing connectors
 * - States: State modifications (pre/post processing)
 *
 * State Management:
 * - Maintains local draft state (localActivityDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving, optimisticData)
 * - Uses custom hooks for activity switching and save completion detection
 * - Only persists changes when user clicks Save button
 *
 * Key Features:
 * - Dirty state tracking (hasPendingChanges) enables/disables Save button
 * - Guard conditions prevent data loss when switching activities
 * - Immutable updates via updateActivityImmutably helper
 * - Auto-save for state modifications (pre/post processing events)
 */
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
  const [editingRequirement, setEditingRequirement] = useState<EditingRequirement | null>(null);

  // Get message sender for updating resource requirements
  const { updateResourceRequirements } = useModelOpsSender();

  // Get element operations state from Redux
  const elementOpsState = useElementOpsState();

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Converts internal buffer capacity values to display values for the UI.
   *
   * Buffer capacities are stored as either a number or Infinity (unlimited).
   * This converts null/undefined (representing unlimited) to a large number
   * (999999) that's more user-friendly in input fields.
   *
   * @param value - Internal buffer capacity (null/undefined = unlimited)
   * @returns Display value for UI (999999 represents unlimited)
   */
  const bufferToDisplay = (value: number | null | undefined): number =>
    value === null || value === undefined ? INFINITY_DISPLAY_VALUE : value;

  /**
   * Converts display values from the UI back to internal buffer capacity values.
   *
   * Users enter 999999 to represent unlimited capacity. This converts that
   * back to JavaScript's Infinity for internal storage.
   *
   * @param value - Display value from UI
   * @returns Internal value (Infinity for unlimited, otherwise the number)
   */
  const displayToBuffer = (value: number): number =>
    value >= INFINITY_DISPLAY_VALUE ? Infinity : value;

  /**
   * Extracts and normalizes activity data from props into a clean Activity instance.
   *
   * This handles multiple data formats:
   * - Full Activity instances
   * - Raw data objects with nested .data property
   * - Missing/null values (creates default activity)
   *
   * Key responsibilities:
   * - Normalizes buffer capacities for display (null → 999999)
   * - Ensures financialProperties are properly initialized
   * - Creates new array references for state modifications (for change detection)
   * - Applies sensible defaults for missing values
   *
   * @param act - Activity data (can be Activity instance, raw object, or null)
   * @returns Normalized Activity instance ready for editing
   */
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

  /**
   * Creates an updated Activity instance with modified fields while preserving
   * all other properties. This ensures proper immutability and change detection.
   *
   * Why we need this: React state updates require new object references for change
   * detection. Activity class instances need to be reconstructed with new references
   * rather than mutated in place. This helper eliminates ~100 lines of duplicated
   * reconstruction logic across 8+ handlers.
   *
   * @param base - The existing activity to base updates on
   * @param updates - Partial activity fields to update
   * @returns New Activity instance with updates applied and all other fields preserved
   */
  const updateActivityImmutably = (
    base: Activity,
    updates: Partial<{
      name: string;
      capacity: number;
      inputBufferCapacity: number;
      outputBufferCapacity: number;
      operationSteps: OperationStep[];
      connectType: ConnectType;
      financialProperties: ActivityFinancialProperties;
      preProcessingStateModifications: any[];
      postProcessingStateModifications: any[];
    }>
  ): Activity => {
    const updated = new Activity(
      base.id,
      updates.name ?? base.name,
      updates.capacity ?? base.capacity,
      updates.inputBufferCapacity ?? base.inputBufferCapacity,
      updates.outputBufferCapacity ?? base.outputBufferCapacity,
      updates.operationSteps ?? base.operationSteps,
      base.x,
      base.y
    );

    // Preserve/update complex properties
    updated.connectType = updates.connectType ?? base.connectType;
    updated.financialProperties = updates.financialProperties ?? base.financialProperties;
    updated.preProcessingStateModifications =
      updates.preProcessingStateModifications ?? base.preProcessingStateModifications;
    updated.postProcessingStateModifications =
      updates.postProcessingStateModifications ?? base.postProcessingStateModifications;

    return updated;
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Local draft of the activity being edited.
   *
   * This is the single source of truth for form state. All inputs read from
   * and write to this state. Changes are applied immediately for responsive UI,
   * but only persisted to model when user clicks Save.
   *
   * Initialized with extractActivityData() to normalize incoming props.
   */
  const [localActivityDraft, setLocalActivityDraft] = useState<Activity>(() => extractActivityData(activity));

  /**
   * Flag indicating whether user has made changes that haven't been saved.
   *
   * Controls:
   * - Save button enabled/disabled state
   * - Guard condition for activity switching (prevents data loss)
   *
   * Set to true: When any field changes
   * Set to false: When save completes (via useSaveCompletionDetector) or Cancel clicked
   */
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  /**
   * Redux-managed state for save operation tracking.
   *
   * isSaving: true when save is in progress (shows loading state)
   * optimisticData: Optimistically updated data (shown during save)
   *
   * These are managed by Redux elementOpsState to coordinate saves across
   * multiple editor instances.
   */
  const isSaving = localActivityDraft.id ? elementOpsState.isSaving(localActivityDraft.id) : false;
  const optimisticData = localActivityDraft.id ? elementOpsState.getOptimisticData(localActivityDraft.id) : null;

  // Custom hooks for state synchronization
  useFormSync(
    (activity as any).id || (activity as any).data?.id || "",
    hasPendingChanges,
    () => extractActivityData(activity),
    setLocalActivityDraft,
    setHasPendingChanges
  );

  useSaveCompletionDetector(isSaving, setHasPendingChanges);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles changes to basic input fields (name, capacity, buffer capacities).
   *
   * Updates are applied immediately to localActivityDraft for responsive UI,
   * but not persisted until user clicks Save button.
   *
   * Special handling for buffer capacities: Converts display values (999999)
   * back to internal format (Infinity) using displayToBuffer helper.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setLocalActivityDraft(prev => {
      // Build updates object based on which field changed
      const updates: Partial<{
        name: string;
        capacity: number;
        inputBufferCapacity: number;
        outputBufferCapacity: number;
      }> = {};

      if (name === 'name') {
        updates.name = value;
      } else if (name === 'capacity') {
        updates.capacity = parseInt(value) || 1;
      } else if (name === 'inputBufferCapacity') {
        updates.inputBufferCapacity = displayToBuffer(parseInt(value) || 0);
      } else if (name === 'outputBufferCapacity') {
        updates.outputBufferCapacity = displayToBuffer(parseInt(value) || 0);
      }

      return updateActivityImmutably(prev, updates);
    });

    setHasPendingChanges(true);
  };

  /**
   * Saves the current activity draft to the model.
   *
   * Key responsibilities:
   * - Converts display values back to internal format (999999 → Infinity)
   * - Triggers Redux save action via onSave callback
   * - Redux manages isSaving state and optimistic updates
   * - useSaveCompletionDetector hook clears hasPendingChanges when save completes
   *
   * Note: Does NOT directly modify hasPendingChanges - that's handled by the
   * save completion detector to avoid race conditions.
   */
  const handleSave = () => {
    const activityToSave = new Activity(
      localActivityDraft.id,
      localActivityDraft.name,
      localActivityDraft.capacity,
      displayToBuffer(localActivityDraft.inputBufferCapacity),
      displayToBuffer(localActivityDraft.outputBufferCapacity),
      localActivityDraft.operationSteps,
      localActivityDraft.x,
      localActivityDraft.y
    );

    // Preserve connectType
    activityToSave.connectType = localActivityDraft.connectType;

    // Preserve financialProperties
    activityToSave.financialProperties = localActivityDraft.financialProperties;

    // Preserve state modifications
    activityToSave.preProcessingStateModifications = localActivityDraft.preProcessingStateModifications;
    activityToSave.postProcessingStateModifications = localActivityDraft.postProcessingStateModifications;

    // Save is handled through Redux - modelOpsSender will dispatch ELEMENT_SAVE_START
    onSave(activityToSave);
    // Note: isSaving state is now managed by Redux through elementOpsState
  };

  /**
   * Cancels editing and resets form to original activity data.
   *
   * Discards all pending changes by:
   * - Re-extracting fresh data from activity prop
   * - Clearing hasPendingChanges flag (disables Save button)
   *
   * Note: Does NOT close the editor - that's handled by parent component.
   */
  const handleCancel = () => {
    setLocalActivityDraft(extractActivityData(activity));
    setHasPendingChanges(false);
  };

  /**
   * Handles changes to a specific operation step.
   *
   * Updates the operation step at the specified index with new data.
   * Operation steps define sequential processing phases with durations
   * and resource requirements.
   *
   * Updates are applied immediately to localActivityDraft for responsive UI,
   * but NOT persisted until user clicks Save button.
   *
   * Sets hasPendingChanges to enable the Save button.
   *
   * @param index - Array index of the operation step being updated
   * @param updatedStep - New operation step data
   */
  const handleOperationStepChange = (index: number, updatedStep: OperationStep) => {
    setLocalActivityDraft(prev => {
      const newOperationSteps = [...prev.operationSteps];
      newOperationSteps[index] = updatedStep;

      return updateActivityImmutably(prev, {
        operationSteps: newOperationSteps
      });
    });
    setHasPendingChanges(true);
  };

  /**
   * Adds a new operation step to the activity.
   *
   * Creates a new operation step with default settings:
   * - Duration: 1 minute (constant distribution)
   * - No resource requirements initially
   *
   * The new step is appended to the end of the operation steps array.
   * User can then configure duration and resources via OperationStepEditor.
   *
   * Updates are applied immediately to localActivityDraft for responsive UI,
   * but NOT persisted until user clicks Save button.
   *
   * Sets hasPendingChanges to enable the Save button.
   */
  const handleAddOperationStep = () => {
    // Create a new operation step with a default constant distribution
    const newStep = createOperationStep(
      new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1))
    );

    setLocalActivityDraft(prev => {
      const newOperationSteps = [...prev.operationSteps, newStep];

      return updateActivityImmutably(prev, {
        operationSteps: newOperationSteps
      });
    });
    setHasPendingChanges(true);
  };

  /**
   * Deletes an operation step at the specified index.
   *
   * Removes the operation step from the operationSteps array.
   * This is a destructive operation - the step's configuration is lost.
   *
   * Uses React.useCallback for performance optimization since this
   * handler is passed to child components (OperationStepEditor).
   *
   * Updates are applied immediately to localActivityDraft for responsive UI,
   * but NOT persisted until user clicks Save button.
   *
   * Sets hasPendingChanges to enable the Save button.
   *
   * @param index - Array index of the operation step to delete
   */
  const handleOperationStepDelete = React.useCallback((index: number) => {
    setLocalActivityDraft(prev => {
      const newOperationSteps = prev.operationSteps.filter((_, i) => i !== index);

      return updateActivityImmutably(prev, {
        operationSteps: newOperationSteps
      });
    });
    setHasPendingChanges(true);
  }, []);

  /**
   * Handles changes to financial property fields.
   *
   * Creates a new ActivityFinancialProperties instance with the updated field,
   * preserving all other financial properties. Financial tracking enables
   * cost analysis for activities including:
   * - Fixed costs
   * - Per-entity costs
   * - Time-based costs (active/idle)
   * - Resource cost multipliers
   *
   * Updates are applied immediately to localActivityDraft for responsive UI,
   * but NOT persisted until user clicks Save button.
   *
   * Sets hasPendingChanges to enable the Save button.
   *
   * @param field - The financial property field to update
   * @param value - The new value for the field
   */
  const handleFinancialChange = (field: keyof ActivityFinancialProperties, value: any) => {
    setLocalActivityDraft(prev => {
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

      return updateActivityImmutably(prev, {
        financialProperties: updatedFinancial
      });
    });
    setHasPendingChanges(true);
  };

  /**
   * Handles changes to the activity's routing/connect type.
   *
   * Connect type determines how entities are routed to downstream activities:
   * - Probability: Route based on connector probabilities
   * - Conditional: Route based on state conditions
   * - EntityType: Route based on entity template
   *
   * Updates are applied immediately to localActivityDraft for responsive UI,
   * but NOT persisted until user clicks Save button.
   *
   * Sets hasPendingChanges to enable the Save button.
   *
   * @param e - Change event from select or input element
   */
  const handleConnectTypeChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const newConnectType = e.target.value as ConnectType;
    setLocalActivityDraft(prev => {
      return updateActivityImmutably(prev, {
        connectType: newConnectType
      });
    });
    setHasPendingChanges(true);
  };

  /**
   * Handles changes to pre-processing state modifications.
   *
   * IMPORTANT: This handler auto-saves immediately (different from other handlers).
   * State modifications are considered "committed" as soon as they're changed.
   *
   * Flow:
   * 1. Create updated activity with new modifications
   * 2. Trigger immediate save via onSave (Redux manages save state)
   * 3. Update local state to match
   *
   * This prevents the Save button workflow - changes are persisted immediately.
   */
  const handlePreProcessingChange = (mods: any[]) => {
    const updatedActivity = updateActivityImmutably(localActivityDraft, {
      preProcessingStateModifications: mods
    });

    // Auto-save immediately (Redux manages save state)
    onSave(updatedActivity);
    // Update local state to match
    setLocalActivityDraft(updatedActivity);
  };

  /**
   * Handles changes to post-processing state modifications.
   *
   * IMPORTANT: This handler auto-saves immediately (different from other handlers).
   * State modifications are considered "committed" as soon as they're changed.
   *
   * Flow:
   * 1. Create updated activity with new modifications
   * 2. Trigger immediate save via onSave (Redux manages save state)
   * 3. Update local state to match
   *
   * This prevents the Save button workflow - changes are persisted immediately.
   */
  const handlePostProcessingChange = (mods: any[]) => {
    const updatedActivity = updateActivityImmutably(localActivityDraft, {
      postProcessingStateModifications: mods
    });

    // Auto-save immediately (Redux manages save state)
    onSave(updatedActivity);
    // Update local state to match
    setLocalActivityDraft(updatedActivity);
  };

  /**
   * Opens the resource requirement modal in edit mode.
   *
   * Loads the specified resource requirement's configuration into the modal,
   * converting the internal root clauses format to the UI-friendly team structure.
   *
   * @param requirementId - ID of the resource requirement to edit
   */
  const handleOpenRequirementModal = (requirementId: string) => {
    const req = referenceData?.resourceRequirements?.find(r => r.id === requirementId);
    if (req) {
      const structure = convertRootClausesToStructure(req.rootClauses);
      setEditingRequirement({ id: req.id, name: req.name, structure });
      setRequirementModalOpen(true);
    }
  };

  /**
   * Opens the resource requirement modal in create mode.
   *
   * Clears any existing editing state to start fresh with a new requirement.
   * The modal will generate a new ID when saved.
   */
  const handleCreateRequirement = () => {
    setEditingRequirement(null);
    setRequirementModalOpen(true);
  };

  /**
   * Saves a resource requirement (either new or edited).
   *
   * Converts the UI-friendly team structure back to internal root clauses format.
   * Either updates an existing requirement or creates a new one with generated ID.
   *
   * Sends update message to extension via Redux to persist to model.
   *
   * @param data - Requirement name and team structure from modal
   */
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

  // ============================================================================
  // RENDER
  // ============================================================================

  // Guard against invalid activity data
  if (!localActivityDraft?.id) {
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
              {TAB_CONFIG.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    title={tab.title}
                    className={`px-3 py-2 border-b-2 ${
                      activeTab === tab.id
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
            {activeTab === "basic" && (
              <div>
                <TabHeader
                  icon={Settings}
                  title="Basic Settings"
                  tooltip="Configure activity name, processing capacity (parallel entities), and queue buffer limits"
                />
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
                      value={localActivityDraft.name}
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
                        value={localActivityDraft.capacity}
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
                        Queue limits ({INFINITY_DISPLAY_VALUE} = ∞)
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
                            localActivityDraft.inputBufferCapacity === Infinity
                              ? INFINITY_DISPLAY_VALUE
                              : localActivityDraft.inputBufferCapacity
                          }
                          onChange={handleInputChange}
                          min="0"
                          max={INFINITY_DISPLAY_VALUE}
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
                            localActivityDraft.outputBufferCapacity === Infinity
                              ? INFINITY_DISPLAY_VALUE
                              : localActivityDraft.outputBufferCapacity
                          }
                          onChange={handleInputChange}
                          min="0"
                          max={INFINITY_DISPLAY_VALUE}
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
                  <TabHeader
                    icon={Layers}
                    title="Operation Steps"
                    tooltip="Define sequential processing steps with durations and resource requirements for this activity"
                  />
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
                  {localActivityDraft.operationSteps.map((step, index) => (
                    <OperationStepEditor
                      key={index}
                      activityId={localActivityDraft.id}
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
                <TabHeader
                  icon={DollarSign}
                  title="Financial Settings"
                  tooltip="Track activity costs including fixed costs, per-entity costs, time-based costs, and resource cost multipliers"
                />
                <div className="space-y-1">
                  {/* Enable Financial Tracking */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="financialEnabled"
                      checked={localActivityDraft.financialProperties?.enabled || false}
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
                        value={localActivityDraft.financialProperties?.fixedCost || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "fixedCost",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={!localActivityDraft.financialProperties?.enabled}
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
                        value={localActivityDraft.financialProperties?.costPerEntityProcessed || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerEntityProcessed",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={!localActivityDraft.financialProperties?.enabled}
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
                        value={localActivityDraft.financialProperties?.costPerHourActive || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerHourActive",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={!localActivityDraft.financialProperties?.enabled}
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
                        value={localActivityDraft.financialProperties?.costPerHourIdle || 0}
                        onChange={(e) =>
                          handleFinancialChange(
                            "costPerHourIdle",
                            parseFloat(e.target.value) || 0
                          )
                        }
                        disabled={!localActivityDraft.financialProperties?.enabled}
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
                        value={localActivityDraft.financialProperties?.resourceCostMultiplier || 1}
                        onChange={(e) =>
                          handleFinancialChange(
                            "resourceCostMultiplier",
                            parseFloat(e.target.value) || 1
                          )
                        }
                        disabled={!localActivityDraft.financialProperties?.enabled}
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
                <TabHeader
                  icon={ArrowRightLeft}
                  title="Routing Configuration"
                  tooltip="Configure how entities are routed to downstream activities using probability, state conditions, or entity templates"
                />
                <RoutingConfigurationContent
                  localData={localActivityDraft}
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
                <TabHeader
                  icon={Zap}
                  title="Event Modifications"
                  tooltip="Configure state modifications that occur when entities enter (pre-processing) and exit (post-processing) this activity"
                />

                {/* Pre-Processing State Modifications */}
                <div className="border-b pb-2">
                  <StateModificationsEditor
                    modifications={localActivityDraft.preProcessingStateModifications || []}
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
                    modifications={localActivityDraft.postProcessingStateModifications || []}
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
                <TabHeader
                  icon={Hash}
                  title="State Definitions"
                  tooltip="Define custom state variables that this activity can track and modify"
                />
                <StatesEditor
                  states={states}
                  onStatesChange={onStatesChange}
                  defaultComponentType={ComponentType.ACTIVITY}
                />
              </div>
            )}
          </div>

      {/*
        Save/Cancel Buttons - Conditional display based on tab type

        Hidden for tabs with auto-save behavior:
        - states: State definitions auto-save immediately
        - events: State modifications auto-save immediately

        Shown for manual-save tabs:
        - basic, opsteps, financial, connectors
      */}
      {activeTab !== "states" && activeTab !== "events" && (
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSaving}
            className={`px-3 py-1.5 text-xs border rounded ${
              isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
            }`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasPendingChanges || isSaving}
            className={`px-3 py-1.5 text-xs rounded ${
              hasPendingChanges && !isSaving
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isSaving ? "Saving..." : "Save"}
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
