import React, { useRef, useEffect } from "react";
import {
  Activity,
  ConnectType,
  SimulationObjectType,
  EditorReferenceData,
  StateListManager,
  Connector,
} from "@quodsi/shared";
import { ArrowRightLeft, Info } from "lucide-react";
import BaseEditor from "./BaseEditor";
import { RoutingConfigurationPanel } from "./RoutingConfigurationPanel";

interface ConnectorsEditorProps {
  activity: Activity;
  outgoingConnectors: Connector[];
  selectedConnectorId?: string;
  onSave: (activity: Activity) => void;
  onCancel: () => void;
  referenceData: EditorReferenceData;
  states: StateListManager;
}

/**
 * ConnectorsEditor - Dedicated editor for Activity routing configuration
 *
 * Can be used:
 * 1. Standalone when a Connector/Line is selected (shows source Activity's routing)
 * 2. Embedded in ActivityEditor's "connectors" tab
 *
 * When selectedConnectorId is provided, highlights that connector in the list
 */
const ConnectorsEditor: React.FC<ConnectorsEditorProps> = ({
  activity,
  outgoingConnectors,
  selectedConnectorId,
  onSave,
  onCancel,
  referenceData,
  states,
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development';

  if (isDevelopment) {
    console.log('[ConnectorsEditor] Rendered with:', {
      activityId: activity?.id,
      activityName: activity?.name,
      connectorsCount: outgoingConnectors?.length,
      selectedConnectorId,
      hasReferenceData: !!referenceData
    });
  }

  // Validate activity data
  if (!activity || !activity.id) {
    return (
      <div className="p-3 text-red-600 bg-red-50 border border-red-200 rounded text-sm">
        <div className="font-medium">Invalid routing configuration</div>
        <div className="text-xs mt-1">Activity data missing</div>
      </div>
    );
  }

  // Create safe activity data with defaults for missing properties
  const safeActivityData = {
    ...activity,
    type: SimulationObjectType.Activity,
    connectType: activity.connectType || ConnectType.Probability,
    capacity: activity.capacity || 1,
    inputBufferCapacity: activity.inputBufferCapacity || Infinity,
    outputBufferCapacity: activity.outputBufferCapacity || Infinity,
    operationSteps: activity.operationSteps || [],
    financialProperties: activity.financialProperties,
    preProcessingStateModifications: activity.preProcessingStateModifications || [],
    postProcessingStateModifications: activity.postProcessingStateModifications || [],
    x: activity.x || 0,
    y: activity.y || 0,
    // Provide stub methods if they don't exist (for minimal activity objects from referenceData)
    setLocation: activity.setLocation || ((x: number, y: number) => {}),
    getLocation: activity.getLocation || (() => ({ x: 0, y: 0 })),
    hasLocation: activity.hasLocation || (() => false),
    clone: activity.clone || (() => activity),
    resetLocation: activity.resetLocation || (() => {}),
    toJSON: activity.toJSON || (() => ({})),
  };

  return (
    <BaseEditor
      data={safeActivityData}
      onSave={(updatedData) => {
        // Create a new Activity instance to preserve class methods
        const updatedActivity = new Activity(
          updatedData.id,
          updatedData.name,
          updatedData.capacity,
          updatedData.inputBufferCapacity,
          updatedData.outputBufferCapacity,
          updatedData.operationSteps,
          updatedData.x,
          updatedData.y
        );

        // Preserve connectType (the main thing we're editing here)
        updatedActivity.connectType = updatedData.connectType || ConnectType.Probability;

        // Preserve other properties
        updatedActivity.financialProperties = updatedData.financialProperties;
        updatedActivity.preProcessingStateModifications = updatedData.preProcessingStateModifications || [];
        updatedActivity.postProcessingStateModifications = updatedData.postProcessingStateModifications || [];

        onSave(updatedActivity);
      }}
      onCancel={onCancel}
      messageType="activitySaved"
    >
      {(localData, handleChange) => (
        <div className="space-y-2">
          {/* Context Header - Show when accessed via Connector selection */}
          {selectedConnectorId && (
            <div className="bg-blue-50 px-3 py-2 text-xs border-b border-blue-100 rounded-t">
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
            <div className="flex items-center gap-1 mb-2">
              <ArrowRightLeft className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium text-gray-700">Routing Configuration</span>
            </div>

            <div className="space-y-3">
              {/* Routing Type Selection */}
              <div>
                <label className="block text-xs text-gray-600 mb-1">Routing Type</label>
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
                <p className="text-xs text-gray-500 mt-1">
                  {outgoingConnectors.length === 1
                    ? "Only one connector - routing type locked to Probability"
                    : "Controls how entities are routed through outgoing connectors"}
                </p>
              </div>

              {/* Routing Configuration Panel */}
              <div className="border-t pt-3">
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
                      console.log('[ConnectorsEditor] Connector updated:', connectorId, updates);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </BaseEditor>
  );
};

export default ConnectorsEditor;
