import React, { useState } from "react";
import { Plus } from "lucide-react";
import { StateModification, StateListManager, ComponentType } from "@quodsi/shared";
import StateModificationFormDialog from "./StateModificationFormDialog";
import StateModificationListItem from "./StateModificationListItem";

interface Props {
  modifications: StateModification[];
  onModificationsChange: (modifications: StateModification[]) => void;
  states: StateListManager;
  title: string;
  description?: string;
  allowCrossComponent?: boolean;
  filterComponentType?: ComponentType;
}

const StateModificationsEditor: React.FC<Props> = ({
  modifications,
  onModificationsChange,
  states,
  title,
  description,
  allowCrossComponent = false,
  filterComponentType,
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingModification, setEditingModification] = useState<
    StateModification | undefined
  >(undefined);
  const [editingIndex, setEditingIndex] = useState<number>(-1);

  // Handle add modification
  const handleAddModification = (modification: StateModification) => {
    const updatedModifications = [...modifications, modification];
    onModificationsChange(updatedModifications);
    setIsAddDialogOpen(false);
  };

  // Handle edit modification
  const handleEditModification = (modification: StateModification) => {
    if (editingIndex >= 0) {
      const updatedModifications = [...modifications];
      updatedModifications[editingIndex] = modification;
      onModificationsChange(updatedModifications);
      setEditingModification(undefined);
      setEditingIndex(-1);
    }
  };

  // Handle delete modification
  const handleDeleteModification = (index: number) => {
    const mod = modifications[index];
    if (
      window.confirm(
        `Are you sure you want to delete the modification for "${mod.stateName}"?\n\nThis action cannot be undone.`
      )
    ) {
      const updatedModifications = modifications.filter((_, i) => i !== index);
      onModificationsChange(updatedModifications);
    }
  };

  // Open edit dialog
  const handleOpenEditDialog = (index: number) => {
    setEditingModification(modifications[index]);
    setEditingIndex(index);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingModification(undefined);
    setEditingIndex(-1);
  };

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium text-gray-700">{title}</div>
          {description && (
            <div className="text-xs text-gray-500 mt-0.5">{description}</div>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsAddDialogOpen(true)}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Modifications List */}
      <div className="space-y-1.5">
        {modifications.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded border border-dashed">
            <p className="text-xs text-gray-500 mb-1">
              No state modifications defined
            </p>
            <p className="text-xs text-gray-400">
              Click "Add" to create your first modification
            </p>
          </div>
        ) : (
          modifications.map((mod, index) => {
            const state = states.getByUniqueId(mod.stateUniqueId);
            return (
              <StateModificationListItem
                key={`${mod.stateUniqueId}-${index}`}
                modification={mod}
                state={state}
                onEdit={() => handleOpenEditDialog(index)}
                onDelete={() => handleDeleteModification(index)}
              />
            );
          })
        )}
      </div>

      {/* Add Dialog */}
      <StateModificationFormDialog
        isOpen={isAddDialogOpen}
        states={states}
        onSave={handleAddModification}
        onCancel={() => setIsAddDialogOpen(false)}
        allowCrossComponent={allowCrossComponent}
        filterComponentType={filterComponentType}
      />

      {/* Edit Dialog */}
      {editingModification && (
        <StateModificationFormDialog
          isOpen={true}
          modification={editingModification}
          states={states}
          onSave={handleEditModification}
          onCancel={handleCancelEdit}
          allowCrossComponent={allowCrossComponent}
          filterComponentType={filterComponentType}
        />
      )}
    </div>
  );
};

export default StateModificationsEditor;
