import React, { useState, useEffect, useCallback } from "react";
import {
  Model,
  ModelDefaults,
  Duration,
  PeriodUnit,
  SimulationTimeType,
  StateListManager,
  ValidationResult,
  ScenarioObjectType,
  type ScenarioLever,
} from "@quodsi/lucid-shared";
import { Settings, Hash, Info, Users, AlertTriangle, Boxes, Briefcase, CalendarClock } from "lucide-react";
import { LeverAuthoringSection } from "./LeverAuthoringSection";
import StatesEditor from "./StatesEditor";
import EntitiesEditor, { EntityRow } from "./EntitiesEditor";
import { AccordionSection } from "../shared/AccordionSection";
import { ResourceRequirementsEditor } from "quodsi_studio/platforms/shared";
import { ArrivalsTab } from "./ArrivalsTab";
import { ResourcesTab } from "./ResourcesTab";
import { useReferenceDataAccessor } from "../../adapters/useReferenceDataAccessor";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";
import {
  extractModelData,
  updateModelImmutably,
  type ModelInput,
} from "../utils/modelEditorHelpers";
import { ValidationDashboard } from "./ValidationDashboard";
import { EditorReferenceData, ResourceRequirement } from "@quodsi/lucid-shared";

// ============================================================================
// TYPES
// ============================================================================

interface Props {
  model: Model;
  onSave: (model: Model) => void;
  onRemoveModel?: () => void;
  onValidate?: () => void;
  states: StateListManager;
  onStatesChange: (states: StateListManager) => void;
  entities: EntityRow[];
  onEntitiesChange: (entities: EntityRow[]) => void;
  referenceData?: EditorReferenceData;
  resourceRequirements?: ResourceRequirement[];
  validationState?: ValidationResult | null;
  activeTab?: EditorTab;
  onTabChange?: (tab: EditorTab) => void;
  onSimulate?: (scenarioName?: string, scenarioDefinitionId?: string, enableAnimation?: boolean) => void;
}

export type EditorTab = "basic" | "states" | "entities" | "resources" | "requirements" | "arrivals" | "scenarios" | "validation";

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
    id: "validation" as const,
    title: "Validation",
    icon: AlertTriangle,
    tooltip: "View comprehensive model validation results and resolve any issues"
  },
];

/**
 * Default random seed value used when no seed is specified.
 * This provides reproducible simulation results for testing and debugging.
 */
const DEFAULT_RANDOM_SEED = ModelDefaults.DEFAULT_SEED;

/**
 * Maximum replications a model may run — single-sourced from @quodsi/shared
 * (re-exported via @quodsi/lucid-shared). Enforced in the UI and the backend.
 */
const MAX_REPS = ModelDefaults.MAX_REPS;

/**
 * ModelEditor - Component for editing model-level simulation settings
 *
 * The ModelEditor orchestrates the configuration of simulation model settings across
 * multiple tabs, including basic properties, state variables, resource requirements,
 * simulation scenarios, and validation. It acts as a container for specialized sub-editors.
 *
 * Features:
 * - Four-tab interface: Basic Settings, State Definitions, Resource Requirements, and Validation
 * - Controlled component with immediate UI updates
 * - Auto-save for all fields via useAutoSave hook (debounce + onBlur flush;
 *   useFlushOnChange flush for select dropdowns)
 *
 * Tabs:
 * - Basic: Model name, simulation parameters (reps, seed), and time configuration
 * - States: Model-level state variables accessible throughout the simulation
 * - Requirements: Reusable resource requirement templates for activities
 * - Validation: View and resolve model validation issues
 *
 * State Management:
 * - Maintains local draft state (localModelDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for model switching and save completion detection
 * - Single save path: all Basic-tab field changes route through useAutoSave (debounced)
 *
 * Save Behavior:
 * - Basic tab — Typed inputs (name, reps, runClockPeriod, warmupClockPeriod,
 *   startDateTime, finishDateTime, warmupDateTime): debounced auto-save on edit;
 *   immediate save on blur or element switch.
 * - Basic tab — Selects (simulationTimeType, runClockPeriodUnit, oneClockUnit,
 *   warmupClockPeriodUnit): immediate save via useFlushOnChange (selects have no
 *   useful onBlur).
 * - Save defaulting: onSave is wrapped in onSaveWithDefaults that applies fallbacks
 *   for falsy fields (DEFAULT_RANDOM_SEED for seed, PeriodUnit.HOURS for unit
 *   selectors, etc.) so every saved Model is fully populated even if the user
 *   blanked optional fields.
 * - States tab: Auto-saves immediately via parent onStatesChange.
 * - Requirements tab: Auto-saves immediately via updateResourceRequirements.
 * - Validation tab: Read-only.
 * - Status surfaced via SaveStatusLine ("Saved" / "Saving…" / "Save failed —
 *   keep typing to retry"). Native LucidChart Ctrl+Z reverses saved changes.
 *
 * @param props - Component props
 * @returns Rendered model editor component
 */
const ModelEditor: React.FC<Props> = ({ model, onSave, onRemoveModel, onValidate, states, onStatesChange, entities, onEntitiesChange, referenceData, validationState, activeTab: activeTabProp, onTabChange: onTabChangeProp, onSimulate }) => {
  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Local state for tab management (used as fallback if props not provided)
  const [localActiveTab, setLocalActiveTab] = useState<EditorTab>("basic");

  // Use props if provided, otherwise fall back to local state (backward compatible)
  const activeTab = activeTabProp ?? localActiveTab;
  const setActiveTab = onTabChangeProp ?? setLocalActiveTab;
  const [isAdvancedExpanded, setIsAdvancedExpanded] = useState(false); // Start collapsed
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const { updateResourceRequirements } = useModelOpsSender();
  const accessor = useReferenceDataAccessor(referenceData, { updateResourceRequirements });

  // Direct form state management
  const [localModelDraft, setLocalModelDraft] = useState<Model>(() => extractModelData(model));
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

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
  const isSaving = localModelDraft.id ? elementOpsState.isSaving(localModelDraft.id) : false;

  // Custom hooks for state synchronization
  useFormSync(
    model.id,
    hasPendingChanges,
    () => extractModelData(model),
    setLocalModelDraft,
    setHasPendingChanges
  );

  useSaveCompletionDetector(isSaving, setHasPendingChanges);

  // Wrap onSave with defaulting logic preserved from the deleted handleSave.
  // Auto-save dispatches the raw draft; this callback applies fallbacks for
  // fields that may be falsy (e.g., seed has no UI input — always defaults).
  const onSaveWithDefaults = useCallback(
    (draft: Model) => {
      const modelToSave = new Model(
        draft.id,
        draft.name,
        draft.replications || 1,
        draft.seed || DEFAULT_RANDOM_SEED,
        draft.timeUnit || PeriodUnit.HOURS,
        draft.timeMode || SimulationTimeType.Clock,
        draft.warmupTime ?? Duration.constant(0, PeriodUnit.HOURS),
        draft.runTime ?? Duration.constant(0, PeriodUnit.HOURS),
        draft.warmupDateTime || null,
        draft.startDateTime || null,
        draft.finishDateTime || null
      );
      modelToSave.description = draft.description;
      modelToSave.levers = draft.levers;
      modelToSave.scenarios = draft.scenarios;
      onSave(modelToSave);
    },
    [onSave]
  );

  const { status, lastSavedAt, saveNow } = useAutoSave<Model>({
    draft: localModelDraft,
    hasPendingChanges,
    isValid: true, // No validation: only one Model per document, no name-uniqueness check needed.
    onSave: onSaveWithDefaults,
    isSaving,
    elementId: localModelDraft.id,
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
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col bg-white">
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
                // flex-1 + centered icon: the strip shares the dock width
                // across however many tabs exist (seven since the Resources
                // and Arrivals tabs landed), instead of a fixed px-3 per tab
                // that overflowed the 300px dock and forced a horizontal
                // scrollbar.
                className={`flex-1 flex justify-center px-1 py-2 border-b-2 ${
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

      {activeTab === "basic" && (
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

                {/* Advanced Settings - Accordion */}
                <AccordionSection
                  title="Advanced Settings"
                  isExpanded={isAdvancedExpanded}
                  onToggle={() => setIsAdvancedExpanded(!isAdvancedExpanded)}
                >
                  <div className="space-y-2">
                    {/* Replications */}
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

                    {/* Time Mode */}
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

                    {/* Clock Mode Fields - Conditional */}
                    {localModelDraft.timeMode === SimulationTimeType.Clock && (
                      <>
                        {/* Clock Unit */}
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

                        {/* Warmup Time - Simple number + dropdown */}
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
                      </>
                    )}

                    {/* Calendar Date Mode Fields - Conditional */}
                    {localModelDraft.timeMode === SimulationTimeType.CalendarDate && (
                      <>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="text-xs font-medium text-gray-700">
                              Start Date
                            </label>
                            <span title="The calendar date and time when the simulation begins in Calendar Date mode. Use this to model processes that align with specific real-world dates.">
                              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            </span>
                          </div>
                          <input
                            type="datetime-local"
                            name="startDateTime"
                            className="w-full px-2 py-1 text-xs border rounded"
                            value={localModelDraft.startDateTime?.toISOString().slice(0, 16) || ""}
                            onChange={handleChange}
                            onBlur={saveNow}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="text-xs font-medium text-gray-700">
                              Finish Date
                            </label>
                            <span title="The calendar date and time when the simulation ends in Calendar Date mode. The simulation will run from Start Date to this Finish Date.">
                              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            </span>
                          </div>
                          <input
                            type="datetime-local"
                            name="finishDateTime"
                            className="w-full px-2 py-1 text-xs border rounded"
                            value={localModelDraft.finishDateTime?.toISOString().slice(0, 16) || ""}
                            onChange={handleChange}
                            onBlur={saveNow}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <label className="text-xs font-medium text-gray-700">
                              Warmup Date
                            </label>
                            <span title="The calendar date and time when the warmup period ends and statistics collection begins in Calendar Date mode. Set this between Start Date and Finish Date.">
                              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                            </span>
                          </div>
                          <input
                            type="datetime-local"
                            name="warmupDateTime"
                            className="w-full px-2 py-1 text-xs border rounded"
                            value={localModelDraft.warmupDateTime?.toISOString().slice(0, 16) || ""}
                            onChange={handleChange}
                            onBlur={saveNow}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </AccordionSection>

                {/* Study levers */}
                <LeverAuthoringSection
                  objectType={ScenarioObjectType.MODEL}
                  componentName={localModelDraft.name}
                  levers={localModelDraft.levers ?? []}
                  onChange={(next: ScenarioLever[]) => {
                    setLocalModelDraft((prev) =>
                      updateModelImmutably(prev, { levers: next })
                    );
                    setHasPendingChanges(true);
                  }}
                />

                {/* Auto-save status */}
                <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
              </div>
          </div>
      )}
      {activeTab === "states" && (
        <StatesEditor
            states={states}
            onStatesChange={onStatesChange}
            defaultComponentType="ALL"
            referenceData={referenceData}
          />
      )}
      {activeTab === "entities" && (
        <EntitiesEditor
            entities={entities}
            onEntitiesChange={onEntitiesChange}
          />
      )}
      {activeTab === "resources" && <ResourcesTab />}
      {activeTab === "arrivals" && <ArrivalsTab />}
      {activeTab === "requirements" && (
        <ResourceRequirementsEditor accessor={accessor} referenceCleanup="host" />
      )}
      {activeTab === "validation" && (
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
