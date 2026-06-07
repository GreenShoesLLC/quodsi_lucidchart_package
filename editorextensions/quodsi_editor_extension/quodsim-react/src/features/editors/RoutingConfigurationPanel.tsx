import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  ConnectType,
  ComponentType,
  StateListManager,
  Connector,
} from "@quodsi/lucid-shared";
import { AlertCircle, Info } from "lucide-react";
import { StateConditionEditor } from "./StateConditionEditor";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";

interface RoutingConfigurationPanelProps {
  activityId: string;
  connectType: ConnectType;
  outgoingConnectors: Connector[];
  entityStates: StateListManager;
  availableEntities: Array<{ id: string; name: string }>;
  onConnectorUpdate: (connectorId: string, updates: Partial<Connector>) => void;
  selectedConnectorId?: string; // Optional - highlights connector when set
}

/**
 * RoutingConfigurationPanel
 *
 * Displays and allows editing of routing configuration based on the selected ConnectType.
 * - Probability: Edit probability values for each connector
 * - StateCondition: Edit state-based routing conditions
 * - EntityTemplate: Select entity template for each connector
 */
export const RoutingConfigurationPanel: React.FC<
  RoutingConfigurationPanelProps
> = ({
  activityId,
  connectType,
  outgoingConnectors,
  entityStates,
  availableEntities,
  onConnectorUpdate,
  selectedConnectorId,
}) => {
  const { updateElementData } = useModelOpsSender();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Track local connector state for optimistic UI updates
  const [localConnectors, setLocalConnectors] =
    useState<Connector[]>(outgoingConnectors);

  // Track if there are unsaved changes (prevents prop overwrites during editing)
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Local string state for weight inputs (commit-on-blur pattern)
  const [weightInputValues, setWeightInputValues] = useState<Record<string, string>>({});
  const focusedWeightRef = useRef<string | null>(null);

  // Sync weight input values from localConnectors, preserving focused input
  useEffect(() => {
    setWeightInputValues(prev => {
      const next: Record<string, string> = {};
      for (const conn of localConnectors) {
        if (conn.id === focusedWeightRef.current && prev[conn.id] !== undefined) {
          next[conn.id] = prev[conn.id];
        } else {
          next[conn.id] = String(conn.weight ?? 1);
        }
      }
      return next;
    });
  }, [localConnectors]);

  // Ref for selected connector (for auto-scroll)
  const selectedConnectorRef = React.useRef<HTMLDivElement>(null);

  // Get element operations state from Redux
  const elementOpsState = useElementOpsState();

  /**
   * Check if ANY connector is currently saving.
   * We track all connectors because editing one might affect others.
   */
  const isSaving = localConnectors.some((conn) => elementOpsState.isSaving(conn.id));

  // Sync local state when activity changes, but ONLY if no pending changes
  // This prevents prop updates from overwriting user edits
  useFormSync(
    activityId,
    hasPendingChanges,
    () => outgoingConnectors,
    setLocalConnectors,
    setHasPendingChanges
  );

  // Detect when save completes and clear pending changes flag
  useSaveCompletionDetector(isSaving, setHasPendingChanges);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Creates a new Connector instance with updated values while preserving immutability.
   * This ensures React detects the change and triggers re-renders.
   */
  const updateConnectorImmutably = (
    base: Connector,
    updates: Partial<Connector>
  ): Connector => {
    const updated = new Connector(
      base.id,
      updates.name ?? base.name,
      updates.sourceId ?? base.sourceId,
      updates.targetId ?? base.targetId,
      updates.weight ?? base.weight,
      updates.sourceX ?? base.sourceX,
      updates.sourceY ?? base.sourceY,
      updates.targetX ?? base.targetX,
      updates.targetY ?? base.targetY,
      updates.x ?? base.x,
      updates.y ?? base.y
    );

    // Copy optional properties
    if (updates.entityTemplateUniqueId !== undefined) {
      updated.entityTemplateUniqueId = updates.entityTemplateUniqueId;
    } else {
      updated.entityTemplateUniqueId = base.entityTemplateUniqueId;
    }

    if (updates.stateCondition !== undefined) {
      updated.stateCondition = updates.stateCondition;
    } else {
      updated.stateCondition = base.stateCondition;
    }

    if (updates.stateModifications !== undefined) {
      updated.stateModifications = updates.stateModifications;
    } else {
      updated.stateModifications = base.stateModifications;
    }

    return updated;
  };

  // Auto-scroll to selected connector
  useEffect(() => {
    if (selectedConnectorId && selectedConnectorRef.current) {
      // Use timeout to ensure DOM has updated
      setTimeout(() => {
        selectedConnectorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }, 100);
    }
  }, [selectedConnectorId]);

  // Get entity states for StateCondition routing
  const entityStateOptions = useMemo(() => {
    return entityStates.getByComponentType(ComponentType.ENTITY);
  }, [entityStates]);

  // Calculate total weight (for display purposes, not validation)
  const totalWeight = useMemo(() => {
    return localConnectors.reduce((sum, conn) => sum + (conn.weight || 0), 0);
  }, [localConnectors]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle connector update with immutable state management.
   *
   * Creates a new connector instance with updates and replaces it in the array.
   * Sets hasPendingChanges to prevent prop sync from overwriting user edits.
   */
  const handleConnectorChange = (
    connectorId: string,
    updates: Partial<Connector>
  ) => {
    const connectorIndex = localConnectors.findIndex((c) => c.id === connectorId);
    if (connectorIndex === -1) return;

    const connector = localConnectors[connectorIndex];

    // Create immutable update
    const updatedConnector = updateConnectorImmutably(connector, updates);

    // Update local state immediately for optimistic UI
    // Create new array with updated connector
    const newConnectors = [...localConnectors];
    newConnectors[connectorIndex] = updatedConnector;
    setLocalConnectors(newConnectors);

    // Mark as having pending changes to prevent prop sync from overwriting
    setHasPendingChanges(true);

    // Send update to backend
    updateElementData(connectorId, "Connector", updatedConnector);

    // Notify parent
    onConnectorUpdate(connectorId, updates);
  };

  // Weight input handlers (commit-on-blur pattern to allow typing decimals like "0.75")
  const handleWeightInputChange = (connectorId: string, value: string) => {
    setWeightInputValues(prev => ({ ...prev, [connectorId]: value }));
  };

  const handleWeightFocus = (connectorId: string) => {
    focusedWeightRef.current = connectorId;
  };

  const handleWeightBlur = (connectorId: string) => {
    focusedWeightRef.current = null;
    const raw = weightInputValues[connectorId] ?? "";
    const weight = parseFloat(raw);
    if (isNaN(weight) || weight <= 0) {
      // Revert to current valid value
      const conn = localConnectors.find(c => c.id === connectorId);
      setWeightInputValues(prev => ({ ...prev, [connectorId]: String(conn?.weight ?? 1) }));
      return;
    }
    // Normalize display (remove trailing dots, leading zeros, etc.)
    setWeightInputValues(prev => ({ ...prev, [connectorId]: String(weight) }));
    handleConnectorChange(connectorId, { weight });
  };

  // Handle entity template change
  const handleEntityTemplateChange = (
    connectorId: string,
    entityTemplateId: string
  ) => {
    handleConnectorChange(connectorId, {
      entityTemplateUniqueId: entityTemplateId,
    });
  };

  // Render no connectors message
  if (localConnectors.length === 0) {
    return (
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-blue-900 font-medium">
            No Outgoing Connectors
          </div>
          <div className="text-blue-700 text-xs mt-1">
            This activity has no outgoing connectors. Connect this activity to
            other activities to configure routing.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Probability Routing */}
      {connectType === ConnectType.Probability && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs font-medium text-gray-700">Probability Weights</span>
            <span title="For multiple connectors: Set weight for each connector. Entities are routed probabilistically based on relative weights (probability = weight / sum of all weights). For single connector: Automatically routes 100% of entities to the only available path.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </div>

          {/* Connector list */}
          <div className="space-y-2">
            {localConnectors.map((connector) => (
              <div
                key={connector.id}
                ref={
                  connector.id === selectedConnectorId
                    ? selectedConnectorRef
                    : null
                }
                className={`bg-white rounded border shadow-sm overflow-hidden ${
                  connector.id === selectedConnectorId
                    ? "ring-2 ring-blue-500 shadow-lg"
                    : ""
                }`}
              >
                {/* Prominent connector name header */}
                <div className="font-semibold text-sm text-gray-900 bg-blue-50 p-2 border-b border-blue-100">
                  {connector.name || "Unnamed Connector"}
                </div>

                {/* Weight input - only show for multiple connectors */}
                {localConnectors.length > 1 && (
                  <div className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-600">Weight</label>
                        <span title="Enter a positive weight. Higher weight increases the routing chance for this connector. For example, if two connectors have weights of 3 and 1, the first gets 75% (3/4) of entities and the second gets 25% (1/4).">
                          <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
                        </span>
                      </div>
                      <input
                        type="number"
                        className="w-24 px-2 py-1 text-xs border rounded"
                        value={weightInputValues[connector.id] ?? String(connector.weight ?? 1)}
                        onChange={(e) => handleWeightInputChange(connector.id, e.target.value)}
                        onFocus={() => handleWeightFocus(connector.id)}
                        onBlur={() => handleWeightBlur(connector.id)}
                        min="0.1"
                        step="0.1"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State Condition Routing */}
      {connectType === ConnectType.StateCondition && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs font-medium text-gray-700">State-Based Routing Conditions</span>
            <span title="Configure conditions for each connector based on entity state values. When an entity exits this activity, it will be routed to the first connector whose condition evaluates to true. Conditions are evaluated in the order shown.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </div>

          {entityStateOptions.length === 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-amber-900 font-medium">
                  No Entity States Defined
                </div>
                <div className="text-amber-700">
                  Define entity states in the States tab to use state-based
                  routing.
                </div>
              </div>
            </div>
          )}

          {/* Connector list */}
          <div className="space-y-3">
            {localConnectors.map((connector) => {
              const condition = connector.stateCondition || null;

              return (
                <div
                  key={connector.id}
                  ref={
                    connector.id === selectedConnectorId
                      ? selectedConnectorRef
                      : null
                  }
                  className={`bg-white rounded border shadow-sm overflow-hidden ${
                    connector.id === selectedConnectorId
                      ? "ring-2 ring-blue-500 shadow-lg"
                      : ""
                  }`}
                >
                  {/* Enhanced connector name header */}
                  <div className="font-semibold text-sm text-gray-900 bg-green-50 p-2 border-b border-green-100">
                    {connector.name || "Unnamed Connector"}
                  </div>

                  <div className="p-3 space-y-2">
                    <StateConditionEditor
                      condition={condition}
                      states={entityStateOptions}
                      onChange={(updatedCondition) => {
                        handleConnectorChange(connector.id, {
                          stateCondition: updatedCondition,
                        });
                      }}
                    />

                    {/* Display condition summary */}
                    {condition?.stateName && condition.value !== "" && (
                      <div className="text-xs text-gray-600 bg-white p-2 rounded border mt-2">
                        <span className="font-medium">Condition:</span>{" "}
                        {condition.stateName} {condition.comparison}{" "}
                        {String(condition.value)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Entity Template Routing */}
      {connectType === ConnectType.EntityTemplate && (
        <div className="space-y-2">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs font-medium text-gray-700">Entity Template Routing</span>
            <span title="Assign an entity template to each connector. Entities will automatically be routed to the connector that matches their template type. Each connector should be assigned a different entity template.">
              <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
            </span>
          </div>

          {availableEntities.length === 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-amber-900 font-medium">
                  No Entity Templates Available
                </div>
                <div className="text-amber-700">
                  Create entity templates to use entity-based routing.
                </div>
              </div>
            </div>
          )}

          {/* Connector list */}
          <div className="space-y-2">
            {localConnectors.map((connector) => (
              <div
                key={connector.id}
                ref={
                  connector.id === selectedConnectorId
                    ? selectedConnectorRef
                    : null
                }
                className={`bg-white rounded border shadow-sm overflow-hidden ${
                  connector.id === selectedConnectorId
                    ? "ring-2 ring-blue-500 shadow-lg"
                    : ""
                }`}
              >
                {/* Prominent connector name header */}
                <div className="font-semibold text-sm text-gray-900 bg-purple-50 p-2 border-b border-purple-100">
                  {connector.name || "Unnamed Connector"}
                </div>

                {/* Entity template selection */}
                <div className="p-3">
                  <label className="block text-xs text-gray-600 mb-1">
                    Entity Template
                  </label>
                  <select
                    className="w-full px-2 py-1 text-xs border rounded bg-white"
                    value={connector.entityTemplateUniqueId || ""}
                    onChange={(e) =>
                      handleEntityTemplateChange(connector.id, e.target.value)
                    }
                  >
                    <option value="">Select an entity template...</option>
                    {availableEntities.map((entity) => (
                      <option key={entity.id} value={entity.id}>
                        {entity.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutingConfigurationPanel;
