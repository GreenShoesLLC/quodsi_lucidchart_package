import React, { useMemo, useState, useEffect } from "react";
import {
  ConnectType,
  StateComparison,
  StateCondition,
  StateType,
  ComponentType,
  StateListManager,
  Connector,
  getSupportedComparisonsForType
} from "@quodsi/shared";
import { AlertCircle, Info } from "lucide-react";
import { useModelOpsSender } from "../../messaging/senders/modelOpsSender";

interface RoutingConfigurationPanelProps {
  activityId: string;
  connectType: ConnectType;
  outgoingConnectors: Connector[];
  entityStates: StateListManager;
  availableEntities: Array<{ id: string; name: string }>;
  onConnectorUpdate: (connectorId: string, updates: Partial<Connector>) => void;
  selectedConnectorId?: string;  // Optional - highlights connector when set
}

/**
 * RoutingConfigurationPanel
 *
 * Displays and allows editing of routing configuration based on the selected ConnectType.
 * - Probability: Edit probability values for each connector
 * - StateCondition: Edit state-based routing conditions
 * - EntityTemplate: Select entity template for each connector
 */
export const RoutingConfigurationPanel: React.FC<RoutingConfigurationPanelProps> = ({
  activityId,
  connectType,
  outgoingConnectors,
  entityStates,
  availableEntities,
  onConnectorUpdate,
  selectedConnectorId
}) => {
  const { updateElementData } = useModelOpsSender();

  // Track local connector state for optimistic UI updates
  const [localConnectors, setLocalConnectors] = useState<Connector[]>(outgoingConnectors);

  // Ref for selected connector (for auto-scroll)
  const selectedConnectorRef = React.useRef<HTMLDivElement>(null);

  // Update local state when props change (e.g., selection change)
  useEffect(() => {
    setLocalConnectors(outgoingConnectors);
  }, [outgoingConnectors]);

  // Auto-scroll to selected connector
  useEffect(() => {
    if (selectedConnectorId && selectedConnectorRef.current) {
      // Use timeout to ensure DOM has updated
      setTimeout(() => {
        selectedConnectorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest'
        });
      }, 100);
    }
  }, [selectedConnectorId]);

  // Get entity states for StateCondition routing
  const entityStateOptions = useMemo(() => {
    return entityStates.getByComponentType(ComponentType.ENTITY);
  }, [entityStates]);

  // Calculate total probability for validation
  const totalProbability = useMemo(() => {
    return localConnectors.reduce((sum, conn) => sum + (conn.probability || 0), 0);
  }, [localConnectors]);

  // Handle connector update
  const handleConnectorChange = (connectorId: string, updates: Partial<Connector>) => {
    const connector = localConnectors.find(c => c.id === connectorId);
    if (!connector) return;

    // Apply updates to the connector instance
    Object.assign(connector, updates);

    // Update local state immediately for optimistic UI
    // Create new array to trigger re-render
    setLocalConnectors(prev => [...prev]);

    // Send update to backend
    updateElementData(connectorId, 'Connector', connector);

    // Notify parent
    onConnectorUpdate(connectorId, updates);
  };

  // Handle probability change
  const handleProbabilityChange = (connectorId: string, value: string) => {
    const probability = parseFloat(value);
    if (isNaN(probability)) return;
    
    handleConnectorChange(connectorId, { probability });
  };

  // Handle state condition change
  const handleStateConditionChange = (
    connectorId: string,
    field: 'stateName' | 'comparison' | 'value',
    value: any
  ) => {
    const connector = localConnectors.find(c => c.id === connectorId);
    if (!connector) return;

    const currentCondition = connector.stateCondition || {
      stateName: '',
      comparison: StateComparison.EQUAL,
      value: ''
    };

    const updatedCondition = {
      ...currentCondition,
      [field]: value
    };

    handleConnectorChange(connectorId, { 
      stateCondition: new StateCondition(
        updatedCondition.stateName,
        updatedCondition.comparison,
        updatedCondition.value
      )
    });
  };

  // Handle entity template change
  const handleEntityTemplateChange = (connectorId: string, entityTemplateId: string) => {
    handleConnectorChange(connectorId, { entityTemplateUniqueId: entityTemplateId });
  };

  // Get supported comparisons for a state
  const getSupportedComparisons = (stateName: string): StateComparison[] => {
    const state = entityStateOptions.find(s => s.name === stateName);
    if (!state) return Object.values(StateComparison);
    
    return getSupportedComparisonsForType(state.dataType);
  };

  // Get input type for state value based on state type
  const getValueInputType = (stateName: string): { type: string; options?: string[] } => {
    const state = entityStateOptions.find(s => s.name === stateName);
    if (!state) return { type: 'text' };

    switch (state.dataType) {
      case StateType.NUMBER:
        return { type: 'number' };
      case StateType.BOOLEAN:
        return { type: 'select', options: ['true', 'false'] };
      case StateType.CATEGORY:
        return { type: 'select', options: state.categoryValues || [] };
      case StateType.STRING:
      default:
        return { type: 'text' };
    }
  };

  // Render no connectors message
  if (localConnectors.length === 0) {
    return (
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded text-sm">
        <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <div>
          <div className="text-blue-900 font-medium">No Outgoing Connectors</div>
          <div className="text-blue-700 text-xs mt-1">
            This activity has no outgoing connectors. Connect this activity to other activities to configure routing.
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
          <div className="text-xs text-gray-600 mb-2">
            {localConnectors.length === 1
              ? "Single connector - probability locked to 1.0 (100%)"
              : "Set the probability for each outgoing connector. Probabilities should sum to 1.0."}
          </div>

          {/* Probability validation warning */}
          {localConnectors.length > 1 && Math.abs(totalProbability - 1.0) > 0.001 && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-amber-900 font-medium">
                  Probabilities sum to {totalProbability.toFixed(3)}
                </div>
                <div className="text-amber-700">
                  Probabilities should sum to 1.0 for proper routing behavior.
                </div>
              </div>
            </div>
          )}

          {/* Connector list */}
          <div className="space-y-2">
            {localConnectors.map((connector) => (
              <div
                key={connector.id}
                ref={connector.id === selectedConnectorId ? selectedConnectorRef : null}
                className={`bg-white rounded border shadow-sm overflow-hidden ${
                  connector.id === selectedConnectorId
                    ? 'ring-2 ring-blue-500 shadow-lg'
                    : ''
                }`}
              >
                {/* Prominent connector name header */}
                <div className="font-semibold text-sm text-gray-900 bg-blue-50 p-2 border-b border-blue-100">
                  {connector.name || 'Unnamed Connector'}
                </div>

                {/* Probability input */}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-600">Probability:</label>
                    <input
                      type="number"
                      className="w-24 px-2 py-1 text-xs border rounded disabled:bg-gray-100 disabled:cursor-not-allowed"
                      value={localConnectors.length === 1 ? 1 : connector.probability}
                      onChange={(e) => handleProbabilityChange(connector.id, e.target.value)}
                      disabled={localConnectors.length === 1}
                      min="0"
                      max="1"
                      step="0.01"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State Condition Routing */}
      {connectType === ConnectType.StateCondition && (
        <div className="space-y-2">
          <div className="text-xs text-gray-600 mb-2">
            Set state-based conditions for each outgoing connector. Entities will be routed based on their state values.
          </div>

          {entityStateOptions.length === 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-amber-900 font-medium">No Entity States Defined</div>
                <div className="text-amber-700">
                  Define entity states in the States tab to use state-based routing.
                </div>
              </div>
            </div>
          )}

          {/* Connector list */}
          <div className="space-y-3">
            {localConnectors.map((connector) => {
              const condition = connector.stateCondition || {
                stateName: '',
                comparison: StateComparison.EQUAL,
                value: ''
              };

              const valueInput = getValueInputType(condition.stateName);
              const supportedComparisons = getSupportedComparisons(condition.stateName);

              return (
                <div
                  key={connector.id}
                  ref={connector.id === selectedConnectorId ? selectedConnectorRef : null}
                  className={`bg-white rounded border shadow-sm overflow-hidden ${
                    connector.id === selectedConnectorId
                      ? 'ring-2 ring-blue-500 shadow-lg'
                      : ''
                  }`}
                >
                  {/* Enhanced connector name header */}
                  <div className="font-semibold text-sm text-gray-900 bg-green-50 p-2 border-b border-green-100">
                    {connector.name || 'Unnamed Connector'}
                  </div>

                  <div className="p-3 space-y-2">
                    {/* State name selection */}
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">State</label>
                    <select
                      className="w-full px-2 py-1 text-xs border rounded bg-white"
                      value={condition.stateName}
                      onChange={(e) => handleStateConditionChange(connector.id, 'stateName', e.target.value)}
                    >
                      <option value="">Select a state...</option>
                      {entityStateOptions.map(state => (
                        <option key={state.id} value={state.name}>
                          {state.name} ({state.dataType})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Comparison operator */}
                  {condition.stateName && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Comparison</label>
                      <select
                        className="w-full px-2 py-1 text-xs border rounded bg-white"
                        value={condition.comparison}
                        onChange={(e) => handleStateConditionChange(connector.id, 'comparison', e.target.value as StateComparison)}
                      >
                        {supportedComparisons.map(comp => (
                          <option key={comp} value={comp}>{comp}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Value input */}
                  {condition.stateName && (
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Value</label>
                      {valueInput.type === 'select' ? (
                        <select
                          className="w-full px-2 py-1 text-xs border rounded bg-white"
                          value={String(condition.value)}
                          onChange={(e) => {
                            const value = valueInput.options?.includes('true') && valueInput.options?.includes('false')
                              ? e.target.value === 'true'
                              : e.target.value;
                            handleStateConditionChange(connector.id, 'value', value);
                          }}
                        >
                          <option value="">Select a value...</option>
                          {valueInput.options?.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type={valueInput.type}
                          className="w-full px-2 py-1 text-xs border rounded"
                          value={String(condition.value)}
                          onChange={(e) => {
                            const value = valueInput.type === 'number' 
                              ? parseFloat(e.target.value) 
                              : e.target.value;
                            handleStateConditionChange(connector.id, 'value', value);
                          }}
                          placeholder={`Enter ${valueInput.type} value...`}
                        />
                      )}
                    </div>
                  )}

                  {/* Display condition summary */}
                  {condition.stateName && condition.value !== '' && (
                    <div className="text-xs text-gray-600 bg-white p-2 rounded border mt-2">
                      <span className="font-medium">Condition:</span> {condition.stateName} {condition.comparison} {String(condition.value)}
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
          <div className="text-xs text-gray-600 mb-2">
            Select the entity template for each outgoing connector. Entities will be routed based on their template type.
          </div>

          {availableEntities.length === 0 && (
            <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
              <AlertCircle className="w-3 h-3 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="text-amber-900 font-medium">No Entity Templates Available</div>
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
                ref={connector.id === selectedConnectorId ? selectedConnectorRef : null}
                className={`bg-white rounded border shadow-sm overflow-hidden ${
                  connector.id === selectedConnectorId
                    ? 'ring-2 ring-blue-500 shadow-lg'
                    : ''
                }`}
              >
                {/* Prominent connector name header */}
                <div className="font-semibold text-sm text-gray-900 bg-purple-50 p-2 border-b border-purple-100">
                  {connector.name || 'Unnamed Connector'}
                </div>

                {/* Entity template selection */}
                <div className="p-3">
                  <label className="block text-xs text-gray-600 mb-1">Entity Template</label>
                  <select
                    className="w-full px-2 py-1 text-xs border rounded bg-white"
                    value={connector.entityTemplateUniqueId || ''}
                    onChange={(e) => handleEntityTemplateChange(connector.id, e.target.value)}
                  >
                    <option value="">Select an entity template...</option>
                    {availableEntities.map(entity => (
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
