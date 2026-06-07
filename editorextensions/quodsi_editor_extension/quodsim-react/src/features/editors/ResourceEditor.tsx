import React, { useState, useEffect } from "react";
import { Settings, DollarSign, Hash, Info } from "lucide-react";
import {
  Resource,
  ResourceFinancialProperties,
  StateListManager,
  ComponentType,
  SimulationObjectType,
  EditorReferenceData,
  isNameUniqueInReferenceData,
} from "@quodsi/lucid-shared";
import StatesEditor from "./StatesEditor";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for extractResourceData - accepts various formats of resource data
 */
type ResourceInput = Resource | { data: Partial<Resource> } | Partial<Resource>;

/**
 * Props for the ResourceEditor component
 */
interface Props {
  /** The resource being edited */
  resource: Resource;
  /** Callback invoked when user saves changes */
  onSave: (resource: Resource) => void;
  /** State variables associated with this resource */
  states: StateListManager;
  /** Callback invoked when state definitions change */
  onStatesChange: (states: StateListManager) => void;
  /** Reference data for validation (resources, activities, etc.) */
  referenceData?: EditorReferenceData;
}

/**
 * Available tabs in the ResourceEditor
 * - basic: Resource name and capacity
 * - finance: Financial tracking (costs per seize, utilization, idle)
 * - states: State variable definitions
 */
type ResourceTab = "basic" | "finance" | "states";

// Tab navigation configuration
const TAB_CONFIG = [
  {
    id: "basic" as const,
    title: "Basic Settings",
    icon: Settings,
    tooltip: "Configure resource name and capacity (maximum number of concurrent uses)"
  },
  {
    id: "finance" as const,
    title: "Financial Settings",
    icon: DollarSign,
    tooltip: "Track resource costs including per-seize costs and time-based utilization costs"
  },
  // Temporarily hidden - states managed at Model level
  // {
  //   id: "states" as const,
  //   title: "State Definitions",
  //   icon: Hash,
  //   tooltip: "Define custom state variables that this resource can track and modify"
  // },
];


/**
 * ResourceEditor - Component for editing resource properties
 *
 * Resources are constraining factors in a simulation that entities must seize
 * (acquire) before performing certain activities and release after completion.
 * Examples include: machines, workers, rooms, tools, or any limited capacity asset.
 *
 * Features:
 * - Three-tab interface: Basic properties, Financial tracking, and State definitions
 * - Controlled component with immediate UI updates
 * - Auto-save for all fields via useAutoSave hook (debounce + onBlur flush;
 *   useEffect flush for the financial-enabled checkbox)
 *
 * Tabs:
 * - Basic: Resource name and capacity (max concurrent uses)
 * - Finance: Cost tracking (per-seize, utilization, idle costs)
 * - States: Custom state variables for resource tracking
 *
 * State Management:
 * - Maintains local draft state (localResourceDraft) for immediate UI updates
 * - Syncs with Redux for save state tracking (isSaving)
 * - Uses custom hooks for resource switching and save completion detection
 *
 * Save Behavior:
 * - Basic tab (name, capacity): debounced auto-save on edit; immediate save on
 *   blur or element switch.
 * - Finance tab (enabled, 3 cost fields): cost fields auto-save on edit/blur;
 *   the enabled checkbox triggers saveNow via a useEffect since it has no blur.
 * - States tab: Auto-saves immediately (handled by StatesEditor).
 * - Status surfaced via SaveStatusLine ("Saved" / "Saving…" / "Fix errors to
 *   save" / "Save failed — keep typing to retry"). Native LucidChart Ctrl+Z
 *   reverses saved changes.
 *
 * @param props - Component props
 * @returns Rendered resource editor component
 */
const ResourceEditor: React.FC<Props> = ({ resource, onSave, states, onStatesChange, referenceData }) => {
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Extracts and normalizes resource data from props into a clean Resource instance.
   *
   * This handles multiple data formats:
   * - Full Resource instances
   * - Raw data objects with nested .data property
   * - Missing/null values (creates default resource)
   * - Initializes financial properties if not present
   *
   * @param res - Resource data in various formats
   * @returns Normalized Resource instance with initialized financial properties
   */
  const extractResourceData = (res: ResourceInput): Resource => {
    const data = (res as any).data || res;
    const extractedResource = new Resource(
      data.id || "",
      data.name || "New Resource",
      data.capacity || 1,
      data.x || 0,
      data.y || 0
    );

    // Initialize financialProperties if it doesn't exist
    extractedResource.financialProperties = data.financialProperties
      ? ResourceFinancialProperties.fromJSON(data.financialProperties)
      : new ResourceFinancialProperties();

    return extractedResource;
  };

  /**
   * Creates a new Resource instance with updated values while preserving immutability.
   *
   * This helper ensures that Resource updates trigger React re-renders by creating
   * new object references. It handles partial updates, filling in missing values
   * from the base Resource.
   *
   * @param base - The base Resource to update
   * @param updates - Partial object containing fields to update
   * @returns New Resource instance with updated values
   *
   * @example
   * const updated = updateResourceImmutably(resource, { name: "New Name", capacity: 5 });
   */
  const updateResourceImmutably = (
    base: Resource,
    updates: Partial<{
      name: string;
      capacity: number;
      financialProperties: ResourceFinancialProperties;
    }>
  ): Resource => {
    const updated = new Resource(
      base.id,
      updates.name ?? base.name,
      updates.capacity ?? base.capacity,
      base.x,
      base.y
    );

    updated.financialProperties = updates.financialProperties ?? base.financialProperties;

    return updated;
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Local component state
  const [localResourceDraft, setLocalResourceDraft] = useState<Resource>(() => extractResourceData(resource));
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<ResourceTab>("basic");

  // Name validation state
  const [nameError, setNameError] = useState<string | null>(null);

  /**
   * Validates that the resource name is unique among all resources.
   * @param name - The name to validate
   * @returns Error message if invalid, null if valid
   */
  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Name is required';
    }
    if (referenceData && !isNameUniqueInReferenceData(
      referenceData,
      SimulationObjectType.Resource,
      name,
      localResourceDraft.id
    )) {
      return `A Resource named "${name}" already exists`;
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
  const isSaving = localResourceDraft.id ? elementOpsState.isSaving(localResourceDraft.id) : false;

  // Custom hooks for state synchronization
  useFormSync(
    resource.id,
    hasPendingChanges,
    () => extractResourceData(resource),
    setLocalResourceDraft,
    setHasPendingChanges
  );

  useSaveCompletionDetector(isSaving, setHasPendingChanges);

  const { status, lastSavedAt, saveNow } = useAutoSave<Resource>({
    draft: localResourceDraft,
    hasPendingChanges,
    isValid: nameError === null,
    onSave,
    isSaving,
    elementId: localResourceDraft.id,
  });

  // Reset nameError when resource changes
  useEffect(() => {
    setNameError(null);
  }, [localResourceDraft.id]);

  // Fire saveNow when the financial-enabled checkbox toggles (no onBlur on checkboxes).
  useFlushOnChange(localResourceDraft.financialProperties?.enabled, saveNow);

  // Guard against invalid resource data
  if (!localResourceDraft?.id) {
    return (
      <div className="p-2 bg-red-50 border border-red-200 rounded text-sm">
        <div className="text-red-600 font-medium">Invalid resource data</div>
        <div className="text-xs text-red-500 mt-1">Resource data missing required properties</div>
      </div>
    );
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles changes to basic input fields (name, capacity).
   *
   * Updates are applied immediately to localResourceDraft for responsive UI,
   * validates the name, and marks the draft as pending (auto-save will fire
   * after debounce or on blur).
   *
   * Special handling:
   * - capacity: Parsed as integer with minimum value of 1
   *
   * @param e - Input change event
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'name') {
      setLocalResourceDraft(prev => updateResourceImmutably(prev, { name: value }));
      // Validate name uniqueness
      const error = validateName(value);
      setNameError(error);
    } else if (name === 'capacity') {
      setLocalResourceDraft(prev => updateResourceImmutably(prev, { capacity: parseInt(value) || 1 }));
    }

    setHasPendingChanges(true);
  };

  /**
   * Handles changes to financial property fields.
   *
   * Creates a new ResourceFinancialProperties instance with the updated field value,
   * preserving all other financial properties. Updates are applied immediately to
   * localResourceDraft for responsive UI, and marked as pending. Auto-save fires
   * after debounce or on blur (cost fields), or via the enabled-watching useEffect
   * (the enabled checkbox).
   *
   * Supports fields:
   * - enabled: Boolean to enable/disable financial tracking
   * - costPerSeize: Fixed cost applied each time resource is seized
   * - costPerHourUtilized: Hourly cost while resource is in use
   * - costPerHourIdle: Hourly cost while resource has available capacity
   *
   * @param field - The financial property field to update
   * @param value - The new value for the field (type-safe based on field)
   */
  const handleFinancialChange = <K extends keyof ResourceFinancialProperties>(
    field: K,
    value: ResourceFinancialProperties[K]
  ) => {
    setLocalResourceDraft(prev => {
      const currentFinancial = prev.financialProperties || new ResourceFinancialProperties();
      const updatedFinancial = new ResourceFinancialProperties({
        ...currentFinancial,
        [field]: value,
      });

      return updateResourceImmutably(prev, { financialProperties: updatedFinancial });
    });
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
                    Resource Name
                  </label>
                  <span title="A descriptive name for this resource. Resources are constraining factors that entities must acquire (seize) before performing activities (e.g., machines, workers, rooms, tools).">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>
                <input
                  type="text"
                  name="name"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  value={localResourceDraft.name}
                  onChange={handleInputChange}
                  placeholder="Enter resource name"
                  onBlur={saveNow}
                />
                {nameError && (
                  <p className="text-xs text-red-500 mt-1">{nameError}</p>
                )}
              </div>

              {/* Resource Capacity */}
              <div className="pt-3 border-t">
                <div className="flex items-center gap-1 mb-1">
                  <label className="text-xs font-medium text-gray-700">
                    Resource Capacity
                  </label>
                  <span title="Maximum number of entities that can use this resource simultaneously. For example, capacity of 3 means up to 3 entities can seize the resource at the same time.">
                    <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                  </span>
                </div>
                <input
                  type="number"
                  name="capacity"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  value={localResourceDraft.capacity}
                  onChange={handleInputChange}
                  min="1"
                  placeholder="1"
                  onBlur={saveNow}
                />
              </div>
          </div>
        )}

        {activeTab === "finance" && (
          <div className="space-y-1">
            {/* Enable Financial Tracking */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="financialEnabled"
                  checked={localResourceDraft.financialProperties?.enabled || false}
                  onChange={(e) => handleFinancialChange("enabled", e.target.checked)}
                  className="w-3 h-3"
                />
                <label htmlFor="financialEnabled" className="text-xs font-medium text-gray-700">
                  Enable Financial Tracking
                </label>
                <span title="When enabled, the simulation tracks costs for this resource including per-seize charges and hourly utilization/idle rates. Financial data appears in simulation results.">
                  <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                </span>
              </div>

              {/* Cost fields - Only shown when financial tracking is enabled */}
              {localResourceDraft.financialProperties?.enabled && (
                <div className="space-y-0.5 pt-1">
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs text-gray-600">Cost Per Seize</label>
                      <span title="Fixed cost applied each time an entity acquires (seizes) this resource. This is a one-time cost per usage, regardless of how long the resource is held.">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <input
                      type="number"
                      className="w-full px-2 py-1 text-xs border rounded"
                      value={localResourceDraft.financialProperties?.costPerSeize || 0}
                      onChange={(e) =>
                        handleFinancialChange("costPerSeize", parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      onBlur={saveNow}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs text-gray-600">Cost Per Hour Utilized</label>
                      <span title="Hourly cost incurred while the resource is actively being used by entities. This cost accumulates continuously based on how long the resource is seized.">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <input
                      type="number"
                      className="w-full px-2 py-1 text-xs border rounded"
                      value={localResourceDraft.financialProperties?.costPerHourUtilized || 0}
                      onChange={(e) =>
                        handleFinancialChange(
                          "costPerHourUtilized",
                          parseFloat(e.target.value) || 0
                        )
                      }
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      onBlur={saveNow}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-1 mb-1">
                      <label className="text-xs text-gray-600">Cost Per Hour Idle</label>
                      <span title="Hourly cost incurred while the resource has available capacity (not being used). This represents overhead costs like maintenance, rent, or salaries paid even when the resource sits idle.">
                        <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                      </span>
                    </div>
                    <input
                      type="number"
                      className="w-full px-2 py-1 text-xs border rounded"
                      value={localResourceDraft.financialProperties?.costPerHourIdle || 0}
                      onChange={(e) =>
                        handleFinancialChange("costPerHourIdle", parseFloat(e.target.value) || 0)
                      }
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      onBlur={saveNow}
                    />
                  </div>
                </div>
              )}
            </div>
        )}

        {/* Temporarily hidden - states managed at Model level
        {activeTab === "states" && (
          <StatesEditor
              states={states}
              onStatesChange={onStatesChange}
              defaultComponentType={ComponentType.RESOURCE}
            />
        )}
        */}
      </div>

      {/* Auto-save status */}
      <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
    </div>
  );
};

export default React.memo(ResourceEditor);
