import React from "react";
import {
  Action,
  ActionType,
  AssignAction,
  SeizeAction,
  ReleaseAction,
  DelayAction,
  DelayWithResourceAction,
  SplitAction,
  createSplitAction,
  Duration,
  PeriodUnit,
  Distribution,
  ResourceRequirement,
  DistributionType,
  StateListManager,
} from "@quodsi/shared";
import { X, Edit2, Info, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import StateModificationsEditor from "./StateModificationsEditor";
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
  onOpenRequirementModal?: (requirementId: string) => void;
  onCreateRequirement?: () => void;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  states?: StateListManager;
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
};

const ACTION_TYPE_SHORT_LABELS: Record<ActionType, string> = {
  [ActionType.ASSIGN]: "Set State",
  [ActionType.SEIZE]: "Seize Res",
  [ActionType.RELEASE]: "Release Res",
  [ActionType.DELAY]: "Delay",
  [ActionType.DELAY_WITH_RESOURCE]: "Delay w/Res",
  [ActionType.SPLIT]: "Split",
};

const ACTION_TYPE_DESCRIPTIONS: Record<ActionType, string> = {
  [ActionType.ASSIGN]: "Modify entity state values",
  [ActionType.SEIZE]: "Acquire resources (waits until available)",
  [ActionType.RELEASE]: "Release previously seized resources",
  [ActionType.DELAY]: "Wait for a duration (no resources)",
  [ActionType.DELAY_WITH_RESOURCE]: "Classic operation: seize, delay, release",
  [ActionType.SPLIT]: "Replace entity with multiple new entities",
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
  resourceRequirements: ResourceRequirement[]
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
      resourceText = `${splitAction.count} entities`;
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
  onOpenRequirementModal,
  onCreateRequirement,
  dragHandleProps,
  states,
}) => {
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
        newAction = createSplitAction(2);
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
    label: string = "Resource Requirement"
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
            <option value="">None</option>
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
          "Resource to Release"
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
        return (
          <div className="space-y-2">
            {/* Split Count */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Split Count
                  <span title="Number of new entities to create (original entity is disposed)">
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

            {/* Entity Template */}
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Entity Template
                  <span title="Template for new entities. Use 'Same as original' to keep the same type.">
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

            {/* Split Index State - commented out for MVP
            <div>
              <label className="block text-xs text-gray-600 mb-0.5">
                <span className="inline-flex items-center gap-1">
                  Split Index State
                  <span title="Optional state name to store the split index (0, 1, 2...) on each new entity">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </span>
              </label>
              <input
                type="text"
                value={splitAction.splitIndexState || ""}
                onChange={(e) =>
                  onChange({
                    ...splitAction,
                    splitIndexState: e.target.value || null,
                  })
                }
                placeholder="e.g., item_number"
                className="w-full px-1 py-0.5 text-xs border rounded"
              />
            </div>
            */}

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
              />
            )}
          </div>
        );
      }

      default:
        return <div className="text-xs text-red-500">Unknown action type</div>;
    }
  };

  // Get summary for collapsed view
  const summary = getActionSummary(action, resourceRequirements);

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
              {(Object.values(ActionType) as ActionType[]).map((type) => (
                <option key={type} value={type}>
                  {ACTION_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </div>

          {/* Action-specific content */}
          {renderActionContent()}
        </div>
      )}
    </div>
  );
};
