import React from "react";
import {
  Activity,
  ConnectType,
  EditorReferenceData,
  StateListManager,
  Connector,
} from "@quodsi/shared";
import { ArrowRightLeft, Info } from "lucide-react";
import { RoutingConfigurationPanel } from "./RoutingConfigurationPanel";

interface RoutingConfigurationContentProps {
  localData: Activity;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
  outgoingConnectors: Connector[];
  selectedConnectorId?: string;
  referenceData: EditorReferenceData;
  states: StateListManager;
  showHeader?: boolean; // Default true - shows "Routing Configuration" header
}

/**
 * RoutingConfigurationContent - Pure content component for routing configuration
 *
 * Used within BaseEditor contexts (embedded in ActivityEditor or standalone ConnectorsEditor)
 * Does not include its own Save/Cancel buttons
 */
export const RoutingConfigurationContent: React.FC<RoutingConfigurationContentProps> = ({
  localData,
  handleChange,
  outgoingConnectors,
  selectedConnectorId,
  referenceData,
  states,
  showHeader = true, // Default to true for backward compatibility
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="space-y-1">
      {/* Context Header - Show when accessed via Connector selection */}
      {selectedConnectorId && (
        <div className="bg-blue-50 px-2 py-1.5 text-xs border-b border-blue-100 rounded-t">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-blue-900">
                Routing Configuration for: {localData.name}
              </div>
              <div className="text-blue-700 mt-0.5">
                Selected connector is highlighted below
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Routing Configuration Content */}
      <div>
        {showHeader && (
          <div className="flex items-center gap-1 mb-1">
            <ArrowRightLeft className="w-3 h-3 text-blue-500" />
            <span className="text-xs font-medium text-gray-700">Routing Configuration</span>
          </div>
        )}

        <div className="space-y-1">
          {/* Routing Type Selection */}
          <div>
            <label className="block text-xs text-gray-600 mb-0.5">Routing Type</label>
            <select
              name="connectType"
              className="w-full px-2 py-1 text-xs border rounded bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              value={localData.connectType}
              onChange={handleChange}
              disabled={outgoingConnectors.length === 1}
            >
              <option value={ConnectType.Probability}>
                Probability - Route based on connector probabilities
              </option>
              <option value={ConnectType.StateCondition}>
                State Condition - Route based on state values
              </option>
              <option value={ConnectType.EntityTemplate}>
                Entity Template - Route based on entity type
              </option>
            </select>
            {outgoingConnectors.length === 1 && (
              <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">
                Only one connector - routing type locked to Probability
              </p>
            )}
          </div>

          {/* Routing Configuration Panel */}
          <div className="border-t pt-1">
            <RoutingConfigurationPanel
              activityId={localData.id}
              connectType={localData.connectType}
              outgoingConnectors={outgoingConnectors}
              entityStates={states}
              availableEntities={referenceData?.entities || []}
              selectedConnectorId={selectedConnectorId}
              onConnectorUpdate={(connectorId, updates) => {
                // Connector updates are handled via messaging in the panel
                if (isDevelopment) {
                  console.log('[RoutingConfigurationContent] Connector updated:', connectorId, updates);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
