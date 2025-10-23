import React, { useRef, useEffect } from "react";
import {
  Activity,
  ConnectType,
  SimulationObjectType,
  EditorReferenceData,
  StateListManager,
  Connector,
} from "@quodsi/shared";
import BaseEditor from "./BaseEditor";
import { RoutingConfigurationContent } from "./RoutingConfigurationContent";

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
        <RoutingConfigurationContent
          localData={localData}
          handleChange={handleChange}
          outgoingConnectors={outgoingConnectors}
          selectedConnectorId={selectedConnectorId}
          referenceData={referenceData}
          states={states}
        />
      )}
    </BaseEditor>
  );
};

export default ConnectorsEditor;
