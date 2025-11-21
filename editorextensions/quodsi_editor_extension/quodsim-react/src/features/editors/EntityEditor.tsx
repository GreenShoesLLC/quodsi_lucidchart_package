import React, { useState } from "react";
import { Settings, Hash, Info } from "lucide-react";
import { Entity, StateListManager, ComponentType } from "@quodsi/shared";
import StatesEditor from "./StatesEditor";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the EntityEditor component
 */
interface Props {
  /** The entity being edited */
  entity: Entity;
  /** Callback invoked when user saves changes */
  onSave: (entity: Entity) => void;
  /** Callback invoked when user cancels editing (closes the editor) */
  onCancel: () => void;
  /** State variables associated with this entity template */
  states: StateListManager;
  /** Callback invoked when state definitions change */
  onStatesChange: (states: StateListManager) => void;
}

/**
 * Available tabs in the EntityEditor
 * - basic: Entity name and properties
 * - states: State variable definitions
 */
type EntityTab = "basic" | "states";

// Tab navigation configuration
const TAB_CONFIG = [
  {
    id: "basic" as const,
    title: "Basic Settings",
    icon: Settings,
    tooltip: "Configure entity template name and properties. Entity templates define the types of entities that flow through the simulation"
  },
  {
    id: "states" as const,
    title: "State Definitions",
    icon: Hash,
    tooltip: "Define custom state variables that entities of this type can carry and modify during simulation"
  },
];

// Tab header component for consistent tab content headers
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

/**
 * EntityEditor - Component for editing entity template properties
 *
 * Entity templates define the types of entities that flow through a simulation.
 * Each entity can have a name and associated state variables.
 *
 * Features:
 * - Two-tab interface: Basic properties and State definitions
 * - Controlled component with immediate UI updates
 * - Manual save for basic fields (name)
 * - Auto-save for state definitions (handled by StatesEditor)
 *
 * State Management:
 * - Maintains local draft state (localEntityDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for entity switching and save completion detection
 *
 * Save Behavior:
 * - Basic tab: Requires Save button click to persist changes
 * - States tab: Auto-saves immediately (Save/Cancel buttons hidden)
 *
 * @param props - Component props
 * @returns Rendered entity editor component
 */
const EntityEditor: React.FC<Props> = ({ entity, onSave, onCancel, states, onStatesChange }) => {
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Extracts and normalizes entity data from props into a clean Entity instance.
   *
   * This handles multiple data formats:
   * - Full Entity instances
   * - Raw data objects with nested .data property
   * - Missing/null values (creates default entity)
   *
   * @param ent - Entity data in various formats
   * @returns Normalized Entity instance
   */
  const extractEntityData = (ent: any): Entity => {
    const data = (ent as any).data || ent;

    return new Entity(
      data.id || "",
      data.name || "New Entity",
      data.x || 0,
      data.y || 0
    );
  };

  /**
   * Creates a new Entity instance with updated values while preserving immutability.
   *
   * This helper ensures that Entity updates trigger React re-renders by creating
   * new object references. It handles partial updates, filling in missing values
   * from the base Entity.
   *
   * @param base - The base Entity to update
   * @param updates - Partial object containing fields to update
   * @returns New Entity instance with updated values
   *
   * @example
   * const updated = updateEntityImmutably(entity, { name: "New Name" });
   */
  const updateEntityImmutably = (
    base: Entity,
    updates: Partial<{ name: string }>
  ): Entity => {
    return new Entity(
      base.id,
      updates.name ?? base.name,
      base.x,
      base.y
    );
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Local component state
  const [localEntityDraft, setLocalEntityDraft] = useState<Entity>(() => extractEntityData(entity));
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<EntityTab>("basic");

  // Get element operations state from Redux
  const elementOpsState = useElementOpsState();

  /**
   * Redux-managed state for save operation tracking.
   *
   * isSaving: true when save is in progress (shows loading state)
   *
   * This is managed by Redux elementOpsState to coordinate saves across
   * multiple editor instances.
   */
  const isSaving = localEntityDraft.id ? elementOpsState.isSaving(localEntityDraft.id) : false;

  // Custom hooks for state synchronization
  useFormSync(
    entity.id,
    hasPendingChanges,
    () => extractEntityData(entity),
    setLocalEntityDraft,
    setHasPendingChanges
  );

  useSaveCompletionDetector(isSaving, setHasPendingChanges);

  // Guard against invalid entity data
  if (!entity?.id) {
    return <div className="text-red-500 text-sm">Invalid entity data</div>;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles changes to the entity name input field.
   *
   * Updates are applied immediately to localEntityDraft for responsive UI,
   * and marked as pending (requiring Save button click to persist).
   *
   * @param e - Input change event
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setLocalEntityDraft(prev => updateEntityImmutably(prev, { name: value }));
    setHasPendingChanges(true);
  };

  /**
   * Saves the current entity draft state.
   *
   * Invokes the parent onSave callback with the current localEntityDraft.
   * Redux manages the isSaving state automatically.
   *
   * Note: Does NOT directly modify hasPendingChanges - that's handled by the
   * save completion detector to avoid race conditions.
   */
  const handleSave = () => {
    // Save the current draft state directly
    onSave(localEntityDraft);
    // Note: isSaving state is now managed by Redux through elementOpsState
  };

  /**
   * Cancels editing and closes the editor.
   *
   * Discards all pending changes by:
   * - Re-extracting fresh data from entity prop
   * - Clearing hasPendingChanges flag (disables Save button)
   * - Calling onCancel prop to close the editor panel
   *
   * Note: State definition changes were already auto-saved, so they can't be canceled.
   */
  const handleCancel = () => {
    setLocalEntityDraft(extractEntityData(entity));
    setHasPendingChanges(false);
    onCancel(); // Close the editor
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
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
              tooltip="Configure entity template name and properties. Entity templates define the types of entities that flow through the simulation"
            />
            <div className="space-y-4">
              {/* Name Section */}
              <div>
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Entity Name
                  </label>
                  <span title="Unique identifier for this entity template. Entity templates define the types of entities that flow through the simulation (e.g., Customer, Order, Patient).">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>
                <input
                  type="text"
                  name="name"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  value={localEntityDraft.name}
                  onChange={handleInputChange}
                  placeholder="Enter entity name"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === "states" && (
          <div>
            <TabHeader
              icon={Hash}
              title="State Definitions"
              tooltip="Define custom state variables that entities of this type can carry and modify during simulation"
            />
            <StatesEditor
              states={states}
              onStatesChange={onStatesChange}
              defaultComponentType={ComponentType.ENTITY}
            />
          </div>
        )}
      </div>

      {/* Save/Cancel Buttons - Only show for Basic tab (States auto-save) */}
      {activeTab !== "states" && (
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
  );
};

export default React.memo(EntityEditor);
