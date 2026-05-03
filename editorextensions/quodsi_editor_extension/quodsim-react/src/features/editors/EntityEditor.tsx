import React, { useState, useEffect } from "react";
import { Settings, Hash, Info } from "lucide-react";
import {
  Entity,
  StateListManager,
  ComponentType,
  SimulationObjectType,
  EditorReferenceData,
  isNameUniqueInReferenceData,
} from "@quodsi/shared";
import StatesEditor from "./StatesEditor";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector, useAutoSave } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";

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
  /** Reference data for validation (entities, activities, etc.) */
  referenceData?: EditorReferenceData;
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
  // Temporarily hidden - states managed at Model level
  // {
  //   id: "states" as const,
  //   title: "State Definitions",
  //   icon: Hash,
  //   tooltip: "Define custom state variables that entities of this type can carry and modify during simulation"
  // },
];


/**
 * EntityEditor - Component for editing entity template properties
 *
 * Entity templates define the types of entities that flow through a simulation.
 * Each entity can have a name and associated state variables.
 *
 * Features:
 * - Two-tab interface: Basic properties and State definitions
 * - Controlled component with immediate UI updates
 * - Auto-save for all fields via useAutoSave hook (debounce + onBlur flush)
 *
 * State Management:
 * - Maintains local draft state (localEntityDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for entity switching and save completion detection
 *
 * Save Behavior:
 * - Name field: debounced auto-save on edit; immediate save on blur or
 *   element switch. Status surfaced via SaveStatusLine ("Saved" / "Saving…" /
 *   "Fix errors to save" / "Save failed — keep typing to retry"). Native
 *   LucidChart Ctrl+Z reverses saved changes.
 * - States tab: Auto-saves immediately (handled by StatesEditor)
 *
 * @param props - Component props (onCancel kept as vestigial; see Phase 0 spec)
 * @returns Rendered entity editor component
 */
const EntityEditor: React.FC<Props> = ({ entity, onSave, onCancel, states, onStatesChange, referenceData }) => {
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

  // Name validation state
  const [nameError, setNameError] = useState<string | null>(null);

  /**
   * Validates that the entity name is unique among all entities.
   * @param name - The name to validate
   * @returns Error message if invalid, null if valid
   */
  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (referenceData && !isNameUniqueInReferenceData(
      referenceData,
      SimulationObjectType.Entity,
      name,
      localEntityDraft.id
    )) {
      return `An Entity named "${name}" already exists`;
    }
    return null;
  };

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

  const { status, lastSavedAt, saveNow } = useAutoSave<Entity>({
    draft: localEntityDraft,
    hasPendingChanges,
    isValid: nameError === null,
    onSave,
    isSaving,
    elementId: localEntityDraft.id,
  });

  // Reset nameError when entity changes
  useEffect(() => {
    setNameError(null);
  }, [localEntityDraft.id]);

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
   * validates the name, and marks the draft as pending (auto-save will fire
   * after debounce or on blur).
   *
   * @param e - Input change event
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.target;
    setLocalEntityDraft(prev => updateEntityImmutably(prev, { name: value }));
    // Validate name uniqueness
    const error = validateName(value);
    setNameError(error);
    setHasPendingChanges(true);
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
                  onBlur={saveNow}
                  placeholder="Enter entity name"
                />
                {nameError && (
                  <p className="text-xs text-red-500 mt-1">{nameError}</p>
                )}
              </div>
          </div>
        )}

        {/* Temporarily hidden - states managed at Model level
        {activeTab === "states" && (
          <StatesEditor
              states={states}
              onStatesChange={onStatesChange}
              defaultComponentType={ComponentType.ENTITY}
            />
        )}
        */}
      </div>

      {/* Auto-save status */}
      <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
    </div>
  );
};

export default React.memo(EntityEditor);
