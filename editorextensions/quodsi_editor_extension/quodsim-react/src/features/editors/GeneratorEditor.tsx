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
  declareClearedFields,
  getLogger,
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
import { useModelRootSource } from "../../adapters/useModelRootSource";
import { PatternModal } from "./PatternModal";
import {
  summarizeArrivalPattern,
  ensurePatternForGenerator,
  removePatternForGenerator,
  renamePatternForGenerator,
  type LifecycleModel,
} from "quodsi_studio/platforms/shared";

const log = getLogger("GeneratorEditor");

// ============================================================================
// CONSTANTS
// ============================================================================

// Constant representing "infinity" for display purposes
// (999999 is used to represent unlimited occurrences/entities in the UI)
const INFINITY_DISPLAY_VALUE = 999999;

// A freshly-created ArrivalPattern has no volume, and
// ArrivalPatternValidation's `arrival_pattern_invalid_volume` rule treats
// volume <= 0 as an ERROR (blocks simulation) — so switching to PATTERN with
// no volume seeded would immediately red-flag the model before the user has
// touched anything. 1000 is a plausible, easy-to-eyeball starting point the
// user overwrites in PatternModal; it is only applied when the generator
// doesn't already have a volume from a prior PATTERN stint (switching
// PATTERN -> FREQUENCY -> PATTERN keeps whatever was there). Mirrors
// quodsi_studio's GeneratorBasicTab.tsx DEFAULT_PATTERN_VOLUME (not
// exported from the shared barrel, so duplicated here rather than imported).
const DEFAULT_PATTERN_VOLUME = 1000;

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
 * - Pattern: PATTERN generators show a plain-language summary of their linked
 *   ArrivalPattern (summarizeArrivalPattern) plus an "Edit pattern" button
 *   that opens PatternModal, hosting the shared Season/Week/Day cascade
 *   editor (quodsi_studio's GeneratorPatternTab). SCHEDULED generators still
 *   get the read-only notice — Lucid has no Schedule editor yet.
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
 *   get a summary + "Edit pattern" button opening the shared cascade editor;
 *   SCHEDULED generators (Lucid can't author these yet) get a read-only notice.
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
    // PATTERN-mode fields. arrivalPatternId/volume are not driven by any
    // input in THIS form (PatternModal/GeneratorPatternTab write them
    // through the accessor directly), and arrivalScheduleId stays read-only
    // (Lucid has no Schedule editor). A generator authored elsewhere must
    // still round-trip these losslessly when opened here — otherwise editing
    // anything else on the generator (even its name) would silently revert
    // it toward a FREQUENCY shape.
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
      // Settable ONLY by the PATTERN lifecycle handlers in handleInputChange
      // (mode switch), never by a plain typed/selected field. `undefined` is
      // a meaningful value here (clears the link on switching away from
      // PATTERN), so these are read via an `in` presence-check below, not
      // `??` — `?? base...` cannot distinguish "not provided, keep base"
      // from "explicitly provided as undefined, clear it".
      arrivalPatternId: string | undefined;
      volume: number | undefined;
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
    // arrivalPatternId/volume: from `updates` when the caller explicitly
    // provided them (the PATTERN mode-switch handler only -- see its own
    // comment), otherwise always carried through from base. No OTHER input
    // handler in this component produces these keys (PatternModal's own
    // volume slider writes through the accessor directly, not through this
    // draft). arrivalScheduleId is never settable from `updates` at all --
    // it stays read-only, Lucid has no Schedule editor. Silently dropping
    // any of the three here would corrupt a generator authored as
    // PATTERN/SCHEDULED elsewhere.
    updated.arrivalPatternId = 'arrivalPatternId' in updates ? updates.arrivalPatternId : base.arrivalPatternId;
    updated.volume = 'volume' in updates ? updates.volume : base.volume;
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

  /**
   * Whether the full-width Arrival Pattern editor (PatternModal, hosting the
   * shared Season/Week/Day cascade) is open. PATTERN generators only.
   */
  const [isPatternModalOpen, setIsPatternModalOpen] = useState(false);

  /**
   * The generator id PatternModal is editing, frozen at the moment "Edit
   * pattern" is clicked. The canvas sits outside this panel's iframe, so the
   * modal does not block canvas clicks -- without freezing this, selecting a
   * different PATTERN generator while the modal is open would silently swap
   * which generator's pattern is being edited underneath the user (PatternModal's
   * own header comment documents this contract). null until first opened.
   */
  const [patternModalShapeId, setPatternModalShapeId] = useState<string | null>(null);

  /**
   * Set when the shape-write half of a PATTERN-mode-switch lifecycle
   * (ensurePatternForGenerator / removePatternForGenerator) rejects --
   * accessor.updateShape can reject on a host error or its own 30s timeout.
   * Surfaced next to the Generator Type control since that is the field the
   * failed write was triggered by; cleared on the next mode-switch attempt
   * and when the generator selection changes.
   */
  const [patternLifecycleError, setPatternLifecycleError] = useState<string | null>(null);

  // Get element operations state from Redux
  const elementOpsState = useElementOpsState();

  // Model-root projection (generators + arrivalPatterns + model settings) and
  // the accessor shared cross-platform panels (PatternModal/GeneratorPatternTab)
  // read/write through. `modelRootProjection` is null until the host's first
  // MODEL_ROOT_SNAPSHOT arrives -- every read below tolerates that via `?? []`
  // fallbacks or a `modelRootProjection &&` guard, never assumes it is populated.
  const { accessor, projection: modelRootProjection } = useModelRootSource();

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

  // Reset nameError and close PatternModal when generator changes. Without
  // the isPatternModalOpen reset: select a PATTERN generator, open the
  // modal, select a FREQUENCY generator (PatternModal unmounts since it's
  // only rendered when isPatternGenerator, but isPatternModalOpen stays
  // true), then select any PATTERN generator -- the modal remounts already
  // open, with no user action.
  useEffect(() => {
    setNameError(null);
    setIsPatternModalOpen(false);
    setPatternLifecycleError(null);
  }, [localGeneratorDraft.id]);

  // Fire saveNow when entity selection changes (no onBlur on selects).
  useFlushOnChange(localGeneratorDraft.entityId, saveNow);

  // Fire saveNow when generator type changes. The "Generator Type" select
  // renders (offering FREQUENCY and PATTERN) whenever the generator was not
  // authored as SCHEDULED elsewhere (see isScheduledGenerator below) — Lucid
  // still has no Schedule editor.
  useFlushOnChange(localGeneratorDraft.mode, saveNow);

  const entities = referenceData.entities || [];

  /** True when this generator is authored as an Arrival Pattern (editable here via PatternModal). */
  const isPatternGenerator = localGeneratorDraft.mode === GeneratorType.PATTERN;
  /**
   * True when this generator was authored as SCHEDULED elsewhere (Studio,
   * drawio). Lucid still has no Schedule editor, so this generator keeps the
   * read-only notice and is kept off the type <select> entirely -- its only
   * FREQUENCY/PATTERN options can't represent SCHEDULED, and one click there
   * would rewrite mode and orphan arrivalScheduleId.
   */
  const isScheduledGenerator = localGeneratorDraft.mode === GeneratorType.SCHEDULED;

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

    // Pattern lifecycle on mode switch, computed BEFORE the local-draft
    // update below so a resulting arrivalPatternId/volume change lands in
    // the SAME setLocalGeneratorDraft call as `mode` -- one coherent state
    // transition, not two racing ones. ensurePatternForGenerator /
    // removePatternForGenerator are the ONLY thing that creates, deletes or
    // links a pattern -- do not reimplement any of it here. Guarded on
    // modelRootProjection: with no snapshot yet there is no
    // generators/arrivalPatterns list to ensure/remove against.
    let patternFieldUpdates: { arrivalPatternId: string | undefined; volume?: number } | null = null;

    if (name === 'generatorType' && modelRootProjection) {
      const nextMode = value as GeneratorType;
      const model = modelRootProjection as unknown as LifecycleModel;
      const generatorId = localGeneratorDraft.id;

      if (nextMode === GeneratorType.PATTERN) {
        // Idempotent: a generator already linked to a present pattern comes
        // back unchanged, same model reference and same patternId. Safe to
        // call repeatedly -- the `ensured.model !== model` guard then skips
        // the model-root write entirely in that case (Task 10 review,
        // Important 3 -- mirrors GeneratorBasicTab.tsx's three guarded
        // updateModel call sites; an unguarded write here fired a
        // postMessage round trip + validateModel() + snapshot push on every
        // keystroke of an unrelated field, not just on a real mode switch).
        const ensured = ensurePatternForGenerator(model, generatorId);
        const seededVolume = localGeneratorDraft.volume ?? DEFAULT_PATTERN_VOLUME;
        patternFieldUpdates = { arrivalPatternId: ensured.patternId, volume: seededVolume };

        // SEQUENCED, not parallel -- Task 10 review round 3, "split-brain
        // projection". The generator's own flat fields (mode, arrivalPatternId,
        // volume) persist through the shape-scoped route (accessor.updateShape)
        // -- updateGeneratorImmutably deliberately refuses these from a plain
        // `updates` object for every OTHER caller, and a model-root patch is
        // restricted to arrivalPatterns (the host's update-model-root route
        // throws on any other key), so updateModel({ generators }) is not an
        // option. Mirrors quodsi_studio's GeneratorBasicTab.tsx
        // handleTypeChange, including seeding a default volume (Critical 1) --
        // but Studio issues both halves through ONE accessor over ONE model,
        // so ordering between them is moot there. Lucid has two independent
        // write routes (ELEMENT_UPDATE for the shape half, MODEL_ROOT_UPDATE
        // for arrivalPatterns), and MODEL_ROOT_UPDATE's own post-write
        // snapshot push (buildModelRootProjection, on the host) runs
        // CONCURRENTLY with whatever ELEMENT_UPDATE is still in flight for
        // the same generator -- so firing both together let the snapshot
        // land showing the new pattern in arrivalPatterns but NOT linked
        // from the generator. A later removePatternForGenerator call, given
        // that stale projection, found no link, silently no-op'd instead of
        // deleting the pattern, and the NEXT switch to PATTERN minted a
        // second one. accessor.updateShape's returned promise now resolves
        // only once the host CONFIRMS the shape write (ELEMENT_UPDATE_RESULT)
        // -- see useModelRootSource's saveShape -- so awaiting it here before
        // the model-root write closes that window: by the time
        // buildModelRootProjection runs (for either write's own snapshot
        // push), the link has already landed.
        setPatternLifecycleError(null);
        void (async () => {
          // `name` included even though this handler never changes it:
          // ModelManager.handleDataUpdate falls back to a shape-derived
          // default name whenever an update payload omits the `name` key
          // at all (not just when it's undefined) -- harmless for a
          // real Lucid BlockProxy whose on-canvas text label usually
          // matches, but not a dependency this write should take on.
          await accessor.updateShape(generatorId, 'Generator', {
            name: localGeneratorDraft.name,
            mode: nextMode,
            arrivalPatternId: ensured.patternId,
            volume: seededVolume,
          });
          if (ensured.model !== model) {
            await accessor.updateModel({ arrivalPatterns: ensured.model.arrivalPatterns });
          }
        })().catch(err => {
          // accessor.updateShape/updateModel can reject (host error, or the
          // 30s accessor timeout). Unhandled, that was an invisible unhandled
          // promise rejection: the local draft already shows PATTERN mode and
          // the new arrivalPatternId, but the write never landed. Logged
          // through the shared logger (no-console ship gate) and surfaced
          // next to the Generator Type control -- see patternLifecycleError's
          // declaration comment for why this state exists rather than
          // reusing SaveStatusLine (which renders useAutoSave's status, an
          // unrelated write path).
          log.error('PATTERN mode-switch lifecycle write failed:', err);
          setPatternLifecycleError('Could not save the pattern switch. Try again.');
        });
      } else if (localGeneratorDraft.mode === GeneratorType.PATTERN) {
        // Severs the link and deletes the pattern UNLESS another generator
        // still references it -- deleting it out from under a sibling would
        // be worse.
        const removed = removePatternForGenerator(model, generatorId);
        patternFieldUpdates = { arrivalPatternId: undefined };

        setPatternLifecycleError(null);
        void (async () => {
          // arrivalPatternId: undefined never reaches storage on its own --
          // a documented Lucid platform constraint (Task 10 review round 3,
          // Minor): the panel->extension JSON transport drops undefined-
          // valued keys, and StorageAdapter.updateElementData's merge
          // additionally strips them from the incoming patch (a partial
          // update must not clobber stored fields it didn't mention) -- so
          // "the user cleared this" and "this payload never mentions it"
          // arrive identical, and the stale link would silently survive.
          // Generator now follows the SAME explicit cleared-field
          // declaration Activity's queueRanking already established
          // (declareClearedFields here; the extension-side removeKeys half
          // is generatorStorageRemoveKeys in GeneratorLucid.ts, wired into
          // ModelManager.ts's handleDataUpdate the same way
          // activityStorageRemoveKeys already is).
          // `name` included for the same reason as the switch-to-PATTERN
          // write above -- see its comment.
          await accessor.updateShape(
            generatorId,
            'Generator',
            declareClearedFields({ name: localGeneratorDraft.name, mode: nextMode }, ['arrivalPatternId'])
          );
          if (removed !== model) {
            await accessor.updateModel({ arrivalPatterns: removed.arrivalPatterns });
          }
        })().catch(err => {
          // See the switch-to-PATTERN branch's identical .catch above for
          // the full rationale.
          log.error('PATTERN mode-switch-away lifecycle write failed:', err);
          setPatternLifecycleError('Could not save the pattern switch. Try again.');
        });
      }
    }

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
        // Fix round 1, F2(a): `maxEntities: 0` is the documented off-switch
        // (Generator.ts's own field comment; generatorCoreEntries's comment
        // is explicit "0 ... a real, meaningful value, never collapsed to
        // absence") — `parseInt(value) || INFINITY_DISPLAY_VALUE` treated 0
        // as falsy and silently replaced it with "unlimited", making the
        // off-switch untypeable. 0-preserving parse, matching the Studio
        // twin's numberOr (GeneratorBasicTab.tsx).
        const parsed = parseInt(value);
        updates.maxEntities = value === '' || isNaN(parsed) ? INFINITY_DISPLAY_VALUE : parsed;
      }

      // Fold in the PATTERN lifecycle's generator-half result (if any) so the
      // local draft -- and therefore the summary block, which reads
      // localGeneratorDraft.arrivalPatternId/volume directly -- reflects the
      // new link immediately, without waiting on a MODEL_ROOT_SNAPSHOT round
      // trip. See updateGeneratorImmutably's own comment on why these two
      // keys need an `in` presence-check rather than `??`.
      if (patternFieldUpdates) {
        updates.arrivalPatternId = patternFieldUpdates.arrivalPatternId;
        if ('volume' in patternFieldUpdates) {
          updates.volume = patternFieldUpdates.volume;
        }
      }

      return updateGeneratorImmutably(prev, updates);
    });

    // Validate name uniqueness when name changes
    if (name === 'name') {
      const error = validateName(value);
      setNameError(error);

      // Pattern lifecycle: the user never types a pattern name directly, so
      // this is the only path that changes one -- keeps a linked pattern's
      // derived name in sync with the generator's own name.
      // renamePatternForGenerator no-ops (returns the SAME model reference)
      // when this generator has no linked pattern; the `renamed !== model`
      // guard below turns that into "skip the write" -- no round trip on
      // every keystroke for a FREQUENCY generator (Task 10 review,
      // Important 3).
      if (modelRootProjection && localGeneratorDraft.mode === GeneratorType.PATTERN) {
        const model = modelRootProjection as unknown as LifecycleModel;
        const renamed = renamePatternForGenerator(model, localGeneratorDraft.id, value);
        if (renamed !== model) {
          void accessor.updateModel({ arrivalPatterns: renamed.arrivalPatterns });
        }
      }
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

            {/* Generator Type Selection - only shown when editable. Lucid can
                author FREQUENCY and PATTERN generators now; it still has no
                Schedule editor, so a SCHEDULED generator skips straight to
                the read-only notice below rather than offering a dropdown
                that can't represent its type. */}
            {!isScheduledGenerator && (
              <div className="pt-2 border-t">
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-medium text-gray-700" htmlFor="generatorType">
                    Generator Type
                  </label>
                  <span title="FREQUENCY: entities at regular intervals using interarrival time. ARRIVAL PATTERN: a volume shaped across season, week and day. Arrival-schedule generators are authored in Quodsi Studio or the drawio extension.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>
                <select
                  id="generatorType"
                  name="generatorType"
                  className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                  value={localGeneratorDraft.mode}
                  onChange={handleInputChange}
                >
                  <option value={GeneratorType.FREQUENCY}>Frequency-Based</option>
                  <option value={GeneratorType.PATTERN}>Arrival Pattern</option>
                </select>
                {patternLifecycleError && (
                  <p className="text-xs text-red-500 mt-1">{patternLifecycleError}</p>
                )}
              </div>
            )}

            {/* Dynamic content based on generator type */}
            {isPatternGenerator ? (
              <div className="pt-2 border-t space-y-2">
                <div className="text-xs text-secondary space-y-0.5">
                  {modelRootProjection === null ? (
                    // No MODEL_ROOT_SNAPSHOT has arrived yet -- the pattern's
                    // shape (season/week/day weights) lives in
                    // modelRootProjection.arrivalPatterns, so summarizing now
                    // would report "spread evenly" for a pattern that may not
                    // be uniform at all: the right volume, an invented shape.
                    // A loading placeholder is the only rendering that isn't
                    // confidently wrong (Task 10 review, Minor 6). This
                    // self-corrects the moment the snapshot lands (the
                    // request() fired by useModelRootSource on mount).
                    <div>Loading pattern…</div>
                  ) : (
                    summarizeArrivalPattern(
                      (modelRootProjection.arrivalPatterns ?? []).find(
                        (p) => p.id === localGeneratorDraft.arrivalPatternId
                      ),
                      localGeneratorDraft.volume ?? 0
                    ).map((line, i) => (
                      <div key={i}>{line}</div>
                    ))
                  )}
                </div>
                <button
                  type="button"
                  className="w-full px-2 py-1.5 text-xs border border-border-strong rounded bg-surface text-secondary hover:bg-surface-hover"
                  onClick={() => {
                    // Freeze the shapeId at click time (see patternModalShapeId's
                    // declaration comment) -- must be set BEFORE opening so
                    // PatternModal never renders with a stale/null id.
                    setPatternModalShapeId(localGeneratorDraft.id);
                    setIsPatternModalOpen(true);
                  }}
                >
                  Edit pattern
                </button>
              </div>
            ) : isScheduledGenerator ? (
              // Schedule generators keep the existing read-only notice verbatim --
              // Lucid still has no Schedule editor.
              <div className="pt-2 border-t">
                <div className="bg-amber-50 border border-amber-200 rounded p-2 text-xs text-amber-900 space-y-1">
                  <div className="font-medium">
                    {isPatternGenerator
                      ? "Arrival Pattern generator"
                      : "Scheduled Arrival generator"}
                  </div>
                  <div>
                    {isPatternGenerator
                      ? "This generator's arrival timing is defined by an Arrival Pattern authored in Quodsi Studio or the drawio extension."
                      : "This generator's arrivals are defined by an Arrival Schedule authored in Quodsi Studio or the drawio extension."}{" "}
                    Lucid does not have an editor for it yet, so it can only be
                    changed there — editing this generator here (e.g. renaming it
                    or changing its initial state modifications) will not affect
                    its arrival timing.
                  </div>
                  {localGeneratorDraft.arrivalPatternId && (
                    <div>
                      Pattern ID: <span className="font-mono">{localGeneratorDraft.arrivalPatternId}</span>
                    </div>
                  )}
                  {localGeneratorDraft.volume !== undefined && (
                    <div>Volume: {localGeneratorDraft.volume}</div>
                  )}
                  {localGeneratorDraft.arrivalScheduleId && (
                    <div>
                      Schedule ID: <span className="font-mono">{localGeneratorDraft.arrivalScheduleId}</span>
                    </div>
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

      {isPatternGenerator && (
        <PatternModal
          open={isPatternModalOpen}
          onClose={() => setIsPatternModalOpen(false)}
          shapeId={patternModalShapeId ?? localGeneratorDraft.id}
          accessor={accessor}
        />
      )}
    </div>
  );
};

export default React.memo(GeneratorEditor);
