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
            <div className="flex items-center gap-1 mb-0.5">
              <label className="text-xs text-gray-600">Routing Type</label>
              <span title="Determines how entities are distributed across outgoing connectors: Probability (weighted random), State Condition (based on state values), or Entity (based on template type). With only one connector, routing type is automatically set to Probability.">
                <Info className="w-3 h-3 text-gray-400 hover:text-gray-600 cursor-help" />
              </span>
            </div>
            <select
              name="connectType"
              className="w-full px-2 py-1 text-xs border rounded bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
              value={localData.connectType}
              onChange={handleChange}
              disabled={outgoingConnectors.length === 1}
            >
              <option value={ConnectType.Probability}>
                Probability
              </option>
              <option value={ConnectType.StateCondition}>
                State Condition
              </option>
              <option value={ConnectType.EntityTemplate}>
                Entity
              </option>
            </select>
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
