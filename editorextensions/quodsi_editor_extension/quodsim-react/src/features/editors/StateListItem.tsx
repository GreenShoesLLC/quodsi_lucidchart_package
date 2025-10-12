import React from "react";
import { Edit, Trash2, Hash, Type, ToggleLeft, List } from "lucide-react";
import { State, StateType, ComponentType } from "@quodsi/shared";

interface Props {
  state: State;
  onEdit: (state: State) => void;
  onDelete: (state: State) => void;
}

const StateListItem: React.FC<Props> = ({ state, onEdit, onDelete }) => {
  const getComponentTypeLabel = (type: ComponentType): string => {
    switch (type) {
      case ComponentType.MODEL:
        return "Model";
      case ComponentType.ENTITY:
        return "Entity";
      case ComponentType.RESOURCE:
        return "Resource";
      case ComponentType.ACTIVITY:
        return "Activity";
      default:
        return type;
    }
  };

  const formatInitialValue = (value: number | string | boolean): string => {
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    return String(value);
  };

  const getStateTypeIcon = (type: StateType): JSX.Element => {
    switch (type) {
      case StateType.NUMBER:
        return (
          <div className="p-0.5 rounded bg-blue-100" title="Number">
            <Hash className="w-3.5 h-3.5 text-blue-700" />
          </div>
        );
      case StateType.STRING:
        return (
          <div className="p-0.5 rounded bg-green-100" title="String">
            <Type className="w-3.5 h-3.5 text-green-700" />
          </div>
        );
      case StateType.BOOLEAN:
        return (
          <div className="p-0.5 rounded bg-purple-100" title="Boolean">
            <ToggleLeft className="w-3.5 h-3.5 text-purple-700" />
          </div>
        );
      case StateType.CATEGORY:
        return (
          <div className="p-0.5 rounded bg-orange-100" title="Category">
            <List className="w-3.5 h-3.5 text-orange-700" />
          </div>
        );
      default:
        return (
          <div className="p-0.5 rounded bg-gray-100" title={type}>
            <Hash className="w-3.5 h-3.5 text-gray-700" />
          </div>
        );
    }
  };

  return (
    <div className="border rounded p-2 bg-white hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Row 1: State name (full width) */}
          <div className="mb-1">
            <span className="text-xs font-medium text-gray-900 break-words">
              {state.name}
            </span>
          </div>

          {/* Row 2: Type icon and component badge */}
          <div className="flex items-center gap-2 mb-1">
            {getStateTypeIcon(state.dataType)}
            <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
              {getComponentTypeLabel(state.componentType)}
            </span>
          </div>

          {state.description && (
            <p className="text-xs text-gray-500 mb-1">{state.description}</p>
          )}

          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-600">
            <div>
              <span className="text-gray-500">Initial:</span>{" "}
              <span className="font-medium">{formatInitialValue(state.initialValue)}</span>
            </div>

            {state.dataType === StateType.CATEGORY && state.categoryValues && (
              <div>
                <span className="text-gray-500">Values:</span>{" "}
                <span className="font-medium">{state.categoryValues.join(", ")}</span>
              </div>
            )}

            <div>
              <span className="text-gray-500">Statistics:</span>{" "}
              <span className="font-medium">
                {state.collectStatistics ? "Yes" : "No"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-1 ml-2 shrink-0">
          <button
            type="button"
            onClick={() => onEdit(state)}
            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
            title="Edit state"
          >
            <Edit className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(state)}
            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
            title="Delete state"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default StateListItem;
