import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Model,
  ModelDefaults,
  Duration,
  PeriodUnit,
  SimulationTimeType,
  ValidationResult,
  ScenarioObjectType,
  resolveCalendarWindow,
  msToCoarsestDuration,
  eligibleLeverProperties,
  countActiveLevers,
  type ModelRootProjection,
  type ScenarioLever,
} from "@quodsi/lucid-shared";
import { Settings, Hash, Info, Users, AlertTriangle, Boxes, Briefcase, CalendarClock, SlidersHorizontal } from "lucide-react";
import { EntitiesTab } from "./EntitiesTab";
import { StatesTab } from "./StatesTab";
import { AccordionSection } from "../shared/AccordionSection";
import {
  CalendarDateTimeField, ResourceRequirementsEditor, WarmupDateField,
  // Levers moved onto their own tab (2026-08-31) and Lucid dropped its
  // near-verbatim fork of the section at the same time -- this is the monorepo
  // original, shared with drawio/Studio/Visio.
  LeverAuthoringSection,
  // Complexity views (Task 11a): the same hook + tell Studio's ModelEditor uses.
  useView, ViewTell, ViewGated,
} from "quodsi_studio/platforms/shared";
import type { ModelStateAccessor } from "quodsi_studio/platforms/shared";
import { LUCID_MODEL_TAB_SURFACE, LUCID_MODEL_EXTRA_SURFACES } from "./viewSurfaceMaps";
import { ArrivalsTab } from "./ArrivalsTab";
import { SchedulesTab } from "./SchedulesTab";
import { ResourcesTab } from "./ResourcesTab";
import { useSimulationRunSender } from "../../messaging/senders/simulationRunSender";
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
import { useSaveInFlight } from "./hooks/useSaveInFlight";
import SaveStatusLine from "./SaveStatusLine";
import {
  extractModelData,
  updateModelImmutably,
  buildModelSettingsPatch,
  modelSettingsSyncKey,
  type ModelInput,
} from "../utils/modelEditorHelpers";
import { ValidationDashboard } from "./ValidationDashboard";

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  /** The page's one model-root accessor (ModelEditorForPage). Every tab writes through it. */
  accessor: ModelStateAccessor;
  /** The snapshot that accessor serves. Never null: ModelEditorForPage waits for the first one. */
  projection: ModelRootProjection;
  onValidate?: () => void;
  validationState?: ValidationResult | null;
  activeTab?: EditorTab;
  onTabChange?: (tab: EditorTab) => void;
}

export type EditorTab = "basic" | "states" | "entities" | "resources" | "requirements" | "arrivals" | "schedules" | "scenarios" | "levers" | "validation";

/**
 * Tab navigation configuration for ModelEditor.
 * Defines all available tabs, their icons, titles, and tooltips.
 */
const TAB_CONFIG = [
  {
    id: "basic" as const,
    title: "Basic Settings",
    icon: Settings,
    tooltip: "Configure model name, simulation time settings, and runtime parameters"
  },
  {
    id: "states" as const,
    title: "State Definitions",
    icon: Hash,
    tooltip: "Define model-level state variables that can be accessed and modified throughout the simulation"
  },
  {
    id: "entities" as const,
    title: "Entities",
    icon: Boxes,
    tooltip: "Define the entity types that flow through the simulation (e.g. customers, parts, orders)"
  },
  {
    id: "resources" as const,
    title: "Resources",
    icon: Briefcase,
    tooltip: "Define the model's resources and see which shape or swimlane lane represents each"
  },
  {
    id: "requirements" as const,
    title: "Resource Requirements",
    icon: Users,
    tooltip: "Create reusable resource requirement templates that define which resources are needed for activities"
  },
  {
    id: "arrivals" as const,
    title: "Arrivals",
    icon: CalendarClock,
    tooltip: "Review the arrival patterns and schedules this model carries, and remove any no longer used by a generator"
  },
  {
    id: "schedules" as const,
    title: "Schedules",
    icon: CalendarClock,
    tooltip: "Define work schedules — recurring weekly capacity plus dated exceptions — that resources and activities can follow"
  },
  {
    id: "levers" as const,
    title: "Scenario levers",
    icon: SlidersHorizontal,
    tooltip: "Mark replications or the random seed as a scenario lever -- a value range a Study can sweep across its design points"
  },
  {
    id: "validation" as const,
    title: "Validation",
    icon: AlertTriangle,
    tooltip: "View comprehensive model validation results and resolve any issues"
  },
];

// Compile-time proof that the map covers exactly this editor's real tab ids,
// EXCLUDING "validation" -- a diagnostics tab with no equivalent in Studio's
// Model editor and no surface id in the catalog, so it is deliberately never
// gated by view. A tab added to TAB_CONFIG without a line in
// LUCID_MODEL_TAB_SURFACE (validation aside) fails here, naming it.
type _TabsAreMapped = [
  Exclude<Exclude<(typeof TAB_CONFIG)[number]["id"], "validation">, keyof typeof LUCID_MODEL_TAB_SURFACE>
] extends [never] ? true : never;
const _tabsAreMapped: _TabsAreMapped = true;
void _tabsAreMapped;

// The single place "validation" is excluded from the surface-gated tab set.
// A type predicate rather than an `as` cast, so `LUCID_MODEL_TAB_SURFACE[t.id]`
// stays a real index lookup below -- an id this predicate lets through that
// isn't actually a key of the map is still a compile error, same as
// ActivityEditor/GeneratorEditor's un-cast lookups.
function hasMappedSurface(
  t: (typeof TAB_CONFIG)[number]
): t is (typeof TAB_CONFIG)[number] & { id: keyof typeof LUCID_MODEL_TAB_SURFACE } {
  return t.id !== "validation";
}

/**
 * Maximum replications a model may run — single-sourced from @quodsi/shared
 * (re-exported via @quodsi/lucid-shared). Enforced in the UI and the backend.
 */
const MAX_REPS = ModelDefaults.MAX_REPS;

/**
 * Canonical run-time default — 24 hours, mirroring `Model.createDefault` and
 * Studio's `BasicSettingsTab`. It used to be 0 hours here, which silently
 * produced an empty run for any model that reached this panel without a
 * `runTime`; in calendar mode there is not even a Run Time input on screen to
 * notice it with.
 */
const DEFAULT_RUN_TIME = Duration.constant(24, PeriodUnit.HOURS);

// ---------------------------------------------------------------------------
// Calendar-date help text
// ---------------------------------------------------------------------------
// The engine's actual calendar semantics (`document/clean/translate.py`,
// `_translate_model_block`): the run OPENS at the warmup date, statistics begin
// at the start date (the end of warmup), and the run closes at the finish date.
// The copy this panel shipped had start and warmup SWAPPED — Start Date claimed
// "the simulation begins" (that is the warmup date) while Warmup Date claimed
// "warmup ends and statistics collection begins" (that is the start date).
// Text kept verbatim in sync with Studio's BasicSettingsTab.
const START_DATE_HELP =
  "Wall-clock date and time at which warmup ends and statistics collection begins. The anchor for Calendar mode: events before this date run, but are excluded from output statistics.";

const FINISH_DATE_HELP =
  "Wall-clock date and time at which the simulation ends. Sets the run length measured from the Start Date.";

const START_DATE_HINT = "Set the start date first";

/**
 * ModelEditor - Lucid's editor for model-level simulation settings.
 *
 * Data (spec 2026-09-12): every tab reads ONE MODEL_ROOT_SNAPSHOT
 * (`projection`) and writes through ONE model-root accessor (`accessor`),
 * both owned by ModelEditorForPage, which remounts this editor per Lucid page.
 *
 * Tabs:
 * - Basic and Levers: a local draft of the snapshot's model fields, saved whole
 *   by useAutoSave (500 ms debounce; onBlur and select changes flush) as
 *   accessor.updateModel(buildModelSettingsPatch(draft)).
 * - States, Entities, Resources, Requirements: Studio's shared list editors in
 *   host-cleanup mode -- ModelManager.updateModelRoot runs the delete rules.
 * - Arrivals, Schedules: Studio's shared editors; work-schedule editing opens
 *   Lucid's own modal.
 * - Validation: read-only, from validationState.
 *
 * Draft resync: the draft re-extracts from the snapshot only when the model
 * fields' VALUES change (modelSettingsSyncKey) while nothing is pending, no
 * save is in flight (useSaveInFlight) and the last save did not fail. So an
 * Advisor Apply shows up while idle; our own echo, a stale snapshot during a
 * save, or the corrective snapshot after a refused save never erases what the
 * user typed.
 *
 * Calendar dates: only the Start Date is stored; Warmup and Finish write
 * `warmupTime`/`runTime`, which is what the clean wire and the engine carry.
 * Switching back to Clock clears all three dates in the same draft update.
 *
 * Status: SaveStatusLine ("Saved" / "Saving…" / "Save failed — keep typing to
 * retry"). Native LucidChart Ctrl+Z reverses saved changes.
 */
const ModelEditor: React.FC<Props> = ({ accessor, projection, onValidate, validationState, activeTab: activeTabProp, onTabChange: onTabChangeProp }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Local state for tab management (used as fallback if props not provided)
  const [localActiveTab, setLocalActiveTab] = useState<EditorTab>("basic");

  // Use props if provided, otherwise fall back to local state (backward compatible)
  const activeTab = activeTabProp ?? localActiveTab;
  const setActiveTab = onTabChangeProp ?? setLocalActiveTab;
  const { visible } = useView();
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false); // Start collapsed
  // OPEN_SETTINGS_MODAL sender for ViewTell's switch affordance below.
  const { openSettingsModal } = useSimulationRunSender();

  // The page this editor was mounted for. ModelEditorForPage is keyed on it,
  // so it never changes for the life of this component -- the constant
  // "element id" useFormSync and useAutoSave expect.
  const pageId = projection.pageId ?? "";

  // Basic and Levers edit a local draft of the snapshot's model fields.
  const [localModelDraft, setLocalModelDraft] = useState<Model>(() =>
    extractModelData(projection as unknown as ModelInput)
  );
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Why an out-of-order calendar pick needs somewhere to report itself: a
  // finish at/before the start cannot be expressed as a duration at all.
  // (WarmupDateField reports its own refused pick; only Finish needs a slot.)
  const [finishDateError, setFinishDateError] = useState<string | null>(null);

  // useAutoSave's `isSaving`: true while a draft save is in flight. See
  // useSaveInFlight for why a plain useState would break useAutoSave.
  const { saving, track } = useSaveInFlight();
  // The last save's failure. While set, no snapshot may overwrite the draft:
  // the host's corrective snapshot after a refused write would otherwise erase
  // exactly the values the user is being told did not save. Cleared when the
  // next save starts (the next edit).
  const [saveError, setSaveError] = useState<string | null>(null);

  // Resync rule (spec 2026-09-12 §5): a STRING of the snapshot's model-field
  // values, so the echo and equal snapshots -- new objects, same values --
  // never re-extract the draft.
  const modelSyncKey = useMemo(
    () => modelSettingsSyncKey(projection as unknown as Record<string, unknown>),
    [projection]
  );
  useFormSync(
    pageId,
    hasPendingChanges || saving || saveError !== null,
    () => extractModelData(projection as unknown as ModelInput),
    setLocalModelDraft,
    setHasPendingChanges,
    modelSyncKey
  );

  useSaveCompletionDetector(saving, setHasPendingChanges);

  // Auto-save hands this the raw draft. buildModelSettingsPatch applies the
  // defaults and leaves out `id` and `scenarios`, which updateModelRoot
  // refuses. The rejection is always caught -- including the unmount flush
  // after a page switch, which the page guard refuses (that edit is lost, as
  // it was on the old ELEMENT_UPDATE route).
  const onSaveWithDefaults = useCallback(
    (draft: Model) => {
      setSaveError(null);
      const write = accessor.updateModel(buildModelSettingsPatch(draft));
      track(write);
      write.catch((err: unknown) => {
        setSaveError(err instanceof Error ? err.message : String(err));
      });
    },
    [accessor, track]
  );

  const { status, lastSavedAt, saveNow } = useAutoSave<Model>({
    draft: localModelDraft,
    hasPendingChanges,
    isValid: true, // No validation: only one Model per document, no name-uniqueness check needed.
    onSave: onSaveWithDefaults,
    isSaving: saving,
    elementId: pageId,
  });

  // Decisive selects (no useful onBlur): flush save on change.
  useFlushOnChange(localModelDraft.timeMode, saveNow);
  useFlushOnChange(localModelDraft.runTime?.unit, saveNow);
  useFlushOnChange(localModelDraft.timeUnit, saveNow);
  useFlushOnChange(localModelDraft.warmupTime?.unit, saveNow);

  // Trigger validation when validation tab is selected
  useEffect(() => {
    if (activeTab === 'validation' && onValidate) {
      onValidate();
    }
  }, [activeTab, onValidate]);

  // Guard against invalid model data
  if (!localModelDraft?.id) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
        <div className="text-red-600 font-medium">Invalid model data</div>
        <div className="text-xs text-red-500 mt-1">Model data missing required properties</div>
      </div>
    );
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles changes to form input fields with automatic type conversion.
   *
   * Updates are applied immediately to localModelDraft for responsive UI,
   * and marked as pending. Auto-save fires after debounce (typed inputs),
   * on blur (typed inputs), or via useFlushOnChange (selects).
   *
   * Type conversion:
   * - number inputs: Parsed as float with fallback to 0 for invalid values
   * - datetime-local inputs: Converted to Date objects or null
   * - all other inputs: Kept as strings
   *
   * @param e - Input change event
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    // Wire-cleanup Phase B2 Task 4/10: runClockPeriod(+Unit)/warmupClockPeriod(+Unit)
    // collapsed into `runTime`/`warmupTime: Duration` ({value, unit}) — this
    // panel keeps its own simple number+unit inputs (no distribution editor),
    // so these four field names now update one piece of the corresponding
    // Duration while preserving the other.
    if (name === 'runClockPeriod' || name === 'runClockPeriodUnit') {
      const base = localModelDraft.runTime ?? Duration.constant(0, PeriodUnit.HOURS);
      const nextRunTime = name === 'runClockPeriod'
        ? Duration.constant(parseFloat(value) || 0, base.unit)
        : Duration.constant(base.value ?? 0, value as PeriodUnit);
      setLocalModelDraft(prev => updateModelImmutably(prev, { runTime: nextRunTime }));
      setHasPendingChanges(true);
      return;
    }
    if (name === 'warmupClockPeriod' || name === 'warmupClockPeriodUnit') {
      const base = localModelDraft.warmupTime ?? Duration.constant(0, PeriodUnit.HOURS);
      const nextWarmupTime = name === 'warmupClockPeriod'
        ? Duration.constant(parseFloat(value) || 0, base.unit)
        : Duration.constant(base.value ?? 0, value as PeriodUnit);
      setLocalModelDraft(prev => updateModelImmutably(prev, { warmupTime: nextWarmupTime }));
      setHasPendingChanges(true);
      return;
    }

    // Switching back to Clock must CLEAR the calendar dates in the same draft
    // update. The clean-era engine's `CleanModelDocument` makes an explicit
    // `startDateTime` a HARD ERROR under `timeMode: "clock"`
    // (`document/clean/root.py`'s `_collect_time_mode_errors`), and all three
    // date fields are carried unconditionally by the flush path, never gated on
    // `timeMode` — so a Calendar→Clock→submit round trip failed that validator.
    // Mirrors the same clear Studio's BasicSettingsTab does at its own switch.
    if (name === 'simulationTimeType' && value === SimulationTimeType.Clock) {
      setFinishDateError(null);
      setLocalModelDraft(prev => updateModelImmutably(prev, {
        timeMode: SimulationTimeType.Clock,
        startDateTime: null,
        warmupDateTime: null,
        finishDateTime: null,
      }));
      setHasPendingChanges(true);
      return;
    }

    // Map the panel's stable input `name`s to the clean field names.
    const fieldName = name === 'reps' ? 'replications'
      : name === 'simulationTimeType' ? 'timeMode'
      : name === 'oneClockUnit' ? 'timeUnit'
      : name;

    // Convert values based on input type
    let convertedValue: string | number | Date | null = value;
    if (type === 'number') {
      const numValue = parseFloat(value);
      convertedValue = isNaN(numValue) ? 0 : numValue;
      // Replications are clamped to [1, MAX_REPS] via the shared single-source rule.
      if (name === 'reps') {
        convertedValue = ModelDefaults.clampReps(numValue);
      }
    } else if (type === 'datetime-local') {
      convertedValue = value ? new Date(value) : null;
    }

    setLocalModelDraft(prev => updateModelImmutably(prev, { [fieldName]: convertedValue } as Partial<Model>));
    setHasPendingChanges(true);
  };

  // ============================================================================
  // DERIVED CALENDAR WINDOW
  // ============================================================================

  // Calendar mode stores ONE anchor (`startDateTime`) plus two LENGTHS
  // (`warmupTime`/`runTime`); the warmup and finish instants are arithmetic on
  // those, exactly as the engine reconstructs them in `_translate_model_block`
  // before a calendar run. Deriving them here rather than storing them keeps a
  // single source of truth — the stored `warmupDateTime`/`finishDateTime`
  // fields are host-local, dropped by the serializer, and could only ever
  // disagree with the durations the engine actually runs.
  const calendarWindow = resolveCalendarWindow({
    timeMode: SimulationTimeType.CalendarDate,
    startDateTime: localModelDraft.startDateTime,
    warmupTime: localModelDraft.warmupTime,
    runTime: localModelDraft.runTime ?? DEFAULT_RUN_TIME,
  });
  const startMs = calendarWindow?.startMs;
  const hasStart = startMs !== undefined;
  const finishDateDerived = calendarWindow ? new Date(calendarWindow.finishMs).toISOString() : null;

  /** Apply a calendar-derived duration/anchor edit to the draft. */
  const commitCalendar = (updates: Partial<Model>) => {
    setLocalModelDraft(prev => updateModelImmutably(prev, updates));
    setHasPendingChanges(true);
  };

  const leverCount = countActiveLevers(
    localModelDraft?.levers,
    eligibleLeverProperties(ScenarioObjectType.MODEL)
  );

  // Complexity views (Task 11a): a tab whose surface the current view doesn't
  // show is dropped from the strip. "validation" has no surface -- it is
  // diagnostics, not authoring complexity -- so it always passes through.
  // Falls back to "basic", always visible (model.tab.basic is the catalog's
  // floor), when the active tab (local OR host-controlled via activeTabProp)
  // is view-hidden.
  // Every control inside "Advanced Settings" is view-gated (Replications,
  // Time Mode, Clock Unit, Warmup are all intermediate), so in Basic the
  // accordion could open onto nothing -- Daniel's Lucid smoke, 2026-09-04.
  // Render it only when it has content. Same rule as Studio's
  // BasicSettingsTab: the calendar Start/Finish dates are deliberately
  // ungated, so a calendar-mode model always has content here.
  const advancedHasContent =
    localModelDraft.timeMode === SimulationTimeType.CalendarDate ||
    visible.has("model.field.replications") ||
    visible.has("model.field.timeMode") ||
    visible.has("model.field.clockUnit") ||
    visible.has("model.field.warmup");

  const tabs = TAB_CONFIG.filter(
    (t) => !hasMappedSurface(t) || visible.has(LUCID_MODEL_TAB_SURFACE[t.id])
  );
  const activeOrFallback: EditorTab = tabs.some((t) => t.id === activeTab) ? activeTab : "basic";

  // The tell names every mapped tab surface: the snapshot carries arrival
  // patterns and work schedules to this editor too (spec 2026-09-12
  // decision 9), so Arrivals and Schedules are backed like the rest.
  const tellSurfaces = [
    ...TAB_CONFIG.filter(hasMappedSurface).map((t) => LUCID_MODEL_TAB_SURFACE[t.id]),
    ...LUCID_MODEL_EXTRA_SURFACES,
  ];

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col bg-white">
      <div className="border-b bg-gray-50">
        <div className="flex">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                // Icon-only buttons, so `title` IS the accessible name -- existing
                // tests select tabs by their tooltip text. The badge pill below is
                // aria-hidden for the same reason: unhidden, a bare number would be
                // the only text content and would become the whole accessible name.
                title={tab.id === "levers" && leverCount > 0 ? `${tab.tooltip} (${leverCount})` : tab.tooltip}
                // flex-1 + centered icon: the strip shares the dock width
                // across however many tabs exist (nine since the Levers tab
                // landed), instead of a fixed px-3 per tab that overflowed the
                // 300px dock and forced a horizontal scrollbar.
                className={`relative flex-1 flex justify-center px-1 py-2 border-b-2 ${
                  activeOrFallback === tab.id
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.id === "levers" && leverCount > 0 && (
                  <span
                    aria-hidden="true"
                    data-testid="tab-badge-levers"
                    className="absolute top-0.5 right-0.5 min-w-[14px] px-1 rounded-full bg-info-soft text-info-soft-fg text-[10px] leading-[14px] text-center"
                  >
                    {leverCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <ViewTell
        surfaces={tellSurfaces}
        // Model-level predicates in @quodsi/shared read `ctx.model` shaped like
        // a ModelDefinition (see usage.ts): collections at the top level, the
        // Model's own fields under `model`. The snapshot is that shape; the
        // draft's unsaved levers and settings are laid over it so the tell
        // tracks what the user sees.
        ctx={{
          model: {
            ...projection,
            levers: localModelDraft.levers,
            model: {
              ...projection.model,
              warmupTime: localModelDraft.warmupTime,
              timeMode: localModelDraft.timeMode,
              replications: localModelDraft.replications,
              timeUnit: localModelDraft.timeUnit,
            },
          },
        }}
        onOpenSettings={openSettingsModal}
      />

      {activeOrFallback === "basic" && (
        <div className="w-full">
          <div className="space-y-2">
              {/* Model Name - Always Visible WITH LABEL */}
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs font-medium text-gray-700">
                        Model Name
                      </label>
                      <span title="A unique identifier for this simulation model. This name helps you organize and identify different models in your workspace.">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <input
                      type="text"
                      name="name"
                      className="w-full px-2 py-1 text-xs border rounded"
                      value={localModelDraft.name}
                      placeholder="Enter model name"
                      onChange={handleChange}
                      onBlur={saveNow}
                    />
                </div>

                {/* Run Time - Conditional: Only in Clock mode */}
                {localModelDraft.timeMode === SimulationTimeType.Clock && (
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs font-medium text-gray-700">
                        Run Time
                      </label>
                      <span title="The total duration the simulation will run in Clock mode. Specify the time period and unit (e.g., 8 Hours, 30 Days).">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <input
                        type="number"
                        name="runClockPeriod"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localModelDraft.runTime?.value || 0}
                        onChange={handleChange}
                        min="0"
                        onBlur={saveNow}
                      />
                      <select
                        name="runClockPeriodUnit"
                        className="w-full px-2 py-1 text-xs border rounded bg-white"
                        value={localModelDraft.runTime?.unit || PeriodUnit.HOURS}
                        onChange={handleChange}
                      >
                        {Object.values(PeriodUnit).map((unit) => (
                          <option key={unit} value={unit}>
                            {unit}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Advanced Settings - Accordion (only when something inside is visible) */}
                {advancedHasContent && (
                <AccordionSection
                  title="Advanced Settings"
                  isExpanded={isAdvancedExpanded}
                  onToggle={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                >
                  <div className="space-y-2">
                    {/* Replications -- intermediate since 2026-09-01
                        (Renee's simple-version spec: a Basic model's Basic tab
                        is Model Name + Run Time). Hiding it does not change
                        what runs: the stored value still goes to the engine,
                        and the tell above names it when it is non-default. */}
                    <ViewGated surface="model.field.replications">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="text-xs font-medium text-gray-700">
                          Replications
                        </label>
                        <span title="The number of independent simulation runs to perform. Multiple replications help account for randomness and provide statistical confidence in the results. Capped at 100.">
                          <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        </span>
                      </div>
                      <input
                        type="number"
                        name="reps"
                        data-testid="reps-input"
                        className="w-full px-2 py-1 text-xs border rounded"
                        value={localModelDraft.replications}
                        onChange={handleChange}
                        min="1"
                        max={MAX_REPS}
                        onBlur={saveNow}
                      />
                    </div>
                    </ViewGated>

                    {/* Time Mode */}
                    <ViewGated surface="model.field.timeMode">
                    <div>
                      <div className="flex items-center gap-1 mb-1">
                        <label className="text-xs font-medium text-gray-700">
                          Time Mode
                        </label>
                        <span title="Select how time is represented in the simulation. Clock mode uses relative time periods (e.g., Hour 0 to Hour 100), while Calendar Date mode uses actual dates and times.">
                          <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        </span>
                      </div>
                      <select
                        name="simulationTimeType"
                        className="w-full px-2 py-1 text-xs border rounded bg-white"
                        value={localModelDraft.timeMode}
                        onChange={handleChange}
                      >
                        {Object.values(SimulationTimeType).map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                    </ViewGated>

                    {/* Clock Mode Fields - Conditional */}
                    {localModelDraft.timeMode === SimulationTimeType.Clock && (
                      <>
                        {/* Clock Unit */}
                        <ViewGated surface="model.field.clockUnit">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="text-xs font-medium text-gray-700">
                              Clock Unit
                            </label>
                            <span title="The base time unit for the simulation clock (e.g., Minutes, Hours, Days). All time-based values in the model will be expressed in relation to this unit.">
                              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            </span>
                          </div>
                          <select
                            name="oneClockUnit"
                            className="w-full px-2 py-1 text-xs border rounded bg-white"
                            value={localModelDraft.timeUnit}
                            onChange={handleChange}
                          >
                            {Object.values(PeriodUnit).map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </select>
                        </div>
                        </ViewGated>

                        {/* Warmup Time - Simple number + dropdown */}
                        <ViewGated surface="model.field.warmup">
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="text-xs font-medium text-gray-700">
                              Warmup Time
                            </label>
                            <span title="The initial period during which the simulation reaches steady state. Statistics collected during warmup are discarded to ensure more accurate results.">
                              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1">
                            <input
                              type="number"
                              name="warmupClockPeriod"
                              className="w-full px-2 py-1 text-xs border rounded"
                              value={localModelDraft.warmupTime?.value || 0}
                              onChange={handleChange}
                              min="0"
                              onBlur={saveNow}
                            />
                            <select
                              name="warmupClockPeriodUnit"
                              className="w-full px-2 py-1 text-xs border rounded bg-white"
                              value={localModelDraft.warmupTime?.unit || PeriodUnit.HOURS}
                              onChange={handleChange}
                            >
                              {Object.values(PeriodUnit).map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                        </ViewGated>
                      </>
                    )}

                    {/* Calendar Date Mode Fields - Conditional.
                        Chronological order: warmup precedes start precedes
                        finish. The engine reads the run's opening bound as
                        `warmup_date_time or start_date_time`
                        (PatternGeneratorSim._generate), so warmup is the
                        EARLIEST of the three, not an afterthought appended
                        below them.

                        Each field writes what is actually ON THE WIRE: the
                        start date is the stored anchor, while the warmup and
                        finish dates write `warmupTime`/`runTime`. The previous
                        `datetime-local` inputs wrote stored
                        `warmupDateTime`/`finishDateTime` Dates that the
                        serializer drops, so those picks never reached a run —
                        and they rendered `toISOString().slice(0,16)`, feeding a
                        UTC instant into a LOCAL-time input, which skewed the
                        value by the viewer's offset on every open/save. */}
                    {localModelDraft.timeMode === SimulationTimeType.CalendarDate && (
                      <>
                        {/* Start/Finish Date below are DELIBERATELY UNGATED:
                            in calendar mode they are the only run-length
                            control that exists (Run Time and Clock Unit both
                            render only in clock mode), so hiding them would
                            leave a Basic viewer of a calendar model unable to
                            say how long the run is. Same grandfather rule the
                            option lists use -- the Time Mode SELECTOR above is
                            gated, the fields a model already uses are not.
                            Warmup is optional, so it stays gated. Mirrors
                            quodsi_studio's BasicSettingsTab exactly. */}
                        <ViewGated surface="model.field.warmup">
                        <div>
                          {/* The checkbox, the picker and the "warmup date is
                              a LENGTH on the wire" inversion all live in
                              WarmupDateField -- Studio mounts the same
                              component, so the semantics cannot drift. */}
                          <WarmupDateField
                            startIso={
                              localModelDraft.startDateTime
                                ? localModelDraft.startDateTime.toISOString()
                                : null
                            }
                            warmupTime={localModelDraft.warmupTime}
                            disabled={!hasStart}
                            hint={START_DATE_HINT}
                            onWarmupTimeChange={(warmupTime) => commitCalendar({ warmupTime })}
                          />
                        </div>
                        </ViewGated>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="text-xs font-medium text-gray-700">
                              Start Date
                            </label>
                            <span title={START_DATE_HELP}>
                              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            </span>
                          </div>
                          <CalendarDateTimeField
                            label="Start Date"
                            value={
                              localModelDraft.startDateTime
                                ? localModelDraft.startDateTime.toISOString()
                                : null
                            }
                            onCommit={(iso) => {
                              // The anchor both other fields are measured
                              // against moved, so whatever Finish was
                              // complaining about no longer applies
                              // (WarmupDateField clears its own on the same
                              // grounds, off its `startIso` prop).
                              setFinishDateError(null);
                              commitCalendar({ startDateTime: iso ? new Date(iso) : null });
                            }}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="text-xs font-medium text-gray-700">
                              Finish Date
                            </label>
                            <span title={FINISH_DATE_HELP}>
                              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            </span>
                          </div>
                          <CalendarDateTimeField
                            label="Finish Date"
                            value={finishDateDerived}
                            disabled={!hasStart}
                            hint={START_DATE_HINT}
                            error={finishDateError}
                            onCommit={(iso) => {
                              if (startMs === undefined) return;
                              if (iso === null) {
                                setFinishDateError("A run needs a finish date");
                                return;
                              }
                              const picked = Date.parse(iso);
                              if (Number.isNaN(picked)) return;
                              if (picked <= startMs) {
                                // A finish at or before the start is a
                                // zero/negative run, which the engine rejects.
                                setFinishDateError("Finish must be after the start date");
                                return;
                              }
                              setFinishDateError(null);
                              commitCalendar({ runTime: msToCoarsestDuration(picked - startMs) });
                            }}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </AccordionSection>
                )}


                {/* Auto-save status */}
                <SaveStatusLine status={saveError ? "error" : status} lastSavedAt={lastSavedAt} />
              </div>
          </div>
      )}
      {/* Every list tab takes the editor's one model-root accessor (spec
          2026-09-12). ModelEditorForPage owns the loading gate; ElementEditor
          owns the per-page remount. */}
      {activeOrFallback === "states" && <StatesTab accessor={accessor} />}
      {activeOrFallback === "entities" && <EntitiesTab accessor={accessor} />}
      {activeOrFallback === "resources" && <ResourcesTab accessor={accessor} />}
      {activeOrFallback === "arrivals" && <ArrivalsTab accessor={accessor} />}
      {activeOrFallback === "schedules" && <SchedulesTab accessor={accessor} />}
      {activeOrFallback === "requirements" && (
        <ResourceRequirementsEditor accessor={accessor} referenceCleanup="host" />
      )}
      {activeOrFallback === "levers" && (
        <div className="space-y-2 p-2">
          <LeverAuthoringSection
            variant="flat"
            objectType={ScenarioObjectType.MODEL}
            componentName={localModelDraft.name}
            levers={localModelDraft.levers ?? []}
            onChange={(next: ScenarioLever[]) => {
              setLocalModelDraft((prev) => updateModelImmutably(prev, { levers: next }));
              setHasPendingChanges(true);
            }}
          />
        </div>
      )}
      {activeOrFallback === "validation" && (
        <ValidationDashboard
          validationState={validationState || null}
          onGoToModelSettings={() => setActiveTab("basic")}
          onGoToEntities={() => setActiveTab("entities")}
        />
      )}
    </div>
  );
};

export default React.memo(ModelEditor);
