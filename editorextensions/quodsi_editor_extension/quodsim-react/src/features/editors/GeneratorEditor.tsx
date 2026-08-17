import React, { useState, useEffect } from "react";
import {
  Duration,
  Generator,
  GeneratorType,
  EditorReferenceData,
  PeriodUnit,
  Distribution,
  StateListManager,
  ComponentType,
  ModelDefaults,
  SimulationObjectType,
  isNameUniqueInReferenceData,
  ScenarioObjectType,
  type ScenarioLever,
} from "@quodsi/lucid-shared";
import { LeverAuthoringSection } from "./LeverAuthoringSection";
import { Settings, Hash, Zap, Info, ChevronDown, ChevronRight } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import StatesEditor from "./StatesEditor";
import StateModificationsEditor from "./StateModificationsEditor";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";

// ============================================================================
// CONSTANTS
// ============================================================================

// Constant representing "infinity" for display purposes
// (999999 is used to represent unlimited occurrences/entities in the UI)
const INFINITY_DISPLAY_VALUE = 999999;

// Tab navigation configuration
const TAB_CONFIG = [
  {
    id: "settings" as const,
    title: "Settings",
    icon: Settings,
    tooltip: "Configure generator name, entity, type, and creation settings"
  },
  {
    id: "events" as const,
    title: "Event Modifications",
    icon: Zap,
    tooltip: "Set initial state values for entities when they are created"
  },
  // Temporarily hidden - states managed at Model level
  // {
  //   id: "states" as const,
  //   title: "State Definitions",
  //   icon: Hash,
  //   tooltip: "Define custom state variables for entities created by this generator"
  // },
];


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
type GeneratorTab = "settings" | "events" | "states";

/**
 * GeneratorEditor - Comprehensive editor for Generator simulation objects
 *
 * This component provides a tabbed interface for editing all aspects of a Generator:
 * - Basic: Name, generator type, entity type, entities per creation, max entities
 * - Frequency: Interarrival time, periodic occurrences, and start delay (FREQUENCY generators only)
 * - PATTERN generators (arrival-pattern-based, authored in Studio or drawio) are
 *   shown as a read-only notice here — Lucid has no Pattern editor yet (see the
 *   "Arrival Pattern generator" branch below).
 * - Events: Initial state modifications for created entities
 * - States: State variable definitions
 *
 * State Management:
 * - Maintains local draft state (localGeneratorDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for generator switching and save completion detection
 * - Single save path: all field changes route through useAutoSave (debounced)
 *
 * Save Behavior:
 * - Text/number inputs (name, periodicOccurrences, entitiesPerCreation,
 *   maxEntities): debounced auto-save on edit; immediate save on blur or
 *   element switch.
 * - Select dropdowns (entityId, generatorType): immediate save via watcher
 *   useEffects (selects have no useful onBlur).
 * - Duration editors (interarrival time, start delay): debounced auto-save —
 *   EnhancedDurationEditor fires onChange per keystroke with no buffering, so
 *   the debounce timer resets naturally.
 * - State modifications: routed through debounce (unified with all other
 *   fields; replaces previous direct-onSave path).
 * - Status surfaced via SaveStatusLine ("Saved" / "Saving…" / "Fix errors to
 *   save" / "Save failed — keep typing to retry"). Native LucidChart Ctrl+Z
 *   reverses saved changes.
 *
 * Key Features:
 * - FREQUENCY generators get the full editable settings; PATTERN generators
 *   (Lucid can't author these) get a read-only notice instead.
 * - Auto-save for all fields via useAutoSave hook (debounce + onBlur flush
 *   on typed inputs; useEffect flush for select dropdowns)
 * - Guard conditions prevent data loss when switching generators
 * - Immutable updates via updateGeneratorImmutably helper
 *
 * @param props - Component props
 */
const GeneratorEditor: React.FC<Props> = ({
  generator,
  onSave,
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
   * Wire-cleanup Phase B2 Task 5/10: `EntitySourceConfig`/`generationConfig`
   * is DISSOLVED — the generation-config fields are flat on `Generator`
   * itself now (see `@quodsi/shared`'s `Generator.ts`). `gen` here is always
   * an already-hydrated `Generator` domain object (built by
   * `GeneratorLucid.createSimObject()`, which reads the live/upgraded
   * storage shape) or its JSON round-trip through Redux/messaging — both
   * already carry the flat clean field names, so no old-name fallback is
   * needed at this layer (the storage-shape migration is `GeneratorLucid`'s
   * job, not this panel's).
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
      data.entityId ?? ModelDefaults.DEFAULT_ENTITY_ID,
      data.interarrivalTime ?? Duration.constant(1, PeriodUnit.HOURS),
      data.x || 0,
      data.y || 0
    );

    extractedGenerator.mode = data.mode ?? GeneratorType.FREQUENCY;
    extractedGenerator.batchSize = data.batchSize ?? 1;
    extractedGenerator.startDelay = data.startDelay ?? Duration.constant(0, PeriodUnit.MINUTES);
    extractedGenerator.maxCycles = data.maxCycles ?? INFINITY_DISPLAY_VALUE;
    // PATTERN-mode fields. Lucid has no Pattern editor (see the read-only
    // notice in the render below), but a generator authored as PATTERN in
    // Studio or drawio must round-trip these losslessly when opened here —
    // otherwise editing anything else on the generator (even its name)
    // would silently revert it toward a FREQUENCY shape.
    extractedGenerator.arrivalPatternId = data.arrivalPatternId;
    extractedGenerator.volume = data.volume;
    extractedGenerator.arrivalScheduleId = data.arrivalScheduleId;
    extractedGenerator.maxEntities = data.maxEntities ?? INFINITY_DISPLAY_VALUE;
    extractedGenerator.initialStates = data.initialStates ? [...data.initialStates] : [];
    extractedGenerator.routing = data.routing ?? extractedGenerator.routing;
    extractedGenerator.description = data.description ?? '';
    // Preserve scenario levers (additive optional field, not a constructor param).
    extractedGenerator.levers = data.levers ?? [];

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
      entityId: string;
      mode: GeneratorType;
      maxCycles: number;
      interarrivalTime: Duration;
      batchSize: number;
      startDelay: Duration;
      maxEntities: number;
      initialStates: any[];
      levers: ScenarioLever[];
    }>
  ): Generator => {
    const updated = new Generator(
      base.id,
      updates.name ?? base.name,
      updates.entityId ?? base.entityId,
      updates.interarrivalTime ?? base.interarrivalTime,
      base.x,
      base.y
    );

    updated.mode = updates.mode ?? base.mode;
    updated.batchSize = updates.batchSize ?? base.batchSize;
    updated.startDelay = updates.startDelay ?? base.startDelay;
    updated.maxCycles = updates.maxCycles ?? base.maxCycles;
    // arrivalPatternId/volume/arrivalScheduleId (PATTERN/SCHEDULED mode) are
    // always carried through from base, never from `updates` — Lucid has no
    // UI that produces them, and dropping them here would silently corrupt a
    // generator authored as PATTERN/SCHEDULED in Studio or drawio (see the
    // read-only notice in the render below).
    updated.arrivalPatternId = base.arrivalPatternId;
    updated.volume = base.volume;
    updated.arrivalScheduleId = base.arrivalScheduleId;
    updated.maxEntities = updates.maxEntities ?? base.maxEntities;
    updated.initialStates = updates.initialStates ?? base.initialStates;
    updated.routing = base.routing;
    updated.description = base.description;

    // Preserve scenario levers (not a constructor param — must be copied forward).
    updated.levers = updates.levers ?? base.levers ?? [];

    return updated;
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  /**
   * Local draft of the generator being edited.
   *
   * This is the single source of truth for form state. All inputs read from
   * and write to this state. Changes are applied immediately for responsive UI;
   * auto-save persists them after debounce.
   *
   * Initialized with extractGeneratorData() to normalize incoming props.
   */
  const [localGeneratorDraft, setLocalGeneratorDraft] = useState<Generator>(() => extractGeneratorData(generator));

  /**
   * Flag indicating whether user has made changes that haven't been saved.
   *
   * Controls:
   * - useFormSync guard: prevents overwriting in-flight edits when generator prop changes
   * - useAutoSave debounce trigger: when true, the hook schedules a save
   *
   * Set to true: When any field changes (name, entity, durations, occurrences, etc.)
   * Set to false: When save completes (via useSaveCompletionDetector)
   */
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  /**
   * Currently active tab in the editor.
   */
  const [activeTab, setActiveTab] = useState<GeneratorTab>("settings");

  /**
   * Whether advanced settings section is expanded (Frequency mode only).
   */
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  /**
   * Name validation error message, null if name is valid.
   */
  const [nameError, setNameError] = useState<string | null>(null);

  // Get element operations state from Redux
  const elementOpsState = useElementOpsState();

  // Get the selectElement function for navigating to Model Editor
  const { selectElement } = useModelOpsSender();

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

  const { status, lastSavedAt, saveNow } = useAutoSave<Generator>({
    draft: localGeneratorDraft,
    hasPendingChanges,
    isValid: nameError === null,
    onSave,
    isSaving,
    elementId: localGeneratorDraft.id,
  });

  // Reset nameError when generator changes
  useEffect(() => {
    setNameError(null);
  }, [localGeneratorDraft.id]);

  // Fire saveNow when entity selection changes (no onBlur on selects).
  useFlushOnChange(localGeneratorDraft.entityId, saveNow);

  // Fire saveNow when generator type changes. In practice this only fires for
  // FREQUENCY generators today — the "Generator Type" select offers just one
  // value, since Lucid has no Pattern editor (PATTERN generators show a
  // read-only notice instead; see the render below).
  useFlushOnChange(localGeneratorDraft.mode, saveNow);

  const entities = referenceData.entities || [];

  /** True when this generator was authored as PATTERN elsewhere (Studio, drawio). */
  const isPatternGenerator = localGeneratorDraft.mode === GeneratorType.PATTERN;

  /**
   * Validates that the generator name is unique among all generators.
   * @param name - The name to validate
   * @returns Error message if invalid, null if valid
   */
  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (referenceData && !isNameUniqueInReferenceData(
      referenceData,
      SimulationObjectType.Generator,
      name,
      localGeneratorDraft.id
    )) {
      return `A Generator named "${name}" already exists`;
    }
    return null;
  };

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
   * validates the name, and marks the draft as pending. Auto-save fires after
   * debounce (typed inputs and durations), on blur (typed inputs), or via the
   * select-watching useEffects (entityId, generatorType).
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setLocalGeneratorDraft(prev => {
      // Build updates object based on which field changed
      const updates: any = {};

      if (name === 'name') {
        updates.name = value;
      } else if (name === 'generatorType') {
        updates.mode = value as GeneratorType;
      } else if (name === 'entityId') {
        updates.entityId = value;
      } else if (name === 'periodicOccurrences') {
        updates.maxCycles = parseInt(value) || INFINITY_DISPLAY_VALUE;
      } else if (name === 'entitiesPerCreation') {
        updates.batchSize = parseInt(value) || 1;
      } else if (name === 'maxEntities') {
        updates.maxEntities = parseInt(value) || INFINITY_DISPLAY_VALUE;
      }

      return updateGeneratorImmutably(prev, updates);
    });

    // Validate name uniqueness when name changes
    if (name === 'name') {
      const error = validateName(value);
      setNameError(error);
    }

    setHasPendingChanges(true);
  };

  /**
   * Handles changes to duration fields (interarrival time, start delay).
   *
   * Updates are applied immediately to localGeneratorDraft for responsive UI,
   * and marked as pending. EnhancedDurationEditor fires onChange per keystroke
   * with no buffering, so the auto-save debounce timer resets naturally and
   * fires once the user pauses for 500ms.
   */
  const handleDurationChange = (
    name: "interarrivalTime" | "startDelay",
    periodUnit: PeriodUnit,
    distribution: Distribution
  ) => {
    setLocalGeneratorDraft(prev => {
      // Duration (Generator's flat field) mirrors the clean wire grammar
      // exactly ({value, unit} or {distribution, ...params, unit}) — bridge
      // from the generic Distribution class EnhancedDurationEditor works
      // with via Duration.fromDistribution.
      const nextDuration = Duration.fromDistribution(periodUnit, distribution);
      const updates: any = name === "interarrivalTime"
        ? { interarrivalTime: nextDuration }
        : { startDelay: nextDuration };

      return updateGeneratorImmutably(prev, updates);
    });
    setHasPendingChanges(true);
  };

  /**
   * Handles changes to initial state modifications.
   *
   * Routed through the auto-save hook (single save path). The change is applied
   * to localGeneratorDraft and marked as pending; the debounce timer dispatches
   * the save after 500ms idle, or immediately on element switch / unmount.
   *
   * Flow:
   * 1. Filter out state modifications that reference deleted states (defensive cleanup)
   * 2. Apply the cleaned modifications to localGeneratorDraft
   * 3. Mark draft as pending — useAutoSave handles dispatch
   */
  const handleStateModificationsChange = (mods: any[]) => {
    // Defensive: Filter out state modifications that reference deleted states
    const validModifications = mods.filter(
      mod => states.getByUniqueId(mod.stateId) !== undefined
    );

    setLocalGeneratorDraft(prev => updateGeneratorImmutably(prev, {
      initialStates: validModifications
    }));
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
      <div className="space-y-2 max-h-[calc(100vh-150px)] overflow-y-auto pr-1">
        {activeTab === "settings" && (
          <div className="space-y-2">
            {/* Name Section */}
            <div>
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Generator Name
                </label>
                <span title="A descriptive name for this generator. Generators create entities at specified intervals and inject them into the simulation through activities.">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>
              <input
                type="text"
                name="name"
                className="w-full px-2 py-1.5 text-xs border rounded"
                value={localGeneratorDraft.name}
                onChange={handleInputChange}
                placeholder="Enter generator name"
                onBlur={saveNow}
              />
              {nameError && (
                <p className="text-xs text-red-500 mt-1">{nameError}</p>
              )}
            </div>

            {/* Entity Selection */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Entity
                </label>
                <span title="The type of entity this generator creates. Each time the generator fires, it will create instances of this entity type (e.g., Customer, Order, Patient).">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
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

            {/* Generator Type Selection — only shown when editable. Lucid can
                only author FREQUENCY generators (no Pattern editor yet), so a
                PATTERN generator skips straight to the read-only notice below
                rather than offering a dropdown that can't represent its type. */}
            {!isPatternGenerator && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Generator Type
                  </label>
                  <span title="FREQUENCY: Creates entities at regular intervals using interarrival time. Arrival-pattern generators are authored in Quodsi Studio or the drawio extension.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>
                <select
                  name="generatorType"
                  className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                  value={localGeneratorDraft.mode}
                  onChange={handleInputChange}
                >
                  <option value={GeneratorType.FREQUENCY}>Frequency-Based</option>
                </select>
              </div>
            )}

            {/* Dynamic content based on generator type */}
            {isPatternGenerator ? (
              <div className="pt-2 border-t">
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-900 space-y-1">
                  <div className="font-medium">Arrival Pattern generator</div>
                  <div>
                    This generator's arrival timing is defined by an Arrival Pattern
                    authored in Quodsi Studio or the drawio extension. Lucid does not
                    have a Pattern editor yet, so the pattern and volume can only be
                    changed there — editing this generator here (e.g. renaming it or
                    changing its initial state modifications) will not affect its
                    arrival pattern.
                  </div>
                  {localGeneratorDraft.arrivalPatternId && (
                    <div>
                      Pattern ID: <span className="font-mono">{localGeneratorDraft.arrivalPatternId}</span>
                    </div>
                  )}
                  {localGeneratorDraft.volume !== undefined && (
                    <div>Volume: {localGeneratorDraft.volume}</div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Interarrival Time */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1 mb-1">
                    <label className="text-xs font-medium text-gray-700">
                      Time Between Arrivals
                    </label>
                    <span title="The time interval between consecutive entity creation events. This defines how frequently the generator produces entities (e.g., every 5 minutes, every 2 hours).">
                      <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    </span>
                  </div>
                  <EnhancedDurationEditor
                    periodUnit={
                      localGeneratorDraft.interarrivalTime?.unit ?? PeriodUnit.HOURS
                    }
                    distribution={
                      Duration.toDistribution(
                        localGeneratorDraft.interarrivalTime ?? Duration.constant(1, PeriodUnit.HOURS)
                      )
                    }
                    onChange={(periodUnit, distribution) =>
                      handleDurationChange(
                        "interarrivalTime",
                        periodUnit,
                        distribution
                      )
                    }
                    compact={true}
                  />
                </div>

                {/* Advanced Settings - Expandable */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                      className="flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900"
                    >
                      {showAdvancedSettings ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      Advanced Settings
                    </button>
                    <span title="Configure generation limits including occurrence count, start delay, batch size, and maximum entity count.">
                      <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                    </span>
                  </div>

                  {showAdvancedSettings && (
                    <div className="mt-2 space-y-2">
                      {/* Periodic Occurrences */}
                      <div>
                        <div className="flex items-center gap-1 mb-1">
                          <label className="text-xs font-medium text-gray-700">
                            Periodic Occurrences
                          </label>
                          <span title={`How many times the generator will fire (create entities). For example, 10 occurrences means the generator creates entities 10 times total. Enter ${INFINITY_DISPLAY_VALUE} for unlimited (∞).`}>
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                          </span>
                        </div>
                        <input
                          type="number"
                          name="periodicOccurrences"
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={localGeneratorDraft.maxCycles ?? INFINITY_DISPLAY_VALUE}
                          onChange={handleInputChange}
                          min="0"
                          onBlur={saveNow}
                        />
                      </div>

                      {/* Start Delay */}
                      <div className="pt-2 border-t">
                        <div className="flex items-center gap-1 mb-1">
                          <label className="text-xs font-medium text-gray-700">
                            Start Delay
                          </label>
                          <span title="Time to wait before the generator creates its first entity. For example, a 10-minute delay means the first creation occurs at simulation time 10 minutes. Use 0 for immediate start.">
                            <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                          </span>
                        </div>
                        <EnhancedDurationEditor
                          periodUnit={
                            localGeneratorDraft.startDelay?.unit ?? PeriodUnit.HOURS
                          }
                          distribution={
                            Duration.toDistribution(
                              localGeneratorDraft.startDelay ?? Duration.constant(0, PeriodUnit.MINUTES)
                            )
                          }
                          onChange={(periodUnit, distribution) =>
                            handleDurationChange(
                              "startDelay",
                              periodUnit,
                              distribution
                            )
                          }
                          compact={true}
                        />
                      </div>

                      {/* Generation Limits */}
                      <div className="pt-2 border-t">
                        <div className="text-xs font-medium text-gray-700 mb-1">
                          Generation Limits
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <label className="text-xs text-gray-600">
                                Entities Per
                              </label>
                              <span title="How many entities are created each time the generator fires. For example, a value of 5 means 5 entities arrive simultaneously at each creation event.">
                                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                              </span>
                            </div>
                            <input
                              type="number"
                              name="entitiesPerCreation"
                              className="w-full px-2 py-1 text-xs border rounded"
                              value={localGeneratorDraft.batchSize ?? 1}
                              onChange={handleInputChange}
                              min="1"
                              onBlur={saveNow}
                            />
                          </div>
                          <div>
                            <div className="flex items-center gap-1 mb-1">
                              <label className="text-xs text-gray-600">
                                Max Entities
                              </label>
                              <span title={`Maximum total number of entities this generator will create across all occurrences. Enter ${INFINITY_DISPLAY_VALUE} for unlimited (∞).`}>
                                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                              </span>
                            </div>
                            <input
                              type="number"
                              name="maxEntities"
                              className="w-full px-2 py-1 text-xs border rounded"
                              value={localGeneratorDraft.maxEntities ?? INFINITY_DISPLAY_VALUE}
                              onChange={handleInputChange}
                              min="1"
                              onBlur={saveNow}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}

            <LeverAuthoringSection
              objectType={ScenarioObjectType.GENERATOR}
              componentName={localGeneratorDraft.name}
              levers={localGeneratorDraft.levers ?? []}
              currentDistributionType={localGeneratorDraft.interarrivalTime?.distribution}
              onChange={(next) => {
                setLocalGeneratorDraft((prev) =>
                  updateGeneratorImmutably(prev, { levers: next })
                );
                setHasPendingChanges(true);
              }}
            />
          </div>
        )}

        {activeTab === "events" && (
          <StateModificationsEditor
            modifications={localGeneratorDraft.initialStates || []}
            onModificationsChange={handleStateModificationsChange}
            states={states}
            title="Initial State Modifications"
            description="Applied to new entities"
            onNavigateToModelEditor={() => selectElement('model', { targetTab: 'states' })}
          />
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

export default React.memo(GeneratorEditor);
