import React, { useState, useMemo } from "react";
import { Plus, Filter } from "lucide-react";
import { State, StateListManager, ComponentType } from "@quodsi/shared";
import StateFormDialog from "./StateFormDialog";
import StateListItem from "./StateListItem";

interface Props {
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
  defaultComponentType: ComponentType;
  allowFilterChange?: boolean;
}

const StatesEditor: React.FC<Props> = ({
  states,
  onStatesChange,
  defaultComponentType,
  allowFilterChange = true,
}) => {
  const [filterComponentType, setFilterComponentType] = useState<ComponentType | "ALL">(
    defaultComponentType
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | undefined>(undefined);

  // Filter states based on component type
  const filteredStates = useMemo(() => {
    if (filterComponentType === "ALL") {
      return states.getAll();
    }
    return states.getByComponentType(filterComponentType);
  }, [states, filterComponentType]);

  const handleAddState = (state: State) => {
    const updatedStates = new StateListManager();
    states.getAll().forEach((s) => updatedStates.add(s));
    updatedStates.addWithValidation(state);
    onStatesChange(updatedStates);
    setIsAddDialogOpen(false);
  };

  const handleEditState = (originalState: State, updatedState: State) => {
    const allStates = states.getAll();
    const updatedList = allStates.map((s) =>
      s.id === originalState.id ? updatedState : s
    );
    const updatedStates = new StateListManager();
    updatedList.forEach((s) => updatedStates.add(s));
    onStatesChange(updatedStates);
    setEditingState(undefined);
  };

  const handleDeleteState = (state: State) => {
    if (
      window.confirm(
        `Are you sure you want to delete the state "${state.name}"?\n\nThis action cannot be undone.`
      )
    ) {
      const updatedList = states.getAll().filter((s) => s.id !== state.id);
      const updatedStates = new StateListManager();
      updatedList.forEach((s) => updatedStates.add(s));
      onStatesChange(updatedStates);
    }
  };

  const getComponentTypeLabel = (type: ComponentType | "ALL"): string => {
    if (type === "ALL") return "All Components";
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

  return (
    <div className="flex flex-col h-full">
      {/* Header with Filter and Add Button */}
      <div className="p-3 border-b bg-gray-50">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            {allowFilterChange ? (
              <select
                className="text-xs border rounded px-2 py-1 bg-white"
                value={filterComponentType}
                onChange={(e) =>
                  setFilterComponentType(
                    e.target.value as ComponentType | "ALL"
                  )
                }
              >
                <option value={defaultComponentType}>
                  {getComponentTypeLabel(defaultComponentType)} Only
                </option>
                <option value="ALL">All Components</option>
                {Object.values(ComponentType)
                  .filter((type) => type !== defaultComponentType)
                  .map((type) => (
                    <option key={type} value={type}>
                      {getComponentTypeLabel(type)}
                    </option>
                  ))}
              </select>
            ) : (
              <span className="text-xs font-medium text-gray-700">
                {getComponentTypeLabel(filterComponentType)}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsAddDialogOpen(true)}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Add State
          </button>
        </div>

        <p className="text-xs text-gray-500">
          {filteredStates.length === 0
            ? `No ${filterComponentType !== "ALL" ? getComponentTypeLabel(filterComponentType).toLowerCase() : ""} states defined`
            : `${filteredStates.length} state${filteredStates.length === 1 ? "" : "s"} ${filterComponentType !== "ALL" ? `for ${getComponentTypeLabel(filterComponentType).toLowerCase()}` : "total"}`}
        </p>
      </div>

      {/* States List */}
      <div className="flex-1 overflow-y-auto p-3">
        {filteredStates.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500 mb-2">
              No states defined yet
            </p>
            <p className="text-xs text-gray-400">
              Click "Add State" to create your first state variable
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredStates.map((state) => (
              <StateListItem
                key={`${state.componentType}-${state.name}`}
                state={state}
                onEdit={setEditingState}
                onDelete={handleDeleteState}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Dialog */}
      <StateFormDialog
        isOpen={isAddDialogOpen}
        defaultComponentType={
          filterComponentType === "ALL" ? defaultComponentType : filterComponentType
        }
        stateListManager={states}
        onSave={handleAddState}
        onCancel={() => setIsAddDialogOpen(false)}
      />

      {/* Edit Dialog */}
      {editingState && (
        <StateFormDialog
          isOpen={true}
          state={editingState}
          defaultComponentType={editingState.componentType}
          stateListManager={states}
          onSave={(updatedState) => handleEditState(editingState, updatedState)}
          onCancel={() => setEditingState(undefined)}
        />
      )}
    </div>
  );
};

export default StatesEditor;
