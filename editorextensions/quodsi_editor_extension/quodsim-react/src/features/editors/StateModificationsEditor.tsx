import React, { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Info, AlertTriangle } from "lucide-react";
import { StateModification, StateListManager, ComponentType } from "@quodsi/lucid-shared";
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
  /** Callback to navigate to Model Editor (for creating states). If provided, "Model Editor" becomes a clickable link. */
  onNavigateToModelEditor?: () => void;
}

const StateModificationsEditor: React.FC<Props> = ({
  modifications,
  onModificationsChange,
  states,
  title,
  description,
  allowCrossComponent = false,
  filterComponentType,
  onNavigateToModelEditor,
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingModification, setEditingModification] = useState<
    StateModification | undefined
  >(undefined);
  const [editingIndex, setEditingIndex] = useState<number>(-1);
  const [deletingIndex, setDeletingIndex] = useState<number>(-1);

  // Optimistic state management for immediate UI updates
  const [pendingModifications, setPendingModifications] = useState<StateModification[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Use pending modifications during save, otherwise use props
  const displayModifications = isSaving && pendingModifications ? pendingModifications : modifications;

  // Compute available states (with optional filtering)
  const availableStates = useMemo(() => {
    const allStates = states.getAll();
    if (filterComponentType) {
      return allStates.filter((s) => s.componentType === filterComponentType);
    }
    return allStates;
  }, [states, filterComponentType]);

  // Track modifications array reference to close dialogs after updates complete
  const prevModsRef = useRef(modifications);

  useEffect(() => {
    // If modifications prop changed after save, clear optimistic state
    if (modifications !== prevModsRef.current) {
      prevModsRef.current = modifications;
      setIsSaving(false);
      setPendingModifications(null);
      // Close all dialogs after confirmed update
      setIsAddDialogOpen(false);
      setEditingModification(undefined);
      setEditingIndex(-1);
      setDeletingIndex(-1);
    }
  }, [modifications]);

  // Fallback timeout to clear optimistic state if prop never updates
  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => {
        setIsSaving(false);
        setPendingModifications(null);
      }, 2000); // 2 second fallback to ensure UI doesn't get stuck

      return () => clearTimeout(timer);
    }
  }, [isSaving]);

  // Handle add modification
  const handleAddModification = (modification: StateModification) => {
    const updatedModifications = [...modifications, modification];
    // Set optimistic state for immediate UI update
    setPendingModifications(updatedModifications);
    setIsSaving(true);
    // Notify parent to save
    onModificationsChange(updatedModifications);
    // Dialog will close automatically via useEffect when modifications prop updates
  };

  // Handle edit modification
  const handleEditModification = (modification: StateModification) => {
    if (editingIndex >= 0) {
      const updatedModifications = [...modifications];
      updatedModifications[editingIndex] = modification;
      // Set optimistic state for immediate UI update
      setPendingModifications(updatedModifications);
      setIsSaving(true);
      // Notify parent to save
      onModificationsChange(updatedModifications);
      // Dialog will close automatically via useEffect when modifications prop updates
    }
  };

  // Handle delete modification
  const handleDeleteModification = (index: number) => {
    setDeletingIndex(index);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (deletingIndex >= 0) {
      const updatedModifications = modifications.filter((_, i) => i !== deletingIndex);
      // Set optimistic state for immediate UI update
      setPendingModifications(updatedModifications);
      setIsSaving(true);
      // Notify parent to save
      onModificationsChange(updatedModifications);
      // Confirmation dialog will close automatically via useEffect when modifications prop updates
    }
  };

  // Cancel delete
  const cancelDelete = () => {
    setDeletingIndex(-1);
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
        <div className="flex items-center gap-1">
          <div className="text-xs font-medium text-gray-700">{title}</div>
          {description && (
            <span title={description}>
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsAddDialogOpen(true)}
          disabled={availableStates.length === 0}
          className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>

      {/* Delete Confirmation */}
      {deletingIndex >= 0 && displayModifications[deletingIndex] && (
        <div className="p-3 bg-red-50 border border-red-200 rounded">
          <div className="text-sm font-medium text-red-900 mb-2">
            Delete State Modification: "{displayModifications[deletingIndex].stateName}"?
          </div>
          <div className="text-xs text-red-700 mb-3">
            This action cannot be undone.
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmDelete}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete Modification
            </button>
            <button
              onClick={cancelDelete}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Modifications List */}
      <div className="space-y-1.5">
        {availableStates.length === 0 ? (
          <div className="text-center py-6 bg-amber-50 rounded border border-amber-200">
            <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
            <p className="text-xs font-medium text-amber-800 mb-1">
              No States Available
            </p>
            <p className="text-xs text-amber-700">
              Go to{" "}
              {onNavigateToModelEditor ? (
                <button
                  type="button"
                  onClick={onNavigateToModelEditor}
                  className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  Model Editor
                </button>
              ) : (
                <span className="font-medium">Model Editor</span>
              )}{" "}
              → States tab to create states first.
            </p>
          </div>
        ) : displayModifications.length === 0 ? (
          <div className="text-center py-6 bg-gray-50 rounded border border-dashed">
            <p className="text-xs text-gray-500 mb-1">
              No state modifications defined
            </p>
            <p className="text-xs text-gray-400">
              Click "Add" to create your first modification
            </p>
          </div>
        ) : (
          displayModifications.map((mod, index) => {
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
