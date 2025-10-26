import React from "react";
import { Edit2, Trash2, ExternalLink } from "lucide-react";
import { StateModification, State, StateType, ComponentType } from "@quodsi/shared";

interface Props {
  modification: StateModification;
  state?: State;
  onEdit: () => void;
  onDelete: () => void;
}

const StateModificationListItem: React.FC<Props> = ({
  modification,
  state,
  onEdit,
  onDelete,
}) => {
  // Get type badge color based on state data type
  const getTypeBadgeColor = (dataType?: StateType): string => {
    switch (dataType) {
      case StateType.NUMBER:
        return "bg-blue-100 text-blue-700";
      case StateType.STRING:
        return "bg-green-100 text-green-700";
      case StateType.BOOLEAN:
        return "bg-purple-100 text-purple-700";
      case StateType.CATEGORY:
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  // Format value for display
  const formatValue = (value: number | string | boolean): string => {
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    if (typeof value === "string") {
      return `"${value}"`;
    }
    return String(value);
  };

  // Check if this is a cross-component modification
  const isCrossComponent =
    modification.componentUniqueId || modification.targetComponentType;

  return (
    <div className="border rounded bg-white hover:bg-gray-50 transition-colors">
      <div className="p-2">
        <div className="flex items-start justify-between gap-2">
          {/* Left side: State info and operation */}
          <div className="flex-1 min-w-0">
            {/* State name and type */}
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs font-medium text-gray-900 truncate">
                {modification.stateName}
              </span>
              {state && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${getTypeBadgeColor(
                    state.dataType
                  )}`}
                >
                  {state.dataType}
                </span>
              )}
              {isCrossComponent && (
                <span title="Cross-component access">
                  <ExternalLink className="w-3 h-3 text-blue-500" />
                </span>
              )}
            </div>

            {/* Operation and value */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">
                {modification.operation}
              </span>
              <span className="text-xs font-mono text-gray-900">
                {formatValue(modification.value)}
              </span>
            </div>

            {/* Cross-component info if applicable */}
            {isCrossComponent && (
              <div className="mt-1 text-xs text-gray-500">
                {modification.targetComponentType && (
                  <span className="mr-2">
                    Target: {modification.targetComponentType}
                  </span>
                )}
                {modification.componentUniqueId && (
                  <span className="font-mono">
                    ID: {modification.componentUniqueId}
                  </span>
                )}
              </div>
            )}

            {/* State not found warning */}
            {!state && (
              <div className="mt-1 text-xs text-red-600">
                ⚠ State not found: {modification.stateUniqueId}
              </div>
            )}
          </div>

          {/* Right side: Action buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEdit}
              className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Edit modification"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onDelete}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
              title="Delete modification"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StateModificationListItem;
