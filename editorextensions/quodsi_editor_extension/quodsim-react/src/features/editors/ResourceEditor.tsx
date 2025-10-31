import React, { useState } from "react";
import { Settings, DollarSign, Hash, Info } from "lucide-react";
import {
  Resource,
  ResourceFinancialProperties,
  StateListManager,
  ComponentType,
} from "@quodsi/shared";
import StatesEditor from "./StatesEditor";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";

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
  /** Callback invoked when user cancels editing (closes the editor) */
  onCancel: () => void;
  /** State variables associated with this resource */
  states: StateListManager;
  /** Callback invoked when state definitions change */
  onStatesChange: (states: StateListManager) => void;
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
  {
    id: "states" as const,
    title: "State Definitions",
    icon: Hash,
    tooltip: "Define custom state variables that this resource can track and modify"
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
 * ResourceEditor - Component for editing resource properties
 *
 * Resources are constraining factors in a simulation that entities must seize
 * (acquire) before performing certain activities and release after completion.
 * Examples include: machines, workers, rooms, tools, or any limited capacity asset.
 *
 * Features:
 * - Three-tab interface: Basic properties, Financial tracking, and State definitions
 * - Controlled component with immediate UI updates
 * - Manual save for basic and finance tabs
 * - Auto-save for state definitions (handled by StatesEditor)
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
 * - Basic tab: Requires Save button click to persist changes
 * - Finance tab: Requires Save button click to persist changes
 * - States tab: Auto-saves immediately (Save/Cancel buttons hidden)
 *
 * @param props - Component props
 * @returns Rendered resource editor component
 */
const ResourceEditor: React.FC<Props> = ({ resource, onSave, onCancel, states, onStatesChange }) => {
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
   * and marked as pending (requiring Save button click to persist).
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
   * localResourceDraft for responsive UI, and marked as pending.
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

  /**
   * Saves the current resource draft state.
   *
   * Invokes the parent onSave callback with the current localResourceDraft.
   * Redux manages the isSaving state automatically.
   *
   * Note: Does NOT directly modify hasPendingChanges - that's handled by the
   * save completion detector to avoid race conditions.
   */
  const handleSave = () => {
    // Save the current draft state directly
    onSave(localResourceDraft);
    // Note: isSaving state is now managed by Redux through elementOpsState
  };

  /**
   * Cancels editing and closes the editor.
   *
   * Discards all pending changes by:
   * - Re-extracting fresh data from resource prop
   * - Clearing hasPendingChanges flag (disables Save button)
   * - Calling onCancel prop to close the editor panel
   *
   * Note: State definition changes were already auto-saved, so they can't be canceled.
   */
  const handleCancel = () => {
    setLocalResourceDraft(extractResourceData(resource));
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
              tooltip="Configure resource name and capacity (maximum number of concurrent uses)"
            />
            <div className="space-y-4">
              {/* Name Section */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Resource Name
                </label>
                <input
                  type="text"
                  name="name"
                  className="w-full px-2 py-1.5 text-xs border rounded"
                  value={localResourceDraft.name}
                  onChange={handleInputChange}
                  placeholder="Enter resource name"
                />
              </div>

              {/* Capacity Section */}
              <div className="pt-3 border-t">
                <div className="mb-2">
                  <div className="text-xs font-medium text-gray-700 mb-0.5">
                    Capacity Configuration
                  </div>
                  <div className="text-xs text-gray-500">
                    Maximum number of concurrent uses for this resource
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    className="w-full px-2 py-1.5 text-xs border rounded"
                    value={localResourceDraft.capacity}
                    onChange={handleInputChange}
                    min="1"
                    placeholder="1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "finance" && (
          <div>
            <TabHeader
              icon={DollarSign}
              title="Financial Settings"
              tooltip="Track resource costs including per-seize costs and time-based utilization costs"
            />
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
              </div>

              {/* Cost Components */}
              <div className="space-y-0.5 pt-1">
                <div className="text-xs font-medium text-gray-600 mb-1">Cost Components</div>
                <div>
                  <label className="block text-xs text-gray-600">Cost Per Seize</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs border rounded"
                    value={localResourceDraft.financialProperties?.costPerSeize || 0}
                    onChange={(e) =>
                      handleFinancialChange("costPerSeize", parseFloat(e.target.value) || 0)
                    }
                    disabled={!localResourceDraft.financialProperties?.enabled}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    Fixed cost applied each time the resource is seized
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Cost Per Hour Utilized</label>
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
                    disabled={!localResourceDraft.financialProperties?.enabled}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    Hourly cost while resource is being used
                  </p>
                </div>
                <div>
                  <label className="block text-xs text-gray-600">Cost Per Hour Idle</label>
                  <input
                    type="number"
                    className="w-full px-2 py-1 text-xs border rounded"
                    value={localResourceDraft.financialProperties?.costPerHourIdle || 0}
                    onChange={(e) =>
                      handleFinancialChange("costPerHourIdle", parseFloat(e.target.value) || 0)
                    }
                    disabled={!localResourceDraft.financialProperties?.enabled}
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500">
                    Hourly cost while resource has available capacity
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "states" && (
          <div>
            <TabHeader
              icon={Hash}
              title="State Definitions"
              tooltip="Define custom state variables that this resource can track and modify"
            />
            <StatesEditor
              states={states}
              onStatesChange={onStatesChange}
              defaultComponentType={ComponentType.RESOURCE}
            />
          </div>
        )}
      </div>

      {/* Save/Cancel Buttons - Only show for Basic and Finance tabs (States auto-save) */}
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

export default React.memo(ResourceEditor);
