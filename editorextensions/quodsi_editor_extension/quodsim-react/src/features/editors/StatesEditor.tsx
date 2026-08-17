import React, { useState, useMemo } from "react";
import { Plus, Filter, Info } from "lucide-react";
import {
  State,
  StateListManager,
  ComponentType,
  EditorReferenceData,
  ExpressionStateReference,
  findExpressionsReferencingState,
  type StateReferenceScope,
} from "@quodsi/lucid-shared";
import StateFormDialog from "./StateFormDialog";
import StateListItem from "./StateListItem";

interface Props {
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
  defaultComponentType: ComponentType | "ALL";
  allowFilterChange?: boolean;
  /**
   * Model-wide lookup data. Used here only to feed the delete-time expression
   * detector (activities[].actions[].modifications / generators[].initialStateModifications
   * / connectors) — see handleDeleteState below. Optional because older callers
   * (and tests) may not pass it; the dialog just skips the expression warning then.
   */
  referenceData?: EditorReferenceData;
}

const StatesEditor: React.FC<Props> = ({
  states,
  onStatesChange,
  defaultComponentType,
  allowFilterChange = true,
  referenceData,
}) => {
  const [filterComponentType, setFilterComponentType] = useState<ComponentType | "ALL">(
    defaultComponentType
  );
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingState, setEditingState] = useState<State | undefined>(undefined);
  const [deletingState, setDeletingState] = useState<State | undefined>(undefined);
  const [affectedExpressions, setAffectedExpressions] = useState<ExpressionStateReference[]>([]);

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
    setDeletingState(state);
    // Expressions elsewhere in the model can name this state inside a formula
    // (e.g. `qty * unit_price`) without setting it directly, so
    // removeStateReferences-style id-matching never sees them — deleting the
    // state would leave that formula referencing a state that no longer
    // exists, which the engine rejects at run time. Detect and warn before the
    // user confirms, same as Studio/drawio (ClickUp 86e2n9zy7). Read-only: this
    // never mutates activities/generators/connectors.
    setAffectedExpressions(
      findExpressionsReferencingState(
        {
          activities: referenceData?.activities,
          generators: referenceData?.generators,
          // Connector is a concrete class (no index signature); StateReferenceScope's
          // connectors field is deliberately loose (Array<Record<string, unknown>>) so
          // every host can pass its own shape — see
          // quodsi_shared/src/conversion/stateReferences.ts. Cast against the scope
          // type's own field, not a bare Record<string, unknown>[], so that if
          // `connectors` were ever narrowed to a stripped summary (the exact trap this
          // whole change fixes for `activities`), this cast target would change too
          // instead of silently continuing to typecheck.
          connectors: referenceData?.connectors as unknown as StateReferenceScope['connectors'],
        },
        state.name
      )
    );
  };

  const confirmDelete = () => {
    if (deletingState) {
      const updatedList = states.getAll().filter((s) => s.id !== deletingState.id);
      const updatedStates = new StateListManager();
      updatedList.forEach((s) => updatedStates.add(s));
      onStatesChange(updatedStates);
      setDeletingState(undefined);
      setAffectedExpressions([]);
    }
  };

  const cancelDelete = () => {
    setDeletingState(undefined);
    setAffectedExpressions([]);
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
        <div className="flex items-center gap-1 mb-2">
          <span className="text-xs font-medium text-gray-700">States</span>
          <span title="State variables track custom numeric or text values on simulation objects. Use states for conditional routing, tracking entity attributes (e.g., priority level), or counting occurrences.">
            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
          </span>
        </div>
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
                <option value="ALL">All Components</option>
                {Object.values(ComponentType).map((type) => (
                  <option key={type} value={type}>
                    {getComponentTypeLabel(type)} Only
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

      {/* Delete Confirmation */}
      {deletingState && (
        <div className="mx-3 mb-2 p-3 bg-red-50 border border-red-200 rounded">
          <div className="text-xs font-medium text-red-900 mb-2">
            Delete State: "{deletingState.name}"?
          </div>

          {/* Modifications that SET this state directly (matched by id) are cleaned up
              extension-side (ModelManager.cleanupStateReferences), not here — so unlike
              Studio (which computes this client-side) this can't claim a count without
              risking a number that doesn't match what actually gets cleaned up.
              Unconditional on purpose, not gated on a presence check computed from this
              panel's referenceData snapshot: the two error directions aren't symmetric.
              Unconditional can only ever be a false positive (promising a cleanup that
              turns out to be a no-op — costs nothing); a presence check that disagrees
              with what the extension sees would be a false negative (hiding this when a
              reference WILL be removed) — worse, so never-silent wins here. Also: no
              "when you save" — the States tab auto-saves immediately on this same click
              (ModelEditor's onStatesChange, confirmDelete below), so that clause described
              a step that doesn't exist on this tab and would send users looking for a Save
              button that isn't there. */}
          <div className="text-xs text-red-700 mb-2">
            Activity and generator steps that set this state directly will have that
            reference removed automatically.
          </div>

          {/* Expressions that name this state inside a DIFFERENT modification's formula
              (e.g. "qty * unit_price") are a level deeper than id-matching reaches, and are
              never auto-fixed — reported here instead, computed live from the same
              reference data the panel already has, so this count is reliable. */}
          {affectedExpressions.length > 0 && (
            <div className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded p-2 mb-2">
              <p className="font-medium">
                {affectedExpressions.length} expression{affectedExpressions.length === 1 ? "" : "s"}{" "}
                {affectedExpressions.length === 1 ? "references" : "reference"} this state inside a
                formula and cannot be fixed automatically:
              </p>
              <ul className="mt-1 list-disc pl-4">
                {affectedExpressions.map((hit, index) => (
                  <li key={`${hit.elementId}-${index}`}>
                    <code>{states.getByUniqueId(hit.stateId)?.name ?? hit.stateId} = {hit.expression}</code>
                  </li>
                ))}
              </ul>
              <p className="mt-1">
                Edit these yourself first — the engine rejects a formula that names a state
                which no longer exists.
              </p>
            </div>
          )}

          <div className="text-xs text-red-700 mb-3">
            This action cannot be undone.
          </div>
          <div className="flex gap-2">
            <button
              onClick={confirmDelete}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete State
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
          filterComponentType !== "ALL"
            ? filterComponentType
            : defaultComponentType !== "ALL"
              ? defaultComponentType
              : ComponentType.MODEL // Fallback when both are "ALL"
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
