import React, { useState, useEffect } from "react";
import {
  Settings,
  Plus,
  Layers,
  DollarSign,
  Hash,
  ArrowRightLeft,
  Info,
  ChevronDown,
  AlertTriangle,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Activity,
  Action,
  ActionType,
  SplitAction,
  CreateAction,
  JoinAction,
  BranchAction,
  PeriodUnit,
  SimulationObjectType,
  createDelayWithResourceAction,
  ConstantDistribution,
  EditorReferenceData,
  Duration,
  ConnectType,
  ActivityFinancialProperties,
  FailureProperties,
  FailureClockMode,
  StateListManager,
  ComponentType,
  Connector,
  ResourceRequirement,
  isNameUniqueInReferenceData,
} from "@quodsi/shared";
import { ActionEditor } from "./ActionEditor";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import StatesEditor from "./StatesEditor";
import { ResourceRequirementModal } from "./ResourceRequirementModal";
import { RoutingConfigurationContent } from "./RoutingConfigurationContent";
import {
  convertStructureToRootClauses,
  convertRootClausesToStructure,
  TeamStructure,
} from "../../utils/resourceRequirementConverter";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";

// ============================================================================
// SORTABLE ACTION ITEM WRAPPER
// ============================================================================

interface SortableActionItemProps {
  id: string;
  action: Action;
  index: number;
  activityId: string;
  expanded: boolean;
  onToggleExpand: () => void;
  onChange: (action: Action) => void;
  onDelete: () => void;
  resourceRequirements?: ResourceRequirement[];
  availableResources?: Array<{ id: string; name: string }>;
  availableEntities?: Array<{ id: string; name: string }>;
  availableActivities?: Array<{ id: string; name: string }>;
  onOpenRequirementModal?: (requirementId: string) => void;
  onCreateRequirement?: () => void;
  states?: StateListManager;
  onNavigateToModelEditor?: () => void;
}

const SortableActionItem: React.FC<SortableActionItemProps> = ({
  id,
  action,
  index,
  activityId,
  expanded,
  onToggleExpand,
  onChange,
  onDelete,
  resourceRequirements,
  availableResources,
  availableEntities,
  availableActivities,
  onOpenRequirementModal,
  onCreateRequirement,
  states,
  onNavigateToModelEditor,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <ActionEditor
        activityId={activityId}
        action={action}
        index={index}
        expanded={expanded}
        onToggleExpand={onToggleExpand}
        onChange={onChange}
        onDelete={() => onDelete()}
        resourceRequirements={resourceRequirements}
        availableResources={availableResources}
        availableEntities={availableEntities}
        availableActivities={availableActivities}
        onOpenRequirementModal={onOpenRequirementModal}
        onCreateRequirement={onCreateRequirement}
        dragHandleProps={{ ...attributes, ...listeners }}
        states={states}
        onNavigateToModelEditor={onNavigateToModelEditor}
      />
    </div>
  );
};

// ============================================================================
// CONSTANTS
// ============================================================================

// Constant representing "infinity" for queue capacity display
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
    tooltip:
      "Configure activity name, processing capacity (parallel entities), and queue capacity limits",
  },
  {
    id: "actions" as const,
    title: "Actions",
    icon: Layers,
    tooltip:
      "Define processing actions with durations and resource requirements",
  },
  {
    id: "financial" as const,
    title: "Financial Settings",
    icon: DollarSign,
    tooltip:
      "Track activity costs including fixed costs, per-entity costs, time-based costs, and resource cost multipliers",
  },
  {
    id: "failure" as const,
    title: "Failure Settings",
    icon: AlertTriangle,
    tooltip:
      "Configure activity failure with Mean Time Between Failures (MTBF) and Mean Time To Repair (MTTR)",
  },
  {
    id: "connectors" as const,
    title: "Routing Configuration",
    icon: ArrowRightLeft,
    tooltip:
      "Configure how entities are routed to downstream activities using probability, state conditions, or entity templates",
  },
  // Temporarily hidden - states managed at Model level
  // {
  //   id: "states" as const,
  //   title: "State Definitions",
  //   icon: Hash,
  //   tooltip:
  //     "Define custom state variables that this activity can track and modify",
  // },
];


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
type ActivityTab =
  | "basic"
  | "actions"
  | "financial"
  | "failure"
  | "connectors"
  | "states";

/**
 * ActivityEditor - Comprehensive editor for Activity simulation objects
 *
 * This component provides a tabbed interface for editing all aspects of an Activity:
 * - Basic: Name, capacity, queue sizes
 * - Actions: Processing durations and resource requirements
 * - Financial: Cost tracking properties
 * - Failure: MTBF/MTTR breakdown simulation
 * - Connectors: Routing rules for outgoing connectors
 * - States: State definitions for the activity
 *
 * State Management:
 * - Maintains local draft state (localActivityDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving, optimisticData)
 * - Uses custom hooks for activity switching and save completion detection
 * - Single save path: all field changes route through useAutoSave (debounced)
 *
 * Save Behavior:
 * - Typed inputs (name, capacity, queue capacities, 5 financial cost fields):
 *   debounced auto-save on edit; immediate save on blur or element switch.
 * - Decisive controls (financialEnabled, failureEnabled, failureClockMode,
 *   repairResourceRequirementId, connectType): immediate save via
 *   useFlushOnChange — selects/checkboxes have no useful onBlur.
 * - Sub-component-driven changes (ActionEditor, EnhancedDurationEditor,
 *   RoutingConfigurationContent): debounced auto-save — sub-components fire
 *   onChange per keystroke, debounce coalesces.
 * - Validation: name uniqueness + 4 action validation checks (Split needs
 *   destination, Create needs entityTemplate+destination, Join needs
 *   matchState+destination, Branch needs condition). Save is gated when
 *   any validation fails; the 4 red banners describe what to fix while
 *   SaveStatusLine summarizes status ("Fix errors to save").
 * - Status surfaced via SaveStatusLine. Native LucidChart Ctrl+Z reverses
 *   saved changes.
 *
 * Key Features:
 * - Auto-save for all fields via useAutoSave hook
 * - Guard conditions prevent data loss when switching activities
 * - Immutable updates via updateActivityImmutably helper
 *
 * @param props - Component props (onCancel kept as vestigial; see Phase 0 spec)
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
  const [editingRequirement, setEditingRequirement] =
    useState<EditingRequirement | null>(null);
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());
  const [advancedSettingsOpen, setAdvancedSettingsOpen] = useState(false);

  // Name validation state
  const [nameError, setNameError] = useState<string | null>(null);

  // Get message sender for updating resource requirements and navigating to Model Editor
  const { updateResourceRequirements, selectElement } = useModelOpsSender();

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Get element operations state from Redux
  const elementOpsState = useElementOpsState();

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Converts internal queue capacity values to display values for the UI.
   *
   * Queue capacities are stored as either a number or Infinity (unlimited).
   * This converts null/undefined (representing unlimited) to a large number
   * (999999) that's more user-friendly in input fields.
   *
   * @param value - Internal queue capacity (null/undefined = unlimited)
   * @returns Display value for UI (999999 represents unlimited)
   */
  const queueToDisplay = (value: number | null | undefined): number =>
    value === null || value === undefined ? INFINITY_DISPLAY_VALUE : value;

  /**
   * Converts display values from the UI back to internal queue capacity values.
   *
   * Values are passed through as-is. The value 999999 represents unlimited
   * capacity and is stored directly (not converted to Infinity) to ensure
   * proper serialization to JSON.
   *
   * @param value - Display value from UI
   * @returns The same value (999999 represents unlimited)
   */
  const displayToBuffer = (value: number): number => value;

  /**
   * Extracts and normalizes activity data from props into a clean Activity instance.
   *
   * This handles multiple data formats:
   * - Full Activity instances
   * - Raw data objects with nested .data property
   * - Missing/null values (creates default activity)
   *
   * Key responsibilities:
   * - Normalizes queue capacities for display (null → 999999)
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
        queueToDisplay(null),
        queueToDisplay(null),
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
      queueToDisplay(data.inboundQueueCapacity),
      queueToDisplay(data.outboundQueueCapacity),
      data.actions || [],
      data.x || 0,
      data.y || 0
    );

    // Preserve connectType if it exists, otherwise use default
    activity.connectType = data.connectType || ConnectType.Probability;

    // Initialize financialProperties if it doesn't exist
    activity.financialProperties = data.financialProperties
      ? ActivityFinancialProperties.fromJSON(data.financialProperties)
      : new ActivityFinancialProperties();

    // Initialize failureProperties if it doesn't exist
    activity.failureProperties = data.failureProperties
      ? FailureProperties.fromJSON(data.failureProperties)
      : new FailureProperties();

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
      inboundQueueCapacity: number;
      outboundQueueCapacity: number;
      actions: Action[];
      connectType: ConnectType;
      financialProperties: ActivityFinancialProperties;
      failureProperties: FailureProperties;
    }>
  ): Activity => {
    const updated = new Activity(
      base.id,
      updates.name ?? base.name,
      updates.capacity ?? base.capacity,
      updates.inboundQueueCapacity ?? base.inboundQueueCapacity,
      updates.outboundQueueCapacity ?? base.outboundQueueCapacity,
      updates.actions ?? base.actions,
      base.x,
      base.y
    );

    // Preserve/update complex properties
    updated.connectType = updates.connectType ?? base.connectType;
    updated.financialProperties =
      updates.financialProperties ?? base.financialProperties;
    updated.failureProperties =
      updates.failureProperties ?? base.failureProperties;

    return updated;
  };

  /**
   * Validates that the activity name is unique among all activities.
   * @param name - The name to validate
   * @returns Error message if invalid, null if valid
   */
  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (referenceData && !isNameUniqueInReferenceData(
      referenceData,
      SimulationObjectType.Activity,
      name,
      localActivityDraft.id
    )) {
      return `An Activity named "${name}" already exists`;
    }
    return null;
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
  const [localActivityDraft, setLocalActivityDraft] = useState<Activity>(() =>
    extractActivityData(activity)
  );

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
  const isSaving = localActivityDraft.id
    ? elementOpsState.isSaving(localActivityDraft.id)
    : false;
  const optimisticData = localActivityDraft.id
    ? elementOpsState.getOptimisticData(localActivityDraft.id)
    : null;

  // Custom hooks for state synchronization
  useFormSync(
    (activity as any).id || (activity as any).data?.id || "",
    hasPendingChanges,
    () => extractActivityData(activity),
    setLocalActivityDraft,
    setHasPendingChanges
  );

  useSaveCompletionDetector(isSaving, setHasPendingChanges);

  // Reset nameError when activity changes
  useEffect(() => {
    setNameError(null);
  }, [localActivityDraft.id]);

  // ============================================================================
  // VALIDATION
  // ============================================================================

  /**
   * Check if any SplitAction is missing a required destination.
   * SplitActions require a destination activity to prevent infinite loops.
   */
  const splitActionsWithoutDestination = localActivityDraft.actions.filter(
    (action): action is SplitAction =>
      action.actionType === ActionType.SPLIT && !(action as SplitAction).destinationId
  );
  const hasSplitValidationError = splitActionsWithoutDestination.length > 0;

  /**
   * Check if any CreateAction is missing required fields.
   * CreateActions require both entityTemplateId and destinationId.
   */
  const createActionsWithMissingFields = localActivityDraft.actions.filter(
    (action): action is CreateAction =>
      action.actionType === ActionType.CREATE &&
      (!(action as CreateAction).entityTemplateId || !(action as CreateAction).destinationId)
  );
  const hasCreateValidationError = createActionsWithMissingFields.length > 0;

  /**
   * Check if any JoinAction is missing required fields.
   * JoinActions require both matchState and destinationId.
   */
  const joinActionsWithMissingFields = localActivityDraft.actions.filter(
    (action): action is JoinAction =>
      action.actionType === ActionType.JOIN &&
      (!(action as JoinAction).matchState || !(action as JoinAction).destinationId)
  );
  const hasJoinValidationError = joinActionsWithMissingFields.length > 0;

  /**
   * Check if any BranchAction is missing a condition.
   * BranchActions require a condition to evaluate.
   */
  const branchActionsWithMissingCondition = localActivityDraft.actions.filter(
    (action): action is BranchAction =>
      action.actionType === ActionType.BRANCH && !(action as BranchAction).condition
  );
  const hasBranchValidationError = branchActionsWithMissingCondition.length > 0;

  // Combined validation error flag
  const hasActionValidationError = hasSplitValidationError || hasCreateValidationError || hasJoinValidationError || hasBranchValidationError;

  // ============================================================================
  // AUTO-SAVE
  // ============================================================================

  const { status, lastSavedAt, saveNow } = useAutoSave<Activity>({
    draft: localActivityDraft,
    hasPendingChanges,
    isValid: nameError === null && !hasActionValidationError,
    onSave,
    isSaving,
    elementId: localActivityDraft.id,
  });

  // Decisive controls (no onBlur): flush save on change.
  useFlushOnChange(localActivityDraft.financialProperties?.enabled, saveNow);
  useFlushOnChange(localActivityDraft.failureProperties?.enabled, saveNow);
  useFlushOnChange(localActivityDraft.failureProperties?.failureClockMode, saveNow);
  useFlushOnChange(localActivityDraft.failureProperties?.repairResourceRequirementId, saveNow);
  useFlushOnChange(localActivityDraft.connectType, saveNow);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles changes to basic input fields (name, capacity, queue capacities).
   *
   * Updates are applied immediately to localActivityDraft for responsive UI,
   * validates the name, and marks the draft as pending. Auto-save fires after
   * debounce or on blur.
   *
   * Queue capacity values are stored as-is (999999 represents unlimited; passed
   * through to JSON serialization without conversion).
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setLocalActivityDraft((prev) => {
      // Build updates object based on which field changed
      const updates: Partial<{
        name: string;
        capacity: number;
        inboundQueueCapacity: number;
        outboundQueueCapacity: number;
      }> = {};

      if (name === "name") {
        updates.name = value;
        // Validate name uniqueness
        const error = validateName(value);
        setNameError(error);
      } else if (name === "capacity") {
        updates.capacity = parseInt(value) || 1;
      } else if (name === "inboundQueueCapacity") {
        updates.inboundQueueCapacity = displayToBuffer(parseInt(value) || 0);
      } else if (name === "outboundQueueCapacity") {
        updates.outboundQueueCapacity = displayToBuffer(parseInt(value) || 0);
      }

      return updateActivityImmutably(prev, updates);
    });

    setHasPendingChanges(true);
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
   * @param index - Array index of the action being updated
   * @param updatedAction - New action data
   */
  const handleActionChange = (
    index: number,
    updatedAction: Action
  ) => {
    setLocalActivityDraft((prev) => {
      const newActions = [...prev.actions];
      newActions[index] = updatedAction;

      return updateActivityImmutably(prev, {
        actions: newActions,
      });
    });
    setHasPendingChanges(true);
  };

  /**
   * Adds a new action to the activity.
   *
   * Creates a new DelayWithResource action with default settings:
   * - Duration: 1 minute (constant distribution)
   * - No resource requirements initially
   *
   * The new action is appended to the end of the actions array.
   * User can then configure duration and resources via ActionEditor.
   *
   * Updates are applied immediately to localActivityDraft for responsive UI,
   * but NOT persisted until user clicks Save button.
   *
   * Sets hasPendingChanges to enable the Save button.
   */
  const handleAddAction = () => {
    // Create a new DelayWithResource action with a default constant distribution
    const newAction = createDelayWithResourceAction(
      new Duration(PeriodUnit.MINUTES, ConstantDistribution.create(1))
    );

    setLocalActivityDraft((prev) => {
      const newActions = [...prev.actions, newAction];

      // Auto-expand the newly added action (it will be at the last index)
      const newActionIndex = newActions.length - 1;
      setExpandedActions((prevExpanded) => {
        const newSet = new Set(prevExpanded);
        newSet.add(newActionIndex);
        return newSet;
      });

      return updateActivityImmutably(prev, {
        actions: newActions,
      });
    });
    setHasPendingChanges(true);
  };

  /**
   * Deletes an action at the specified index.
   *
   * Removes the action from the actions array.
   * This is a destructive operation - the action's configuration is lost.
   *
   * Uses React.useCallback for performance optimization since this
   * handler is passed to child components (ActionEditor).
   *
   * Updates are applied immediately to localActivityDraft for responsive UI,
   * but NOT persisted until user clicks Save button.
   *
   * Sets hasPendingChanges to enable the Save button.
   *
   * @param index - Array index of the action to delete
   */
  const handleActionDelete = React.useCallback((index: number) => {
    setLocalActivityDraft((prev) => {
      const newActions = prev.actions.filter(
        (_, i) => i !== index
      );

      return updateActivityImmutably(prev, {
        actions: newActions,
      });
    });
    // Also remove from expanded set if it was expanded
    setExpandedActions((prev) => {
      const next = new Set(prev);
      next.delete(index);
      // Adjust indices for items after the deleted one
      const adjusted = new Set<number>();
      next.forEach((i) => {
        if (i < index) {
          adjusted.add(i);
        } else if (i > index) {
          adjusted.add(i - 1);
        }
      });
      return adjusted;
    });
    setHasPendingChanges(true);
  }, []);

  /**
   * Toggles the expanded state of an action at the specified index.
   * Multiple actions can be expanded simultaneously.
   */
  const toggleActionExpanded = React.useCallback((index: number) => {
    setExpandedActions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  /**
   * Handles drag end event for reordering actions.
   * Updates both the actions array and adjusts expanded indices accordingly.
   */
  const handleDragEnd = React.useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = parseInt(String(active.id).replace("action-", ""), 10);
      const newIndex = parseInt(String(over.id).replace("action-", ""), 10);

      setLocalActivityDraft((prev) => {
        const newActions = arrayMove([...prev.actions], oldIndex, newIndex);
        return updateActivityImmutably(prev, { actions: newActions });
      });

      // Adjust expanded indices for the moved items
      setExpandedActions((prev) => {
        const next = new Set<number>();
        prev.forEach((expandedIndex) => {
          if (expandedIndex === oldIndex) {
            // The moved item keeps its expanded state at new position
            next.add(newIndex);
          } else if (oldIndex < newIndex) {
            // Moving down: items between old and new shift up
            if (expandedIndex > oldIndex && expandedIndex <= newIndex) {
              next.add(expandedIndex - 1);
            } else {
              next.add(expandedIndex);
            }
          } else {
            // Moving up: items between new and old shift down
            if (expandedIndex >= newIndex && expandedIndex < oldIndex) {
              next.add(expandedIndex + 1);
            } else {
              next.add(expandedIndex);
            }
          }
        });
        return next;
      });

      setHasPendingChanges(true);
    }
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
   * and marked as pending. Auto-save fires after debounce or on blur (cost
   * fields), or immediately via useFlushOnChange (the financial-enabled
   * checkbox).
   *
   * @param field - The financial property field to update
   * @param value - The new value for the field
   */
  const handleFinancialChange = (
    field: keyof ActivityFinancialProperties,
    value: any
  ) => {
    setLocalActivityDraft((prev) => {
      const currentFinancial =
        prev.financialProperties || new ActivityFinancialProperties();
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
        financialProperties: updatedFinancial,
      });
    });
    setHasPendingChanges(true);
  };

  /**
   * Handles changes to failure property fields.
   *
   * Creates a new FailureProperties instance with the updated field,
   * preserving all other failure properties. Failure configuration enables
   * MTBF/MTTR simulation for activity breakdowns. Auto-save fires after
   * debounce (MTBF/MTTR durations via EnhancedDurationEditor) or
   * immediately via useFlushOnChange (failure-enabled checkbox,
   * failureClockMode select, repairResourceRequirementId select).
   */
  const handleFailureChange = (
    field: keyof FailureProperties,
    value: any
  ) => {
    setLocalActivityDraft((prev) => {
      const current = prev.failureProperties || new FailureProperties();
      const updated = new FailureProperties({
        enabled: current.enabled,
        mtbfDuration: current.mtbfDuration,
        mttrDuration: current.mttrDuration,
        failureClockMode: current.failureClockMode,
        repairResourceRequirementId: current.repairResourceRequirementId,
        [field]: value,
      });
      return updateActivityImmutably(prev, { failureProperties: updated });
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
   * and marked as pending. Save fires immediately via useFlushOnChange watching
   * connectType (selects have no useful onBlur).
   *
   * @param e - Change event from select or input element
   */
  const handleConnectTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const newConnectType = e.target.value as ConnectType;
    setLocalActivityDraft((prev) => {
      return updateActivityImmutably(prev, {
        connectType: newConnectType,
      });
    });
    setHasPendingChanges(true);
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
    const req = referenceData?.resourceRequirements?.find(
      (r) => r.id === requirementId
    );
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
  const handleSaveRequirement = (data: {
    name: string;
    structure: TeamStructure;
  }) => {
    const rootClauses = convertStructureToRootClauses(data.structure);

    // Get the current requirements array
    const currentRequirements = referenceData?.resourceRequirements || [];

    let updatedRequirements;

    if (editingRequirement) {
      // Update existing requirement
      updatedRequirements = currentRequirements.map((req) =>
        req.id === editingRequirement.id
          ? {
              id: req.id,
              name: data.name,
              type: SimulationObjectType.ResourceRequirement,
              rootClauses,
            }
          : req
      );
    } else {
      // Create new requirement with generated ID
      const newRequirement = {
        id: `rr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: data.name,
        type: SimulationObjectType.ResourceRequirement,
        rootClauses,
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
        <div className="text-xs text-red-500 mt-1">
          Activity data missing required properties
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {/* Swimlane Resource Banner */}
        {referenceData?.swimLaneContainment && (
          <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded text-xs">
            <div className="font-medium text-blue-700">
              Swimlane Resource: {referenceData.swimLaneContainment.resourceName}
            </div>
            <div className="text-blue-600 mt-0.5">
              {referenceData.swimLaneContainment.assignmentMode === 'runtime-derive'
                ? 'Seize/Release actions auto-injected at simulation time'
                : 'Explicit assignment mode — manage resource actions manually'}
            </div>
          </div>
        )}

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
                  title={tab.tooltip}
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
            <div className="space-y-2">
              {/* Name Section */}
                <div>
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-medium text-gray-700">
                      Activity Name
                    </label>
                    <span title="A unique name identifying this activity in the simulation model and results.">
                      <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    </span>
                  </div>
                  <input
                    type="text"
                    name="name"
                    className="w-full px-2 py-1.5 text-xs border rounded"
                    value={localActivityDraft.name}
                    onChange={handleInputChange}
                    placeholder="Enter activity name"
                    onBlur={saveNow}
                  />
                  {nameError && (
                    <p className="text-xs text-red-500 mt-1">{nameError}</p>
                  )}
                </div>

                {/* Activity Capacity */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-medium text-gray-700">
                      Activity Capacity
                    </label>
                    <span title="Maximum entities processed simultaneously in this activity.">
                      <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    </span>
                  </div>
                  <input
                    type="number"
                    name="capacity"
                    className="w-full px-2 py-1 text-xs border rounded"
                    value={localActivityDraft.capacity}
                    onChange={handleInputChange}
                    min="1"
                    onBlur={saveNow}
                  />
                </div>

                {/* Advanced Settings Collapsible Section */}
                <div className="pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setAdvancedSettingsOpen(!advancedSettingsOpen)}
                    className="flex items-center gap-1 w-full text-left text-xs font-medium text-gray-700 hover:text-gray-900"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        advancedSettingsOpen ? "" : "-rotate-90"
                      }`}
                    />
                    Advanced Settings
                  </button>

                  {advancedSettingsOpen && (
                    <div className="mt-2 ml-5 space-y-2">
                      {/* Inbound Queue */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <label className="text-xs font-medium text-gray-700">
                            Inbound Queue Capacity
                          </label>
                          <span title="Maximum entities waiting to enter this activity. Enter 999999 for unlimited (∞).">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                          </span>
                        </div>
                        <input
                          type="number"
                          name="inboundQueueCapacity"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={localActivityDraft.inboundQueueCapacity}
                          onChange={handleInputChange}
                          min="0"
                          max={INFINITY_DISPLAY_VALUE}
                          onBlur={saveNow}
                        />
                      </div>

                      {/* Outbound Queue */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <label className="text-xs font-medium text-gray-700">
                            Outbound Queue Capacity
                          </label>
                          <span title="Maximum entities waiting to exit this activity. Enter 999999 for unlimited (∞).">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                          </span>
                        </div>
                        <input
                          type="number"
                          name="outboundQueueCapacity"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={localActivityDraft.outboundQueueCapacity}
                          onChange={handleInputChange}
                          min="0"
                          max={INFINITY_DISPLAY_VALUE}
                          onBlur={saveNow}
                        />
                      </div>
                    </div>
                  )}
                </div>
            </div>
          )}

          {activeTab === "actions" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700">Actions</span>
                <button
                  type="button"
                  onClick={handleAddAction}
                  className="flex items-center gap-1 px-1 py-0.5 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
                >
                  <Plus className="w-3 h-3" />
                  Add
                </button>
              </div>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localActivityDraft.actions.map((_, i) => `action-${i}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-1">
                    {localActivityDraft.actions.map((action, index) => (
                      <SortableActionItem
                        key={`action-${index}`}
                        id={`action-${index}`}
                        activityId={localActivityDraft.id}
                        action={action}
                        index={index}
                        expanded={expandedActions.has(index)}
                        onToggleExpand={() => toggleActionExpanded(index)}
                        onChange={(updatedAction) =>
                          handleActionChange(index, updatedAction)
                        }
                        onDelete={() => handleActionDelete(index)}
                        resourceRequirements={referenceData?.resourceRequirements}
                        availableResources={referenceData?.resources}
                        availableEntities={referenceData?.entities}
                        availableActivities={referenceData?.activities?.filter(
                          (a) => a.id !== localActivityDraft.id
                        )}
                        onOpenRequirementModal={handleOpenRequirementModal}
                        onCreateRequirement={handleCreateRequirement}
                        states={states}
                        onNavigateToModelEditor={() => selectElement('model', { targetTab: 'states' })}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          )}

          {activeTab === "financial" && (
            <div className="space-y-1">
                {/* Enable Financial Tracking */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="financialEnabled"
                    checked={
                      localActivityDraft.financialProperties?.enabled || false
                    }
                    onChange={(e) =>
                      handleFinancialChange("enabled", e.target.checked)
                    }
                    className="w-3 h-3"
                  />
                  <label
                    htmlFor="financialEnabled"
                    className="text-xs font-medium text-gray-700"
                  >
                    Enable Financial Tracking
                  </label>
                  <span title="When enabled, the simulation tracks costs for this activity including fixed costs, per-entity charges, and time-based rates. Financial data appears in simulation results.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>

                {/* Cost fields - Only shown when financial tracking is enabled */}
                {localActivityDraft.financialProperties?.enabled && (
                  <>
                    <div className="space-y-0.5">
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <label className="text-xs text-gray-600">
                            Fixed Cost
                          </label>
                          <span title="One-time cost incurred each time this activity is activated or started, regardless of how many entities are processed">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                          </span>
                        </div>
                        <input
                          type="number"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={
                            localActivityDraft.financialProperties?.fixedCost ||
                            0
                          }
                          onChange={(e) =>
                            handleFinancialChange(
                              "fixedCost",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          onBlur={saveNow}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <label className="text-xs text-gray-600">
                            Cost Per Entity
                          </label>
                          <span title="Cost charged for each entity that completes processing through this activity. Total cost = (number of entities processed) × (cost per entity)">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                          </span>
                        </div>
                        <input
                          type="number"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={
                            localActivityDraft.financialProperties
                              ?.costPerEntityProcessed || 0
                          }
                          onChange={(e) =>
                            handleFinancialChange(
                              "costPerEntityProcessed",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          onBlur={saveNow}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <label className="text-xs text-gray-600">
                            Cost/Hr Active
                          </label>
                          <span title="Hourly cost incurred while the activity is actively processing entities. Charged proportionally based on actual processing time.">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                          </span>
                        </div>
                        <input
                          type="number"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={
                            localActivityDraft.financialProperties
                              ?.costPerHourActive || 0
                          }
                          onChange={(e) =>
                            handleFinancialChange(
                              "costPerHourActive",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          onBlur={saveNow}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1 mb-0.5">
                          <label className="text-xs text-gray-600">
                            Cost/Hr Idle
                          </label>
                          <span title="Hourly cost incurred while the activity is available but not actively processing entities. Useful for modeling overhead or standby costs.">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                          </span>
                        </div>
                        <input
                          type="number"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={
                            localActivityDraft.financialProperties
                              ?.costPerHourIdle || 0
                          }
                          onChange={(e) =>
                            handleFinancialChange(
                              "costPerHourIdle",
                              parseFloat(e.target.value) || 0
                            )
                          }
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          onBlur={saveNow}
                        />
                      </div>
                    </div>

                    {/* Resource Cost Multiplier */}
                    <div className="pt-0.5 border-t">
                      <div className="flex items-center gap-1 mb-0.5">
                        <label className="text-xs text-gray-600">
                          Resource Cost Multiplier
                        </label>
                        <span title="Multiplier applied to resource costs when resources are used by this activity. For example, 1.5 means resource costs are increased by 50%, 0.5 means costs are halved. Default is 1.0 (no adjustment).">
                          <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        </span>
                      </div>
                      <input
                        type="number"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={
                          localActivityDraft.financialProperties
                            ?.resourceCostMultiplier || 1
                        }
                        onChange={(e) =>
                          handleFinancialChange(
                            "resourceCostMultiplier",
                            parseFloat(e.target.value) || 1
                          )
                        }
                        min="0"
                        step="0.1"
                        placeholder="1.0"
                        onBlur={saveNow}
                      />
                    </div>
                  </>
                )}
              </div>
          )}

          {activeTab === "failure" && (
            <div className="space-y-1">
              {/* Enable Failure Simulation */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="failureEnabled"
                  checked={
                    localActivityDraft.failureProperties?.enabled || false
                  }
                  onChange={(e) =>
                    handleFailureChange("enabled", e.target.checked)
                  }
                  className="w-3 h-3"
                />
                <label
                  htmlFor="failureEnabled"
                  className="text-xs font-medium text-gray-700"
                >
                  Enable Failure Simulation
                </label>
                <span title="When enabled, the activity will periodically break down based on MTBF timing and require repair time (MTTR) before resuming. Simulates equipment failures and maintenance.">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>

              {/* Failure fields - Only shown when failure is enabled */}
              {localActivityDraft.failureProperties?.enabled && (
                <div className="space-y-2">
                  {/* MTBF Duration */}
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <label className="text-xs font-medium text-gray-700">
                        MTBF Duration
                      </label>
                      <span title="Mean Time Between Failures — average time the activity operates before a failure occurs">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <EnhancedDurationEditor
                      periodUnit={
                        localActivityDraft.failureProperties?.mtbfDuration
                          ?.durationPeriodUnit ?? PeriodUnit.HOURS
                      }
                      distribution={
                        localActivityDraft.failureProperties?.mtbfDuration
                          ?.distribution ?? ConstantDistribution.create(8)
                      }
                      onChange={(periodUnit, distribution) =>
                        handleFailureChange(
                          "mtbfDuration",
                          new Duration(periodUnit, distribution)
                        )
                      }
                      compact={true}
                    />
                  </div>

                  {/* MTTR Duration */}
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <label className="text-xs font-medium text-gray-700">
                        MTTR Duration
                      </label>
                      <span title="Mean Time To Repair — average time required to repair the activity after a failure">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <EnhancedDurationEditor
                      periodUnit={
                        localActivityDraft.failureProperties?.mttrDuration
                          ?.durationPeriodUnit ?? PeriodUnit.MINUTES
                      }
                      distribution={
                        localActivityDraft.failureProperties?.mttrDuration
                          ?.distribution ?? ConstantDistribution.create(30)
                      }
                      onChange={(periodUnit, distribution) =>
                        handleFailureChange(
                          "mttrDuration",
                          new Duration(periodUnit, distribution)
                        )
                      }
                      compact={true}
                    />
                  </div>

                  {/* Failure Clock Mode */}
                  <div>
                    <div className="flex items-center gap-1 mb-0.5">
                      <label className="text-xs font-medium text-gray-700">
                        Failure Clock Mode
                      </label>
                      <span title="Determines how the MTBF timer advances: continuously (wall clock) or only during active processing">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <select
                      className="w-full px-2 py-1 text-xs border rounded bg-white"
                      value={
                        localActivityDraft.failureProperties?.failureClockMode ??
                        FailureClockMode.WALL_CLOCK
                      }
                      onChange={(e) =>
                        handleFailureChange(
                          "failureClockMode",
                          e.target.value as FailureClockMode
                        )
                      }
                    >
                      <option value={FailureClockMode.WALL_CLOCK}>
                        Wall Clock — runs continuously
                      </option>
                      <option value={FailureClockMode.ACTIVE_TIME}>
                        Active Time — runs only while processing
                      </option>
                    </select>
                  </div>

                  {/* Repair Resource Requirement */}
                  <div className="pt-1 border-t">
                    <div className="flex items-center gap-1 mb-0.5">
                      <label className="text-xs font-medium text-gray-700">
                        Repair Resource Requirement
                      </label>
                      <span title="Optional resource requirement that must be acquired before repair can begin">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <select
                        className="flex-1 px-2 py-1 text-xs border rounded bg-white"
                        value={
                          localActivityDraft.failureProperties
                            ?.repairResourceRequirementId || ""
                        }
                        onChange={(e) =>
                          handleFailureChange(
                            "repairResourceRequirementId",
                            e.target.value
                          )
                        }
                      >
                        <option value="">None (no resource needed)</option>
                        {referenceData?.resourceRequirements?.map((req) => (
                          <option key={req.id} value={req.id}>
                            {req.name}
                          </option>
                        ))}
                      </select>
                      {localActivityDraft.failureProperties
                        ?.repairResourceRequirementId && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenRequirementModal(
                              localActivityDraft.failureProperties!
                                .repairResourceRequirementId
                            )
                          }
                          className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                          title="Edit resource requirement"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleCreateRequirement}
                        className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                        title="Create new resource requirement"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Resource requirement preview */}
                    {localActivityDraft.failureProperties
                      ?.repairResourceRequirementId && (() => {
                      const req = referenceData?.resourceRequirements?.find(
                        (r) =>
                          r.id ===
                          localActivityDraft.failureProperties
                            ?.repairResourceRequirementId
                      );
                      if (!req) return null;
                      return (
                        <div className="mt-1 p-1.5 bg-gray-50 border rounded text-xs text-gray-600">
                          <span className="font-medium">{req.name}</span>
                          {req.rootClauses && req.rootClauses.length > 0 && (
                            <span className="ml-1">
                              ({req.rootClauses.length} clause
                              {req.rootClauses.length !== 1 ? "s" : ""})
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "connectors" && (
            <RoutingConfigurationContent
                localData={localActivityDraft}
                handleChange={handleConnectTypeChange}
                outgoingConnectors={outgoingConnectors}
                referenceData={
                  referenceData || {
                    activities: [],
                    resources: [],
                    entities: [],
                    resourceRequirements: [],
                  }
                }
                states={states}
                showHeader={false}
              />
          )}

          {/* Temporarily hidden - states managed at Model level
          {activeTab === "states" && (
            <StatesEditor
                states={states}
                onStatesChange={onStatesChange}
                defaultComponentType={ComponentType.ACTIVITY}
              />
          )}
          */}
        </div>

        {/* Validation banners + auto-save status */}
        <div className="pt-2 border-t">
            {/* Validation Error Messages */}
            {hasSplitValidationError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <strong>Fix to save:</strong> Split action requires a destination activity.
                {splitActionsWithoutDestination.length > 1 && (
                  <span> ({splitActionsWithoutDestination.length} actions need destinations)</span>
                )}
              </div>
            )}
            {hasCreateValidationError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <strong>Fix to save:</strong> Create action requires entity template and destination.
                {createActionsWithMissingFields.length > 1 && (
                  <span> ({createActionsWithMissingFields.length} actions need configuration)</span>
                )}
              </div>
            )}
            {hasJoinValidationError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <strong>Fix to save:</strong> Join action requires match state and destination.
                {joinActionsWithMissingFields.length > 1 && (
                  <span> ({joinActionsWithMissingFields.length} actions need configuration)</span>
                )}
              </div>
            )}
            {hasBranchValidationError && (
              <div className="mb-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                <strong>Fix to save:</strong> Branch action requires a condition to be set.
                {branchActionsWithMissingCondition.length > 1 && (
                  <span> ({branchActionsWithMissingCondition.length} actions need configuration)</span>
                )}
              </div>
            )}
            {/* Auto-save status (validation banners above provide details on what to fix) */}
            <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
          </div>
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
