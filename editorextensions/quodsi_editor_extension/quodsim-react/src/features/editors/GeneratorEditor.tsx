import React, { useState } from "react";
import {
  Duration,
  Generator,
  EditorReferenceData,
  PeriodUnit,
  Distribution,
  StateListManager,
  ComponentType,
} from "@quodsi/shared";
import { Timer, Flag, Settings, Hash, Zap, Info } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import StatesEditor from "./StatesEditor";
import StateModificationsEditor from "./StateModificationsEditor";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";

// ============================================================================
// CONSTANTS
// ============================================================================

// Constant representing "infinity" for display purposes
// (999999 is used to represent unlimited occurrences/entities in the UI)
const INFINITY_DISPLAY_VALUE = 999999;

// Tab navigation configuration
const TAB_CONFIG = [
  {
    id: "basic" as const,
    title: "Basic Settings",
    icon: Settings,
    tooltip: "Configure generator name, entity, and how many entities are created per event"
  },
  {
    id: "frequency" as const,
    title: "Frequency Settings",
    icon: Timer,
    tooltip: "Set the time interval between entity creation events and total number of occurrences"
  },
  {
    id: "start" as const,
    title: "Start Configuration",
    icon: Flag,
    tooltip: "Define when the generator begins creating entities (initial delay)"
  },
  {
    id: "events" as const,
    title: "Event Modifications",
    icon: Zap,
    tooltip: "Set initial state values for entities when they are created"
  },
  {
    id: "states" as const,
    title: "State Definitions",
    icon: Hash,
    tooltip: "Define custom state variables for entities created by this generator"
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

// ============================================================================
// TYPES
// ============================================================================

/**
 * Props for the GeneratorEditor component
 */
interface Props {
  /** The generator to edit (can be Generator instance or raw data object) */
  generator: Generator;
  /** Callback when user clicks Save or when auto-save triggers - receives the updated Generator */
  onSave: (generator: Generator) => void;
  /** Callback when user clicks Cancel */
  onCancel: () => void;
  /** Reference data for dropdowns (entities, etc.) */
  referenceData: EditorReferenceData;
  /** State manager for model-level states */
  states: StateListManager;
  /** Callback when states are modified */
  onStatesChange: (states: StateListManager) => void;
}

/**
 * Available tabs in the generator editor
 */
type GeneratorTab = "basic" | "frequency" | "start" | "states" | "events";

/**
 * GeneratorEditor - Comprehensive editor for Generator simulation objects
 *
 * This component provides a tabbed interface for editing all aspects of a Generator:
 * - Basic: Name, entity type, entities per creation, max entities
 * - Frequency: Interarrival time and periodic occurrences
 * - Start: Initial delay before first entity creation
 * - Events: Initial state modifications for created entities
 * - States: State variable definitions
 *
 * State Management:
 * - Maintains local draft state (localGeneratorDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for generator switching and save completion detection
 * - Mixed save behavior: Most fields use Save button, state modifications auto-save
 *
 * Key Features:
 * - Dirty state tracking (hasPendingChanges) enables/disables Save button
 * - Guard conditions prevent data loss when switching generators
 * - Immutable updates via updateGeneratorImmutably helper
 * - Manual save for basic fields and durations (requires Save button click)
 * - Auto-save for state modifications only (immediate persistence)
 */
const GeneratorEditor: React.FC<Props> = ({
  generator,
  onSave,
  onCancel,
  referenceData,
  states,
  onStatesChange,
}) => {
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Extracts and normalizes generator data from props into a clean Generator instance.
   *
   * This handles multiple data formats:
   * - Full Generator instances
   * - Raw data objects with nested .data property
   * - Missing/null values (creates default generator)
   *
   * Key responsibilities:
   * - Uses INFINITY_DISPLAY_VALUE for unlimited occurrences/entities
   * - Ensures state modifications are properly initialized
   * - Creates new array references for state modifications (for change detection)
   * - Applies sensible defaults for missing values
   *
   * @param gen - Generator data (can be Generator instance, raw object, or null)
   * @returns Normalized Generator instance ready for editing
   */
  const extractGeneratorData = (gen: any): Generator => {
    const data = gen.data || gen;
    const extractedGenerator = new Generator(
      data.id || "",
      data.name || "New Generator",
      data.activityKeyId || "",
      data.entityId || "",
      data.periodicOccurrences || INFINITY_DISPLAY_VALUE,
      data.periodIntervalDuration || new Duration(),
      data.entitiesPerCreation || 1,
      data.periodicStartDuration || new Duration(),
      data.maxEntities || INFINITY_DISPLAY_VALUE,
      data.x || 0,
      data.y || 0
    );

    // Always create new array to ensure reference changes for proper change detection
    extractedGenerator.initialStateModifications = data.initialStateModifications
      ? [...data.initialStateModifications]
      : [];

    return extractedGenerator;
  };

  /**
   * Creates an updated Generator instance with modified fields while preserving
   * all other properties. This ensures proper immutability and change detection.
   *
   * Why we need this: React state updates require new object references for change
   * detection. Generator class instances need to be reconstructed with new references
   * rather than mutated in place. This helper eliminates ~80 lines of duplicated
   * reconstruction logic across 4 handlers.
   *
   * @param base - The existing generator to base updates on
   * @param updates - Partial generator fields to update
   * @returns New Generator instance with updates applied and all other fields preserved
   */
  const updateGeneratorImmutably = (
    base: Generator,
    updates: Partial<{
      name: string;
      activityKeyId: string;
      entityId: string;
      periodicOccurrences: number;
      periodIntervalDuration: Duration;
      entitiesPerCreation: number;
      periodicStartDuration: Duration;
      maxEntities: number;
      initialStateModifications: any[];
    }>
  ): Generator => {
    const updated = new Generator(
      base.id,
      updates.name ?? base.name,
      updates.activityKeyId ?? base.activityKeyId,
      updates.entityId ?? base.entityId,
      updates.periodicOccurrences ?? base.periodicOccurrences,
      updates.periodIntervalDuration ?? base.periodIntervalDuration,
      updates.entitiesPerCreation ?? base.entitiesPerCreation,
      updates.periodicStartDuration ?? base.periodicStartDuration,
      updates.maxEntities ?? base.maxEntities,
      base.x,
      base.y
    );

    // Preserve/update state modifications
    updated.initialStateModifications =
      updates.initialStateModifications ?? base.initialStateModifications;

    return updated;
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Local draft of the generator being edited.
   *
   * This is the single source of truth for form state. All inputs read from
   * and write to this state. Changes are applied immediately for responsive UI,
   * but only persisted when user clicks Save (except state modifications which auto-save).
   *
   * Initialized with extractGeneratorData() to normalize incoming props.
   */
  const [localGeneratorDraft, setLocalGeneratorDraft] = useState<Generator>(() => extractGeneratorData(generator));

  /**
   * Flag indicating whether user has made changes that haven't been saved.
   *
   * Controls:
   * - Save button enabled/disabled state
   * - Guard condition for generator switching (prevents data loss)
   *
   * Set to true: When any field changes (name, entity, durations, occurrences, etc.)
   * Set to false: When save completes (via useSaveCompletionDetector) or Cancel clicked
   *
   * Note: State modification changes auto-save and don't set this flag.
   */
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  /**
   * Currently active tab in the editor.
   */
  const [activeTab, setActiveTab] = useState<GeneratorTab>("basic");

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
  const isSaving = localGeneratorDraft.id ? elementOpsState.isSaving(localGeneratorDraft.id) : false;

  // Custom hooks for state synchronization
  useFormSync(
    generator.id,
    hasPendingChanges,
    () => extractGeneratorData(generator),
    setLocalGeneratorDraft,
    setHasPendingChanges
  );

  useSaveCompletionDetector(isSaving, setHasPendingChanges);

  const entities = referenceData.entities || [];

  if (!generator?.id) {
    return <div className="text-red-500 text-sm">Invalid generator data</div>;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles changes to basic input fields (name, entity, occurrences, etc.).
   *
   * Updates are applied immediately to localGeneratorDraft for responsive UI,
   * but NOT persisted until user clicks Save button.
   *
   * Sets hasPendingChanges to enable the Save button.
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalGeneratorDraft(prev => {
      // Build updates object based on which field changed
      const updates: any = {};

      if (name === 'name') {
        updates.name = value;
      } else if (name === 'entityId') {
        updates.entityId = value;
      } else if (name === 'periodicOccurrences') {
        updates.periodicOccurrences = parseInt(value) || INFINITY_DISPLAY_VALUE;
      } else if (name === 'entitiesPerCreation') {
        updates.entitiesPerCreation = parseInt(value) || 1;
      } else if (name === 'maxEntities') {
        updates.maxEntities = parseInt(value) || INFINITY_DISPLAY_VALUE;
      }

      return updateGeneratorImmutably(prev, updates);
    });
    setHasPendingChanges(true);
  };

  /**
   * Handles changes to duration fields (interarrival time, start delay).
   *
   * Updates are applied immediately to localGeneratorDraft for responsive UI,
   * but NOT persisted until user clicks Save button (consistent with ActivityEditor).
   *
   * Sets hasPendingChanges to enable the Save button.
   */
  const handleDurationChange = (
    name: keyof Pick<
      Generator,
      "periodIntervalDuration" | "periodicStartDuration"
    >,
    periodUnit: PeriodUnit,
    distribution: Distribution
  ) => {
    setLocalGeneratorDraft(prev => {
      // Build updated duration object
      const updates: any = {};

      if (name === "periodIntervalDuration") {
        updates.periodIntervalDuration = {
          ...prev.periodIntervalDuration,
          durationPeriodUnit: periodUnit,
          distribution,
        };
      } else if (name === "periodicStartDuration") {
        updates.periodicStartDuration = {
          ...prev.periodicStartDuration,
          durationPeriodUnit: periodUnit,
          distribution,
        };
      }

      return updateGeneratorImmutably(prev, updates);
    });
    setHasPendingChanges(true);
  };

  /**
   * Handles changes to initial state modifications.
   *
   * IMPORTANT: This handler AUTO-SAVES IMMEDIATELY (different from basic fields).
   * State modifications are considered "committed" as soon as they're changed.
   *
   * Flow:
   * 1. Create updated generator with new state modifications
   * 2. Trigger immediate save via onSave (Redux manages save state)
   * 3. Update local state to match
   *
   * This bypasses the Save button workflow - changes are persisted immediately.
   */
  const handleStateModificationsChange = (mods: any[]) => {
    const updatedGenerator = updateGeneratorImmutably(localGeneratorDraft, {
      initialStateModifications: mods
    });

    // Auto-save immediately (Redux manages isSaving state)
    onSave(updatedGenerator);
    // Update local state to match
    setLocalGeneratorDraft(updatedGenerator);
  };

  /**
   * Saves the current generator draft to the model (manual save for basic fields).
   *
   * Key responsibilities:
   * - Triggers Redux save action via onSave callback
   * - Redux manages isSaving state and optimistic updates
   * - useSaveCompletionDetector hook clears hasPendingChanges when save completes
   *
   * Note: Does NOT directly modify hasPendingChanges - that's handled by the
   * save completion detector to avoid race conditions.
   */
  const handleSave = () => {
    // Save the current draft state directly
    onSave(localGeneratorDraft);
    // Note: isSaving state is now managed by Redux through elementOpsState
  };

  /**
   * Cancels editing and resets form to original generator data.
   *
   * Discards all pending changes by:
   * - Re-extracting fresh data from generator prop
   * - Clearing hasPendingChanges flag (disables Save button)
   *
   * Note: Does NOT close the editor - that's handled by parent component.
   * Note: State modification changes were already auto-saved, so they can't be canceled.
   */
  const handleCancel = () => {
    setLocalGeneratorDraft(extractGeneratorData(generator));
    setHasPendingChanges(false);
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
              tooltip="Configure generator name, entity, and how many entities are created per event"
            />
            <div className="space-y-2">
              {/* Name Section */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Generator Name
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  value={localGeneratorDraft.name}
                  onChange={handleInputChange}
                  placeholder="Enter generator name"
                />
              </div>

              {/* Entity Selection */}
              <div className="pt-2 border-t">
                <div className="mb-1">
                  <div className="text-xs font-medium text-gray-700 mb-0.5">
                    Entity
                  </div>
                  <div className="text-xs text-gray-500">
                    Type of entity this generator creates
                  </div>
                </div>
                <select
                  name="entityId"
                  className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                  value={localGeneratorDraft.entityId}
                  onChange={handleInputChange}
                >
                  {entities.map((entity) => (
                    <option key={entity.id} value={entity.id}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generation Configuration */}
              <div className="pt-2 border-t">
                <div className="text-xs font-medium text-gray-700 mb-1">
                  Generation Configuration
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Entities Per Creation
                    </label>
                    <input
                      type="number"
                      name="entitiesPerCreation"
                      className="w-full px-2 py-1 text-xs border rounded"
                      value={localGeneratorDraft.entitiesPerCreation}
                      onChange={handleInputChange}
                      min="1"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      Per creation event
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Max Entities
                    </label>
                    <input
                      type="number"
                      name="maxEntities"
                      className="w-full px-2 py-1 text-xs border rounded"
                      value={localGeneratorDraft.maxEntities}
                      onChange={handleInputChange}
                      min="1"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                      Limit ({INFINITY_DISPLAY_VALUE} = ∞)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "frequency" && (
          <div>
            <TabHeader
              icon={Timer}
              title="Frequency Settings"
              tooltip="Set the time interval between entity creation events and total number of occurrences"
            />
            <div className="space-y-2">
              {/* Interarrival Time */}
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Interarrival Time
                </label>
                <EnhancedDurationEditor
                  periodUnit={
                    localGeneratorDraft.periodIntervalDuration.durationPeriodUnit
                  }
                  distribution={
                    localGeneratorDraft.periodIntervalDuration.distribution
                  }
                  onChange={(periodUnit, distribution) =>
                    handleDurationChange(
                      "periodIntervalDuration",
                      periodUnit,
                      distribution
                    )
                  }
                  compact={true}
                />
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                  Between creations
                </p>
              </div>

              {/* Periodic Occurrences */}
              <div className="pt-2 border-t">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Periodic Occurrences
                </label>
                <input
                  type="number"
                  name="periodicOccurrences"
                  className="w-full px-2 py-1 text-xs border rounded"
                  value={localGeneratorDraft.periodicOccurrences}
                  onChange={handleInputChange}
                  min="0"
                />
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                  Times to create ({INFINITY_DISPLAY_VALUE} = ∞)
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "start" && (
          <div>
            <TabHeader
              icon={Flag}
              title="Start Configuration"
              tooltip="Define when the generator begins creating entities (initial delay)"
            />
            <div className="space-y-2">
              <div>
                <label className="text-xs font-medium text-gray-700 mb-1 block">
                  Start Delay
                </label>
                <EnhancedDurationEditor
                  periodUnit={
                    localGeneratorDraft.periodicStartDuration.durationPeriodUnit
                  }
                  distribution={localGeneratorDraft.periodicStartDuration.distribution}
                  onChange={(periodUnit, distribution) =>
                    handleDurationChange(
                      "periodicStartDuration",
                      periodUnit,
                      distribution
                    )
                  }
                  compact={true}
                />
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                  Initial delay
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "events" && (
          <div>
            <TabHeader
              icon={Zap}
              title="Event Modifications"
              tooltip="Set initial state values for entities when they are created"
            />
            <StateModificationsEditor
              modifications={localGeneratorDraft.initialStateModifications || []}
              onModificationsChange={handleStateModificationsChange}
              states={states}
              title="Initial State Modifications"
              description="Applied to new entities"
              filterComponentType={ComponentType.ENTITY}
              allowCrossComponent={false}
            />
          </div>
        )}

        {activeTab === "states" && (
          <div>
            <TabHeader
              icon={Hash}
              title="State Definitions"
              tooltip="Define custom state variables for entities created by this generator"
            />
            <StatesEditor
              states={states}
              onStatesChange={onStatesChange}
              defaultComponentType={ComponentType.ENTITY}
            />
          </div>
        )}
      </div>

      {/* Save/Cancel Buttons - Only show for Generator tabs (States tab auto-saves) */}
      {activeTab !== "states" && (
        <div className="flex justify-end gap-2 pt-2 border-t">
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasPendingChanges}
            className={`px-3 py-1.5 text-xs rounded ${
              hasPendingChanges
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </div>
      )}
    </div>
  );
};

export default React.memo(GeneratorEditor);
