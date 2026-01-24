import React, { useState, useEffect } from "react";
import {
  Duration,
  Generator,
  GeneratorType,
  ISerializedTimePattern,
  ISerializedTimeDistributedConfig,
  EditorReferenceData,
  PeriodUnit,
  Distribution,
  StateListManager,
  ComponentType,
  EntitySourceConfig,
  createDefaultEntitySourceConfig,
  ModelDefaults,
  SimulationObjectType,
  isNameUniqueInReferenceData,
} from "@quodsi/shared";
import { Settings, Hash, Zap, Info, ChevronDown, ChevronRight } from "lucide-react";
import { EnhancedDurationEditor } from "./EnhancedDurationEditor";
import StatesEditor from "./StatesEditor";
import StateModificationsEditor from "./StateModificationsEditor";
import TimePatternEditorModal from "./TimePatternEditorModal";
import TimeDistributedConfigEditorModal from "./TimeDistributedConfigEditorModal";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";
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
  /** Callback when user clicks Cancel */
  onCancel: () => void;
  /** Reference data for dropdowns (entities, etc.) - includes timePatterns and timeDistributedConfigs */
  referenceData: EditorReferenceData;
  /** State manager for model-level states */
  states: StateListManager;
  /** Callback when states are modified */
  onStatesChange: (states: StateListManager) => void;
  /** Callback when time patterns are modified */
  onTimePatternsChange: (patterns: ISerializedTimePattern[]) => void;
  /** Callback when time distributed configs are modified */
  onTimeDistributedConfigsChange: (configs: ISerializedTimeDistributedConfig[]) => void;
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
 * - Distribution: Time patterns and configurations (TIME_DISTRIBUTED generators only)
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
 * - Generator type selector determines which tabs are visible (FREQUENCY vs TIME_DISTRIBUTED)
 * - Automatic tab switching when generator type changes
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
  onTimePatternsChange,
  onTimeDistributedConfigsChange,
}) => {
  // Access timePatterns and timeDistributedConfigs from referenceData (serialized format)
  const serializedTimePatterns = referenceData.timePatterns || [];
  const serializedTimeDistributedConfigs = referenceData.timeDistributedConfigs || [];

  // ============================================================================
  // CONVERSION UTILITIES (Serialized ↔ Class Instances)
  // ============================================================================

  /**
   * Converts ISerializedTimePattern to TimePattern-like object for modal editing
   */
  const deserializeTimePattern = (serialized: ISerializedTimePattern): any => {
    const pattern: any = {
      id: serialized.unique_id,
      name: serialized.name,
      weeklyWeights: serialized.weeklyWeights || [],
      dayOfWeekWeights: serialized.dayOfWeekWeights || [],
      dayOfWeekHourWeights: serialized.dayOfWeekHourWeights || [],
      minuteDistribution: {
        durationPeriodUnit: serialized.minuteDistributionDef.durationPeriodUnit,
        distribution: serialized.minuteDistributionDef.distribution
      }
    };
    return pattern;
  };

  /**
   * Converts TimePattern-like object to ISerializedTimePattern
   */
  const serializeTimePattern = (pattern: any): ISerializedTimePattern => ({
    unique_id: pattern.id,
    name: pattern.name,
    weeklyWeights: pattern.weeklyWeights,
    dayOfWeekWeights: pattern.dayOfWeekWeights,
    dayOfWeekHourWeights: pattern.dayOfWeekHourWeights,
    minuteDistributionDef: {
      durationPeriodUnit: pattern.minuteDistribution.durationPeriodUnit,
      distribution: pattern.minuteDistribution.distribution
    }
  });

  /**
   * Converts ISerializedTimeDistributedConfig to TimeDistributedConfig class instance
   */
  const deserializeTimeDistributedConfig = (serialized: ISerializedTimeDistributedConfig): any => ({
    id: serialized.unique_id,
    name: serialized.name,
    timePatternId: serialized.timePatternId,
    totalVolume: serialized.totalVolume,
    volumePeriodBasis: serialized.volumePeriodBasis,
    startDate: serialized.startDate,
    endDate: serialized.endDate
  });

  /**
   * Converts TimeDistributedConfig class instance to ISerializedTimeDistributedConfig
   */
  const serializeTimeDistributedConfig = (config: any): ISerializedTimeDistributedConfig => ({
    unique_id: config.id,
    name: config.name,
    timePatternId: config.timePatternId,
    totalVolume: config.totalVolume,
    volumePeriodBasis: config.volumePeriodBasis,
    startDate: config.startDate,
    endDate: config.endDate
  });

  // Convert serialized arrays to class instances for use in modals
  const timePatterns = serializedTimePatterns.map(deserializeTimePattern);
  const timeDistributedConfigs = serializedTimeDistributedConfigs.map(deserializeTimeDistributedConfig);

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
    const existingConfig = data.generationConfig;

    // Build generationConfig, merging existing values with defaults for any missing fields
    const generationConfig: EntitySourceConfig = {
      entityId: existingConfig?.entityId ?? data.entityId ?? ModelDefaults.DEFAULT_ENTITY_ID,
      generatorType: existingConfig?.generatorType ?? data.generatorType ?? GeneratorType.FREQUENCY,
      periodicOccurrences: existingConfig?.periodicOccurrences ?? data.periodicOccurrences ?? INFINITY_DISPLAY_VALUE,
      periodIntervalDuration: existingConfig?.periodIntervalDuration ?? data.periodIntervalDuration ?? new Duration(),
      entitiesPerCreation: existingConfig?.entitiesPerCreation ?? data.entitiesPerCreation ?? 1,
      periodicStartDuration: existingConfig?.periodicStartDuration ?? data.periodicStartDuration ?? new Duration(),
      maxEntities: existingConfig?.maxEntities ?? data.maxEntities ?? INFINITY_DISPLAY_VALUE,
      timeDistributedConfigIds: existingConfig?.timeDistributedConfigIds
        ? [...existingConfig.timeDistributedConfigIds]
        : (data.timeDistributedConfigIds ? [...data.timeDistributedConfigIds] : []),
      initialStateModifications: existingConfig?.initialStateModifications
        ? [...existingConfig.initialStateModifications]
        : (data.initialStateModifications ? [...data.initialStateModifications] : [])
    };

    return new Generator(
      data.id || "",
      data.name || "New Generator",
      generationConfig,
      data.exitConnector,
      data.x || 0,
      data.y || 0
    );
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
      exitConnector: string;
      // generationConfig fields
      entityId: string;
      generatorType: GeneratorType;
      periodicOccurrences: number;
      periodIntervalDuration: Duration;
      entitiesPerCreation: number;
      periodicStartDuration: Duration;
      maxEntities: number;
      initialStateModifications: any[];
      timeDistributedConfigIds: string[];
    }>
  ): Generator => {
    // Build updated generationConfig
    const updatedConfig: EntitySourceConfig = {
      entityId: updates.entityId ?? base.generationConfig.entityId,
      generatorType: updates.generatorType ?? base.generationConfig.generatorType,
      periodicOccurrences: updates.periodicOccurrences ?? base.generationConfig.periodicOccurrences,
      periodIntervalDuration: updates.periodIntervalDuration ?? base.generationConfig.periodIntervalDuration,
      entitiesPerCreation: updates.entitiesPerCreation ?? base.generationConfig.entitiesPerCreation,
      periodicStartDuration: updates.periodicStartDuration ?? base.generationConfig.periodicStartDuration,
      maxEntities: updates.maxEntities ?? base.generationConfig.maxEntities,
      timeDistributedConfigIds: updates.timeDistributedConfigIds ?? base.generationConfig.timeDistributedConfigIds,
      initialStateModifications: updates.initialStateModifications ?? base.generationConfig.initialStateModifications
    };

    return new Generator(
      base.id,
      updates.name ?? base.name,
      updatedConfig,
      updates.exitConnector ?? base.exitConnector,
      base.x,
      base.y
    );
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
   * Modal state for TimePattern editor
   */
  const [patternModalState, setPatternModalState] = useState<{
    isOpen: boolean;
    pattern: any | null;
  }>({ isOpen: false, pattern: null });

  /**
   * Modal state for TimeDistributedConfig editor
   */
  const [configModalState, setConfigModalState] = useState<{
    isOpen: boolean;
    config: any | null;
  }>({ isOpen: false, config: null });

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

  // Reset nameError when generator changes
  useEffect(() => {
    setNameError(null);
  }, [localGeneratorDraft.id]);

  const entities = referenceData.entities || [];

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
      } else if (name === 'generatorType') {
        updates.generatorType = value as GeneratorType;
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
   * but NOT persisted until user clicks Save button (consistent with ActivityEditor).
   *
   * Sets hasPendingChanges to enable the Save button.
   */
  const handleDurationChange = (
    name: "periodIntervalDuration" | "periodicStartDuration",
    periodUnit: PeriodUnit,
    distribution: Distribution
  ) => {
    setLocalGeneratorDraft(prev => {
      // Build updated duration object
      const updates: any = {};

      if (name === "periodIntervalDuration") {
        updates.periodIntervalDuration = {
          ...prev.generationConfig.periodIntervalDuration,
          durationPeriodUnit: periodUnit,
          distribution,
        };
      } else if (name === "periodicStartDuration") {
        updates.periodicStartDuration = {
          ...prev.generationConfig.periodicStartDuration,
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

  /**
   * Opens the TimePattern editor modal for creating a new pattern
   */
  const handleAddPattern = () => {
    setPatternModalState({ isOpen: true, pattern: null });
  };

  /**
   * Opens the TimePattern editor modal for editing an existing pattern
   */
  const handleEditPattern = (pattern: any) => {
    setPatternModalState({ isOpen: true, pattern });
  };

  /**
   * Handles saving a TimePattern (create or update)
   */
  const handleSavePattern = (pattern: any) => {
    const existingIndex = timePatterns.findIndex(p => p.id === pattern.id);
    let updatedPatterns: any[];

    if (existingIndex >= 0) {
      // Update existing
      updatedPatterns = [...timePatterns];
      updatedPatterns[existingIndex] = pattern;
    } else {
      // Add new
      updatedPatterns = [...timePatterns, pattern];
    }

    // Serialize before sending to parent
    const serializedPatterns = updatedPatterns.map(serializeTimePattern);
    onTimePatternsChange(serializedPatterns);
    setPatternModalState({ isOpen: false, pattern: null });
  };

  /**
   * Handles deleting a TimePattern
   */
  const handleDeletePattern = (patternId: string) => {
    if (window.confirm("Are you sure you want to delete this pattern? Configurations using it will become invalid.")) {
      const updatedPatterns = timePatterns.filter(p => p.id !== patternId);
      // Serialize before sending to parent
      const serializedPatterns = updatedPatterns.map(serializeTimePattern);
      onTimePatternsChange(serializedPatterns);
    }
  };

  /**
   * Opens the TimeDistributedConfig editor modal for creating a new config
   */
  const handleAddConfig = () => {
    setConfigModalState({ isOpen: true, config: null });
  };

  /**
   * Opens the TimeDistributedConfig editor modal for editing an existing config
   */
  const handleEditConfig = (config: any) => {
    setConfigModalState({ isOpen: true, config });
  };

  /**
   * Handles saving a TimeDistributedConfig (create or update)
   */
  const handleSaveConfig = (config: any) => {
    const existingIndex = timeDistributedConfigs.findIndex(c => c.id === config.id);
    let updatedConfigs: any[];

    if (existingIndex >= 0) {
      // Update existing
      updatedConfigs = [...timeDistributedConfigs];
      updatedConfigs[existingIndex] = config;
    } else {
      // Add new
      updatedConfigs = [...timeDistributedConfigs, config];
    }

    // Serialize before sending to parent
    const serializedConfigs = updatedConfigs.map(serializeTimeDistributedConfig);
    onTimeDistributedConfigsChange(serializedConfigs);
    setConfigModalState({ isOpen: false, config: null });
  };

  /**
   * Handles deleting a TimeDistributedConfig
   */
  const handleDeleteConfig = (configId: string) => {
    if (window.confirm("Are you sure you want to delete this configuration?")) {
      const updatedConfigs = timeDistributedConfigs.filter(c => c.id !== configId);
      // Serialize before sending to parent
      const serializedConfigs = updatedConfigs.map(serializeTimeDistributedConfig);
      onTimeDistributedConfigsChange(serializedConfigs);

      // Remove from generator's config IDs if present
      const configIds = localGeneratorDraft.generationConfig.timeDistributedConfigIds || [];
      if (configIds.includes(configId)) {
        const updatedConfigIds = configIds.filter(id => id !== configId);
        setLocalGeneratorDraft(prev => updateGeneratorImmutably(prev, {
          timeDistributedConfigIds: updatedConfigIds
        }));
        setHasPendingChanges(true);
      }
    }
  };

  /**
   * Toggles a config association with the current generator
   */
  const handleToggleConfigAssociation = (configId: string) => {
    const currentIds = localGeneratorDraft.generationConfig.timeDistributedConfigIds || [];
    const isCurrentlySelected = currentIds.includes(configId);

    const updatedIds = isCurrentlySelected
      ? currentIds.filter(id => id !== configId)
      : [...currentIds, configId];

    setLocalGeneratorDraft(prev => updateGeneratorImmutably(prev, {
      timeDistributedConfigIds: updatedIds
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
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
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
                value={localGeneratorDraft.generationConfig.entityId}
                onChange={handleInputChange}
              >
                {entities.map((entity) => (
                  <option key={entity.id} value={entity.id}>
                    {entity.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Generator Type Selection */}
            <div className="pt-2 border-t">
              <div className="flex items-center gap-1 mb-1">
                <label className="text-xs font-medium text-gray-700">
                  Generator Type
                </label>
                <span title="FREQUENCY: Creates entities at regular intervals using interarrival time. TIME_DISTRIBUTED: Creates entities based on temporal patterns (weekly, daily, hourly weights) and date ranges.">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>
              <select
                name="generatorType"
                className="w-full px-2 py-1.5 text-xs border rounded bg-white"
                value={localGeneratorDraft.generationConfig.generatorType}
                onChange={handleInputChange}
              >
                <option value={GeneratorType.FREQUENCY}>Frequency-Based</option>
                <option value={GeneratorType.TIME_DISTRIBUTED}>Time-Distributed</option>
              </select>
            </div>

            {/* Dynamic content based on generator type */}
            {localGeneratorDraft.generationConfig.generatorType === GeneratorType.FREQUENCY ? (
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
                      localGeneratorDraft.generationConfig.periodIntervalDuration?.durationPeriodUnit ?? PeriodUnit.HOURS
                    }
                    distribution={
                      localGeneratorDraft.generationConfig.periodIntervalDuration!.distribution
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
                </div>

                {/* Advanced Settings - Expandable */}
                <div className="pt-2 border-t">
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
                          value={localGeneratorDraft.generationConfig.periodicOccurrences}
                          onChange={handleInputChange}
                          min="0"
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
                            localGeneratorDraft.generationConfig.periodicStartDuration?.durationPeriodUnit ?? PeriodUnit.HOURS
                          }
                          distribution={localGeneratorDraft.generationConfig.periodicStartDuration!.distribution}
                          onChange={(periodUnit, distribution) =>
                            handleDurationChange(
                              "periodicStartDuration",
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
                              value={localGeneratorDraft.generationConfig.entitiesPerCreation}
                              onChange={handleInputChange}
                              min="1"
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
                              value={localGeneratorDraft.generationConfig.maxEntities}
                              onChange={handleInputChange}
                              min="1"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="pt-2 border-t space-y-3">
                {/* Time Patterns Section */}
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-gray-700">Time Patterns</span>
                      <span title="Reusable temporal distribution patterns defining weekly, daily, and hourly weights">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddPattern}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add Pattern
                    </button>
                  </div>
                  {timePatterns.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">
                      No patterns defined yet. Click "Add Pattern" to create one.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {timePatterns.map((pattern) => (
                        <div
                          key={pattern.id}
                          className="flex items-center justify-between bg-white p-2 rounded border border-gray-200 hover:border-blue-300"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-700 truncate">
                              {pattern.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {pattern.weeklyWeights.length > 0 && `Weekly: ${pattern.weeklyWeights.length} weights`}
                              {pattern.dayOfWeekWeights.length > 0 && ` • Daily: ${pattern.dayOfWeekWeights.length} weights`}
                              {pattern.dayOfWeekHourWeights.length > 0 && ` • Hourly: ${pattern.dayOfWeekHourWeights.length} weights`}
                              {pattern.weeklyWeights.length === 0 && pattern.dayOfWeekWeights.length === 0 && pattern.dayOfWeekHourWeights.length === 0 && "Uniform distribution"}
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              type="button"
                              onClick={() => handleEditPattern(pattern)}
                              className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeletePattern(pattern.id)}
                              className="px-2 py-1 text-xs border rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Time Distributed Configs Section */}
                <div className="bg-gray-50 p-2 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-gray-700">Distribution Configurations</span>
                      <span title="Configurations combining a time pattern with volume and date range. Select which configs this generator uses.">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddConfig}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Add Config
                    </button>
                  </div>
                  {timeDistributedConfigs.length === 0 ? (
                    <div className="text-xs text-gray-500 italic">
                      No configurations defined yet. Click "Add Config" to create one.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {timeDistributedConfigs.map((config) => {
                        const isSelected = (localGeneratorDraft.generationConfig.timeDistributedConfigIds || []).includes(config.id);
                        const pattern = timePatterns.find(p => p.id === config.timePatternId);

                        return (
                          <div
                            key={config.id}
                            className={`flex items-center gap-2 bg-white p-2 rounded border ${
                              isSelected ? "border-blue-400 bg-blue-50" : "border-gray-200"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleConfigAssociation(config.id)}
                              className="flex-shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-700 truncate">
                                {config.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {pattern?.name || "Unknown pattern"} • {config.totalVolume} {config.volumePeriodBasis.toLowerCase()} • {config.startDate} to {config.endDate}
                              </div>
                            </div>
                            <div className="flex gap-1 ml-2 flex-shrink-0">
                              <button
                                type="button"
                                onClick={() => handleEditConfig(config)}
                                className="px-2 py-1 text-xs border rounded hover:bg-gray-50"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteConfig(config.id)}
                                className="px-2 py-1 text-xs border rounded hover:bg-red-50 hover:border-red-300 hover:text-red-600"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "events" && (
          <StateModificationsEditor
            modifications={localGeneratorDraft.generationConfig.initialStateModifications || []}
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

      {/* Save/Cancel Buttons */}
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
            disabled={!hasPendingChanges || nameError !== null}
            className={`px-3 py-1.5 text-xs rounded ${
              hasPendingChanges && nameError === null
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            Save
          </button>
      </div>

      {/* Modals */}
      {patternModalState.isOpen && (
        <TimePatternEditorModal
          pattern={patternModalState.pattern}
          onSave={handleSavePattern}
          onCancel={() => setPatternModalState({ isOpen: false, pattern: null })}
        />
      )}

      {configModalState.isOpen && (
        <TimeDistributedConfigEditorModal
          config={configModalState.config}
          availablePatterns={timePatterns}
          onSave={handleSaveConfig}
          onCancel={() => setConfigModalState({ isOpen: false, config: null })}
        />
      )}
    </div>
  );
};

export default React.memo(GeneratorEditor);
