import React, { useState } from "react";
import {
  Action,
  ActionType,
  AssignAction,
  SeizeAction,
  ReleaseAction,
  DelayAction,
  DelayWithResourceAction,
  SplitAction,
  CreateAction,
  DisposeAction,
  JoinAction,
  LoopAction,
  BranchAction,
  createSplitAction,
  createCreateAction,
  createDisposeAction,
  createJoinAction,
  createLoopAction,
  createBranchAction,
  createDefaultAction,
  Duration,
  PeriodUnit,
  Distribution,
  ResourceRequirement,
  DistributionType,
  StateListManager,
  StateType,
  State,
  StateCondition,
} from "@quodsi/shared";
import { X, Edit2, Info, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import StateModificationsEditor from "./StateModificationsEditor";
import { StateConditionEditor } from "./StateConditionEditor";
import { convertRootClausesToStructure, generatePreview } from "../../utils/resourceRequirementConverter";

interface ActionEditorProps {
  activityId?: string;
  action: Action;
  index: number;
  expanded: boolean;
  onToggleExpand: () => void;
  onDelete: (index: number) => void;
  onChange: (updatedAction: Action) => void;
  resourceRequirements?: ResourceRequirement[];
  availableResources?: Array<{ id: string; name: string }>;
  availableEntities?: Array<{ id: string; name: string }>;
  availableActivities?: Array<{ id: string; name: string }>;
  onOpenRequirementModal?: (requirementId: string) => void;
  onCreateRequirement?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  states?: StateListManager;
  /** Callback to navigate to Model Editor (for creating states) */
  onNavigateToModelEditor?: () => void;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  [ActionType.ASSIGN]: "Assign State",
  [ActionType.SEIZE]: "Seize Resource",
  [ActionType.RELEASE]: "Release Resource",
  [ActionType.DELAY]: "Delay",
  [ActionType.DELAY_WITH_RESOURCE]: "Delay with Resource",
  [ActionType.SPLIT]: "Split Entity",
  [ActionType.CREATE]: "Create Entity",
  [ActionType.DISPOSE]: "Dispose Entity",
  [ActionType.JOIN]: "Join Entities",
  [ActionType.LOOP]: "Loop",
  [ActionType.BRANCH]: "Branch",
};

const ACTION_TYPE_SHORT_LABELS: Record<ActionType, string> = {
  [ActionType.ASSIGN]: "Set State",
  [ActionType.SEIZE]: "Seize Res",
  [ActionType.RELEASE]: "Release Res",
  [ActionType.DELAY]: "Delay",
  [ActionType.DELAY_WITH_RESOURCE]: "Process",
  [ActionType.SPLIT]: "Split",
  [ActionType.CREATE]: "Create",
  [ActionType.DISPOSE]: "Dispose",
  [ActionType.JOIN]: "Join",
  [ActionType.LOOP]: "Loop",
  [ActionType.BRANCH]: "Branch",
};

const ACTION_TYPE_DESCRIPTIONS: Record<ActionType, string> = {
  [ActionType.ASSIGN]: "Modify entity state values",
  [ActionType.SEIZE]: "Acquire resources (waits until available)",
  [ActionType.RELEASE]: "Release previously seized resources",
  [ActionType.DELAY]: "Wait for a duration (no resources)",
  [ActionType.DELAY_WITH_RESOURCE]: "Classic operation: seize, delay, release",
  [ActionType.SPLIT]: "Replace entity with multiple new entities",
  [ActionType.CREATE]: "Spawn a new entity (original continues)",
  [ActionType.DISPOSE]: "Terminates the entity immediately. The entity will be removed from the simulation and will not continue to subsequent activities. Use for quality control, conditional termination, or canceling work items.",
  [ActionType.JOIN]: "Wait for entities with matching state to combine",
  [ActionType.LOOP]: "Repeat a set of actions multiple times",
  [ActionType.BRANCH]: "Conditionally execute actions based on state",
};

const PERIOD_UNIT_SHORT: Record<PeriodUnit, string> = {
  [PeriodUnit.SECONDS]: "sec",
  [PeriodUnit.MINUTES]: "min",
  [PeriodUnit.HOURS]: "hr",
  [PeriodUnit.DAYS]: "day",
};

const DISTRIBUTION_TYPE_SHORT: Record<string, string> = {
  [DistributionType.CONSTANT]: "Const",
  [DistributionType.UNIFORM]: "Unif",
  [DistributionType.NORMAL]: "Norm",
  [DistributionType.EXPONENTIAL]: "Exp",
  [DistributionType.TRIANGULAR]: "Tri",
};

// ============================================================================
// SUMMARY GENERATOR
// ============================================================================

interface ActionSummary {
  typeLabel: string;
  durationText: string;
  resourceText: string;
}

function getActionSummary(
  action: Action,
  resourceRequirements: ResourceRequirement[],
  availableActivities: Array<{ id: string; name: string }> = []
): ActionSummary {
  const typeLabel = ACTION_TYPE_SHORT_LABELS[action.actionType];
  let durationText = "-";
  let resourceText = "-";

  const getRequirementName = (id: string | null): string => {
    if (!id) return "-";
    const req = resourceRequirements.find((r) => r.id === id);
    return req?.name || "Unknown";
  };

  const formatDuration = (duration: Duration): string => {
    const unit = PERIOD_UNIT_SHORT[duration.durationPeriodUnit] || "?";
    const dist = duration.distribution;
    const distType = DISTRIBUTION_TYPE_SHORT[dist.distributionType] || dist.distributionType;

    // Get the primary value based on distribution type
    let value = "";
    const params = dist.parameters;
    if (params) {
      if ("value" in params && params.value !== undefined) {
        value = String(params.value);
      } else if ("mean" in params && params.mean !== undefined) {
        value = String(params.mean);
      } else if ("minimum" in params && params.minimum !== undefined) {
        value = String(params.minimum);
      }
    }

    return value ? `${value} ${unit} ${distType}` : `${distType}`;
  };

  switch (action.actionType) {
    case ActionType.ASSIGN: {
      const assignAction = action as AssignAction;
      const count = assignAction.modifications?.length || 0;
      resourceText = count > 0 ? `${count} mod${count > 1 ? "s" : ""}` : "No mods";
      break;
    }
    case ActionType.SEIZE: {
      const seizeAction = action as SeizeAction;
      resourceText = getRequirementName(seizeAction.resourceRequirementId || null);
      break;
    }
    case ActionType.RELEASE: {
      const releaseAction = action as ReleaseAction;
      resourceText = getRequirementName(releaseAction.resourceRequirementId || null);
      break;
    }
    case ActionType.DELAY: {
      const delayAction = action as DelayAction;
      durationText = formatDuration(delayAction.duration);
      break;
    }
    case ActionType.DELAY_WITH_RESOURCE: {
      const dwrAction = action as DelayWithResourceAction;
      durationText = formatDuration(dwrAction.duration);
      resourceText = getRequirementName(dwrAction.resourceRequirementId);
      if (dwrAction.keepResource) {
        resourceText += " (keep)";
      }
      break;
    }
    case ActionType.SPLIT: {
      const splitAction = action as SplitAction;
      const destActivity = splitAction.destinationId
        ? availableActivities.find((a) => a.id === splitAction.destinationId)
        : null;
      const destName = destActivity?.name || (splitAction.destinationId ? "Unknown" : "Not set");
      resourceText = `${splitAction.count} → ${destName}`;
      break;
    }
    case ActionType.CREATE: {
      const createAction = action as CreateAction;
      const destActivity = createAction.destinationId
        ? availableActivities.find((a) => a.id === createAction.destinationId)
        : null;
      const destName = destActivity?.name || (createAction.destinationId ? "Unknown" : "Not set");
      resourceText = `→ ${destName}`;
      break;
    }
    case ActionType.DISPOSE: {
      resourceText = "Terminates entity";
      break;
    }
    case ActionType.JOIN: {
      const joinAction = action as JoinAction;
      const destActivity = joinAction.destinationId
        ? availableActivities.find((a) => a.id === joinAction.destinationId)
        : null;
      const destName = destActivity?.name || (joinAction.destinationId ? "Unknown" : "Not set");
      const matchState = joinAction.matchState || "Not set";
      resourceText = `${joinAction.joinCount}× ${matchState} → ${destName}`;
      break;
    }
    case ActionType.LOOP: {
      const loopAction = action as LoopAction;
      const actionCount = loopAction.actions?.length || 0;
      resourceText = `${loopAction.count}× (${actionCount} action${actionCount !== 1 ? "s" : ""})`;
      break;
    }
    case ActionType.BRANCH: {
      const branchAction = action as BranchAction;
      const trueCount = branchAction.ifTrue?.length || 0;
      const falseCount = branchAction.ifFalse?.length || 0;
      const conditionText = branchAction.condition
        ? `${branchAction.condition.stateName} ${branchAction.condition.comparison} ${branchAction.condition.value}`
        : "No condition";
      resourceText = `${conditionText} (${trueCount}/${falseCount})`;
      break;
    }
  }

  return { typeLabel, durationText, resourceText };
}

// ============================================================================
// COMPONENT
// ============================================================================

export const ActionEditor: React.FC<ActionEditorProps> = ({
  activityId,
  action,
  index,
  expanded,
  onToggleExpand,
  onDelete,
  onChange,
  resourceRequirements = [],
  availableResources = [],
  availableEntities = [],
  availableActivities = [],
  onOpenRequirementModal,
  onCreateRequirement,
  dragHandleProps,
  states,
  onNavigateToModelEditor,
}) => {
  const [conditionExpanded, setConditionExpanded] = useState(false);

  const getResourceName = (id: string): string => {
    return availableResources.find((r) => r.id === id)?.name || "Unknown";
  };

  const generateRequirementPreview = (req: ResourceRequirement): string => {
    const structure = convertRootClausesToStructure(req.rootClauses);
    return generatePreview(structure, getResourceName);
  };

  const handleActionTypeChange = (newType: ActionType) => {
    let newAction: Action;

    switch (newType) {
      case ActionType.ASSIGN:
        newAction = {
          actionType: ActionType.ASSIGN,
          modifications: [],
        } as AssignAction;
        break;
      case ActionType.SEIZE:
        newAction = {
          actionType: ActionType.SEIZE,
          resourceRequirementId: "",
        } as SeizeAction;
        break;
      case ActionType.RELEASE:
        newAction = {
          actionType: ActionType.RELEASE,
          resourceRequirementId: "",
        } as ReleaseAction;
        break;
      case ActionType.DELAY:
        newAction = {
          actionType: ActionType.DELAY,
          duration: new Duration(),
        } as DelayAction;
        break;
      case ActionType.DELAY_WITH_RESOURCE:
        newAction = {
          actionType: ActionType.DELAY_WITH_RESOURCE,
          resourceRequirementId: null,
          duration: new Duration(),
          keepResource: false,
          stateModifications: [],
        } as DelayWithResourceAction;
        break;
      case ActionType.SPLIT:
        newAction = createSplitAction(1);
        break;
      case ActionType.CREATE:
        newAction = createCreateAction();
        break;
      case ActionType.DISPOSE:
        newAction = createDisposeAction();
        break;
      case ActionType.JOIN:
        newAction = createJoinAction();
        break;
      case ActionType.LOOP:
        newAction = createLoopAction();
        break;
      case ActionType.BRANCH:
        newAction = createBranchAction();
        break;
      default:
        return;
    }

    onChange(newAction);
  };

  // Render resource requirement selector
  const renderResourceRequirementSelector = (
    currentRequirementId: string | null,
    onRequirementChange: (newId: string | null) => void,
    label: string = "Resource Requirement",
    emptyOptionLabel: string = "None"
  ) => {
    const selectedRequirement = currentRequirementId
      ? resourceRequirements.find((r) => r.id === currentRequirementId)
      : null;

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const value = e.target.value;
      if (value === "__new__") {
        if (onCreateRequirement) {
          onCreateRequirement();
        }
      } else {
        onRequirementChange(value === "" ? null : value);
      }
    };

    const handleEditRequirement = () => {
      if (currentRequirementId && onOpenRequirementModal) {
        onOpenRequirementModal(currentRequirementId);
      }
    };

    return (
      <div>
        <label className="block text-xs text-gray-600 mb-0.5">
          <span className="inline-flex items-center gap-1">
            {label}
            <span title="Specify which resources are needed for this action.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </span>
        </label>
        <div className="flex gap-1">
          <select
            value={currentRequirementId || ""}
            onChange={handleChange}
            className="flex-1 px-1 py-0.5 text-xs border rounded bg-white"
          >
            <option value="">{emptyOptionLabel}</option>
            {onCreateRequirement && (
              <option value="__new__" className="font-semibold text-blue-600">
                + Create New...
              </option>
            )}
            {resourceRequirements.map((req) => (
              <option key={req.id} value={req.id}>
                {req.name}
              </option>
            ))}
          </select>

          {currentRequirementId &&
            currentRequirementId !== "__new__" &&
            onOpenRequirementModal && (
              <button
                onClick={handleEditRequirement}
                className="px-1 py-0.5 border rounded bg-gray-50 hover:bg-gray-100 transition"
                title="Edit requirement"
              >
                <Edit2 className="w-3 h-3 text-blue-600" />
              </button>
            )}
        </div>

        {selectedRequirement && (
          <div className="mt-0.5 p-1 bg-blue-50 rounded border border-blue-200">
            <div className="text-[10px] text-blue-900 font-medium leading-tight">
              {selectedRequirement.name}
            </div>
            <div className="text-[10px] text-blue-700 leading-tight">
              {generateRequirementPreview(selectedRequirement)}
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render duration editor
  const renderDurationEditor = (
    duration: Duration,
    onDurationChange: (periodUnit: PeriodUnit, distribution: Distribution) => void
  ) => {
    return (
      <EnhancedDurationEditor
        elementId={activityId}
        periodUnit={duration.durationPeriodUnit}
        distribution={duration.distribution}
        onChange={onDurationChange}
        label="Duration"
        compact={true}
      />
    );
  };

  // Render collapsible state condition guard section
  const renderStateConditionGuard = () => {
    const allStates: State[] = states?.getAll() || [];
    const currentCondition = (action as any).stateCondition as StateCondition | null | undefined;
    const hasCondition = !!currentCondition;

    const conditionSummary = hasCondition
      ? `When: ${currentCondition!.stateName} ${currentCondition!.comparison} ${currentCondition!.value}`
      : "No condition (always runs)";

    const handleGuardConditionUpdate = (updatedCondition: StateCondition) => {
      onChange({ ...action, stateCondition: updatedCondition } as Action);
    };

    const handleClearCondition = () => {
      onChange({ ...action, stateCondition: null } as Action);
      setConditionExpanded(false);
    };

    // Don't show if no states available
    if (allStates.length === 0) return null;

    return (
      <div className="border border-gray-200 rounded">
        <button
          type="button"
          onClick={() => setConditionExpanded(!conditionExpanded)}
          className="w-full flex items-center justify-between px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          <span className="inline-flex items-center gap-1">
            {conditionExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <span className={hasCondition ? "font-medium text-blue-700" : ""}>
              {action.actionType === ActionType.BRANCH ? "Run Condition" : "Condition"}
            </span>
          </span>
          <span className={`text-[10px] ${hasCondition ? "text-blue-600" : "text-gray-400"}`}>
            {conditionSummary}
          </span>
        </button>

        {conditionExpanded && (
          <div className="px-2 pb-2 space-y-1">
            <StateConditionEditor
              condition={currentCondition || null}
              states={allStates}
              onChange={handleGuardConditionUpdate}
              onClear={handleClearCondition}
              compact={true}
            />

            <p className="text-[10px] text-gray-400">
              When set, this action only runs if the entity's state matches the condition.
            </p>
          </div>
        )}
      </div>
    );
  };

  // Render action-specific content (expanded view)
  const renderActionContent = () => {
    switch (action.actionType) {
      case ActionType.ASSIGN: {
        const assignAction = action as AssignAction;
        if (!states) {
          return (
            <div className="text-xs text-gray-500 italic">
              No states available for modification
            </div>
          );
        }
        return (
          <StateModificationsEditor
            modifications={assignAction.modifications || []}
            onModificationsChange={(mods) =>
              onChange({
                ...assignAction,
                modifications: mods,
              })
            }
            states={states}
            title="State Modifications"
            description="Changes applied when this action executes"
            allowCrossComponent={true}
            onNavigateToModelEditor={onNavigateToModelEditor}
          />
        );
      }

      case ActionType.SEIZE: {
        const seizeAction = action as SeizeAction;
        return renderResourceRequirementSelector(
          seizeAction.resourceRequirementId || null,
          (newId) =>
            onChange({
              ...seizeAction,
              resourceRequirementId: newId || "",
            }),
          "Resource to Seize"
        );
      }

      case ActionType.RELEASE: {
        const releaseAction = action as ReleaseAction;
        return renderResourceRequirementSelector(
          releaseAction.resourceRequirementId || null,
          (newId) =>
            onChange({
              ...releaseAction,
              resourceRequirementId: newId || "",
            }),
          "Resource to Release",
          "All (release all held resources)"
        );
      }

      case ActionType.DELAY: {
        const delayAction = action as DelayAction;
        return renderDurationEditor(delayAction.duration, (periodUnit, distribution) =>
          onChange({
            ...delayAction,
            duration: {
              ...delayAction.duration,
              durationPeriodUnit: periodUnit,
              distribution,
            },
          })
        );
      }

      case ActionType.DELAY_WITH_RESOURCE: {
        const dwrAction = action as DelayWithResourceAction;
        return (
          <div className="space-y-1">
            {renderDurationEditor(dwrAction.duration, (periodUnit, distribution) =>
              onChange({
                ...dwrAction,
                duration: {
                  ...dwrAction.duration,
                  durationPeriodUnit: periodUnit,
                  distribution,
                },
              })
            )}

            {renderResourceRequirementSelector(
              dwrAction.resourceRequirementId,
              (newId) =>
                onChange({
                  ...dwrAction,
                  resourceRequirementId: newId,
                }),
              "Resource Requirement"
            )}

            {dwrAction.resourceRequirementId && (
              <div>
                <label className="flex items-center gap-1 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={dwrAction.keepResource || false}
                    onChange={(e) =>
                      onChange({
                        ...dwrAction,
                        keepResource: e.target.checked,
                      })
                    }
                    className="w-3 h-3"
                  />
                  Keep resource after delay
                  <span title="If checked, the resource will not be released after this action completes.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </label>
              </div>
            )}
          </div>
        );
      }

      case ActionType.SPLIT: {
        const splitAction = action as SplitAction;
        const isDestinationMissing = !splitAction.destinationId;

        // Get numeric states for split index dropdown
        const numericStates: State[] = states?.getAll().filter(
          (s: State) => s.dataType === StateType.NUMBER
        ) || [];

        return (
          <div className="space-y-2">
            {/* Split Count */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Split Count
                  <span title="Number of new entities to create. The original entity is disposed and replaced with this many new entities.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={splitAction.count}
                  onChange={(e) =>
                    onChange({
                      ...splitAction,
                      count: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-20 px-1 py-0.5 text-xs border rounded"
                />
                <span className="text-xs text-gray-500">entities</span>
              </div>
            </div>

            {/* Destination Activity (Required) */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Destination Activity
                  <span className="text-red-500">*</span>
                  <span title="Activity where split entities will be routed. Must be different from current activity to prevent infinite loops.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <select
                value={splitAction.destinationId || ""}
                onChange={(e) =>
                  onChange({
                    ...splitAction,
                    destinationId: e.target.value || null,
                  })
                }
                className={`w-full px-1 py-0.5 text-xs border rounded bg-white ${
                  isDestinationMissing ? "border-red-300 bg-red-50" : ""
                }`}
              >
                <option value="">Select activity...</option>
                {availableActivities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
              {isDestinationMissing && (
                <div className="mt-0.5 text-[10px] text-red-600">
                  Required - split entities must route to a different activity
                </div>
              )}
            </div>

            {/* Entity Template */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Entity Template
                  <span title="Template for new entities. Use 'Same as original' to keep the same entity type, or select a different template.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <select
                value={splitAction.entityTemplateId || ""}
                onChange={(e) =>
                  onChange({
                    ...splitAction,
                    entityTemplateId: e.target.value || null,
                  })
                }
                className="w-full px-1 py-0.5 text-xs border rounded bg-white"
              >
                <option value="">Same as original</option>
                {availableEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Split Index State */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Split Index State
                  <span title="Optional state to store each entity's position in the split (0, 1, 2...). Useful for tracking which piece of a batch each entity represents.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <select
                value={splitAction.splitIndexState || ""}
                onChange={(e) =>
                  onChange({
                    ...splitAction,
                    splitIndexState: e.target.value || null,
                  })
                }
                className="w-full px-1 py-0.5 text-xs border rounded bg-white"
              >
                <option value="">None</option>
                {numericStates.map((state: State) => (
                  <option key={state.id} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
              {numericStates.length === 0 && (
                <div className="mt-0.5 text-[10px] text-gray-500">
                  No numeric states defined. Create a numeric state to track split index.
                </div>
              )}
            </div>

            {/* State Modifications */}
            {states && (
              <StateModificationsEditor
                modifications={splitAction.modifications || []}
                onModificationsChange={(mods) =>
                  onChange({
                    ...splitAction,
                    modifications: mods,
                  })
                }
                states={states}
                title="State Modifications"
                description="Applied to each new entity"
                allowCrossComponent={true}
                onNavigateToModelEditor={onNavigateToModelEditor}
              />
            )}
          </div>
        );
      }

      case ActionType.CREATE: {
        const createAction = action as CreateAction;
        const isEntityTemplateMissing = !createAction.entityTemplateId;
        const isDestinationMissing = !createAction.destinationId;

        return (
          <div className="space-y-2">
            {/* Entity Template (Required) */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Entity Template
                  <span className="text-red-500">*</span>
                  <span title="Template to use for the new entity. The new entity will be created with this type.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <select
                value={createAction.entityTemplateId || ""}
                onChange={(e) =>
                  onChange({
                    ...createAction,
                    entityTemplateId: e.target.value || null,
                  })
                }
                className={`w-full px-1 py-0.5 text-xs border rounded bg-white ${
                  isEntityTemplateMissing ? "border-red-300 bg-red-50" : ""
                }`}
              >
                <option value="">Select entity template...</option>
                {availableEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
              {isEntityTemplateMissing && (
                <div className="mt-0.5 text-[10px] text-red-600">
                  Required - select the type of entity to create
                </div>
              )}
            </div>

            {/* Destination Activity (Required) */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Destination Activity
                  <span className="text-red-500">*</span>
                  <span title="Activity where the new entity will be routed to begin its processing.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <select
                value={createAction.destinationId || ""}
                onChange={(e) =>
                  onChange({
                    ...createAction,
                    destinationId: e.target.value || null,
                  })
                }
                className={`w-full px-1 py-0.5 text-xs border rounded bg-white ${
                  isDestinationMissing ? "border-red-300 bg-red-50" : ""
                }`}
              >
                <option value="">Select activity...</option>
                {availableActivities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
              {isDestinationMissing && (
                <div className="mt-0.5 text-[10px] text-red-600">
                  Required - select where the new entity will be routed
                </div>
              )}
            </div>

            {/* State Modifications */}
            {states && (
              <StateModificationsEditor
                modifications={createAction.modifications || []}
                onModificationsChange={(mods) =>
                  onChange({
                    ...createAction,
                    modifications: mods,
                  })
                }
                states={states}
                title="State Modifications"
                description="Applied to the new entity"
                allowCrossComponent={true}
                onNavigateToModelEditor={onNavigateToModelEditor}
              />
            )}
          </div>
        );
      }

      case ActionType.DISPOSE: {
        return (
          <div className="text-xs text-gray-500 italic">
            No configuration required.
          </div>
        );
      }

      case ActionType.JOIN: {
        const joinAction = action as JoinAction;
        const isMatchStateMissing = !joinAction.matchState;
        const isDestinationMissing = !joinAction.destinationId;

        // Get all states for match state dropdown
        const allStates: State[] = states?.getAll() || [];

        // Get numeric states for join count state dropdown
        const numericStates: State[] = states?.getAll().filter(
          (s: State) => s.dataType === StateType.NUMBER
        ) || [];

        return (
          <div className="space-y-2">
            {/* Match State (Required) */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Match State
                  <span className="text-red-500">*</span>
                  <span title="State name to group entities by (e.g., 'order_id'). Entities with the same value will be joined.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <select
                value={joinAction.matchState || ""}
                onChange={(e) =>
                  onChange({
                    ...joinAction,
                    matchState: e.target.value || null,
                  })
                }
                className={`w-full px-1 py-0.5 text-xs border rounded bg-white ${
                  isMatchStateMissing ? "border-red-300 bg-red-50" : ""
                }`}
              >
                <option value="">Select state...</option>
                {allStates.map((state: State) => (
                  <option key={state.id} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
              {isMatchStateMissing && (
                <div className="mt-0.5 text-[10px] text-red-600">
                  Required - select which state to match entities by
                </div>
              )}
            </div>

            {/* Join Count */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Join Count
                  <span title="Number of entities to wait for before combining.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={2}
                  value={joinAction.joinCount}
                  onChange={(e) =>
                    onChange({
                      ...joinAction,
                      joinCount: Math.max(2, parseInt(e.target.value) || 2),
                    })
                  }
                  className="w-20 px-1 py-0.5 text-xs border rounded"
                />
                <span className="text-xs text-gray-500">entities</span>
              </div>
            </div>

            {/* Destination Activity (Required) */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Destination Activity
                  <span className="text-red-500">*</span>
                  <span title="Activity where the combined entity will be routed.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <select
                value={joinAction.destinationId || ""}
                onChange={(e) =>
                  onChange({
                    ...joinAction,
                    destinationId: e.target.value || null,
                  })
                }
                className={`w-full px-1 py-0.5 text-xs border rounded bg-white ${
                  isDestinationMissing ? "border-red-300 bg-red-50" : ""
                }`}
              >
                <option value="">Select activity...</option>
                {availableActivities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
              {isDestinationMissing && (
                <div className="mt-0.5 text-[10px] text-red-600">
                  Required - combined entity must route to an activity
                </div>
              )}
            </div>

            {/* Combined Entity Template */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Combined Entity Template
                  <span title="Template for the combined entity. If not set, uses the first entity's template.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <select
                value={joinAction.combinedTemplateId || ""}
                onChange={(e) =>
                  onChange({
                    ...joinAction,
                    combinedTemplateId: e.target.value || null,
                  })
                }
                className="w-full px-1 py-0.5 text-xs border rounded bg-white"
              >
                <option value="">Use first entity's template</option>
                {availableEntities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Join Count State */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Join Count State
                  <span title="Optional state to store the actual number of entities that were joined.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <select
                value={joinAction.joinCountState || ""}
                onChange={(e) =>
                  onChange({
                    ...joinAction,
                    joinCountState: e.target.value || null,
                  })
                }
                className="w-full px-1 py-0.5 text-xs border rounded bg-white"
              >
                <option value="">None</option>
                {numericStates.map((state: State) => (
                  <option key={state.id} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
            </div>

            {/* State Modifications */}
            {states && (
              <StateModificationsEditor
                modifications={joinAction.modifications || []}
                onModificationsChange={(mods) =>
                  onChange({
                    ...joinAction,
                    modifications: mods,
                  })
                }
                states={states}
                title="State Modifications"
                description="Applied to the combined entity"
                allowCrossComponent={true}
                onNavigateToModelEditor={onNavigateToModelEditor}
              />
            )}
          </div>
        );
      }

      case ActionType.LOOP: {
        const loopAction = action as LoopAction;

        return (
          <div className="space-y-2">
            {/* Iterations */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Iterations
                  <span title="Number of times to repeat the nested actions.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={1}
                  value={loopAction.count}
                  onChange={(e) =>
                    onChange({
                      ...loopAction,
                      count: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="w-20 px-1 py-0.5 text-xs border rounded"
                />
                <span className="text-xs text-gray-500">times</span>
              </div>
            </div>

            {/* Loop Actions (Simplified view for MVP) */}
            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800">
                  <p className="font-medium">
                    Loop contains {loopAction.actions?.length || 0} action(s)
                  </p>
                  <p className="mt-1 text-blue-700">
                    This action type is read-only. Nested actions can be configured via model JSON.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      case ActionType.BRANCH: {
        const branchAction = action as BranchAction;
        const isConditionMissing = !branchAction.condition;

        // Get all states for condition dropdown
        const allStates: State[] = states?.getAll() || [];

        return (
          <div className="space-y-2">
            {/* Condition Editor */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Condition
                  <span className="text-red-500">*</span>
                  <span title="The state condition to evaluate. Actions in 'If True' execute when condition passes, otherwise 'If False' actions run.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <StateConditionEditor
                condition={branchAction.condition || null}
                states={allStates}
                onChange={(updatedCondition) => {
                  onChange({
                    ...branchAction,
                    condition: updatedCondition,
                  });
                }}
                compact={true}
                required={true}
              />
              {isConditionMissing && (
                <div className="mt-0.5 text-[10px] text-red-600">
                  Required - set the condition to evaluate
                </div>
              )}
            </div>

            {/* Branch Actions (Simplified view for MVP) */}
            <div className="space-y-1">
              <div className="p-2 bg-green-50 border border-green-200 rounded">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-green-800">
                    <p className="font-medium">
                      If True: {branchAction.ifTrue?.length || 0} action(s)
                    </p>
                    <p className="mt-0.5 text-green-700">
                      Executes when condition is satisfied.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800">
                    <p className="font-medium">
                      If False: {branchAction.ifFalse?.length || 0} action(s)
                    </p>
                    <p className="mt-0.5 text-red-700">
                      Executes when condition is not satisfied.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                <div className="text-[10px] text-gray-600">
                  This action type is read-only. Nested actions can be configured via model JSON.
                </div>
              </div>
            </div>
          </div>
        );
      }

      default:
        return <div className="text-xs text-red-500">Unknown action type</div>;
    }
  };

  // Get summary for collapsed view
  const summary = getActionSummary(action, resourceRequirements, availableActivities);

  return (
    <div className="bg-gray-50 rounded border border-gray-200">
      {/* Summary Row (always visible) */}
      <div
        className={`flex items-center gap-1 px-1 py-1.5 cursor-pointer hover:bg-gray-100 transition-colors ${
          expanded ? "border-b border-gray-200" : ""
        }`}
        onClick={onToggleExpand}
      >
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-3 h-3" />
        </div>

        {/* Index */}
        <span className="text-[10px] font-medium text-gray-500 w-4">{index + 1}.</span>

        {/* Type Label */}
        <span className="text-xs font-medium text-gray-700 w-16 truncate" title={ACTION_TYPE_LABELS[action.actionType]}>
          {summary.typeLabel}
        </span>

        {/* Duration */}
        <span className="text-[10px] text-gray-500 w-20 truncate" title={summary.durationText}>
          {summary.durationText}
        </span>

        {/* Resource */}
        <span className="text-[10px] text-gray-500 flex-1 truncate" title={summary.resourceText}>
          {summary.resourceText}
        </span>

        {/* Expand/Collapse Toggle */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand();
          }}
          className="p-0.5 text-gray-400 hover:text-gray-600"
          title={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
        </button>

        {/* Delete Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(index);
          }}
          className="p-0.5 text-gray-400 hover:text-red-500"
          title="Delete action"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="p-2 space-y-1">
          {/* Action Type Selector */}
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">
              <span className="inline-flex items-center gap-1">
                Action Type
                <span title={ACTION_TYPE_DESCRIPTIONS[action.actionType]}>
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </span>
            </label>
            <select
              value={action.actionType}
              onChange={(e) => handleActionTypeChange(e.target.value as ActionType)}
              className="w-full px-1 py-0.5 text-xs border rounded bg-white"
            >
              {(Object.values(ActionType) as ActionType[])
                .filter((type) => type === action.actionType || (type !== ActionType.LOOP && type !== ActionType.BRANCH))
                .map((type) => (
                <option key={type} value={type}>
                  {ACTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-[10px] text-gray-500 leading-tight">
              {ACTION_TYPE_DESCRIPTIONS[action.actionType]}
            </p>
          </div>

          {/* State Condition Guard */}
          {renderStateConditionGuard()}

          {/* Action-specific content */}
          {renderActionContent()}
        </div>
      )}
    </div>
  );
};
