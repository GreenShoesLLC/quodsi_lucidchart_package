import React, { useState, useEffect } from "react";
import {
  Activity,
  ConnectType,
  SimulationObjectType,
  EditorReferenceData,
  StateListManager,
  Connector,
} from "@quodsi/shared";
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

  // Helper function to extract activity data with safe defaults
  const extractActivityData = (act: Activity): Activity => {
    const safeActivity = new Activity(
      act.id,
      act.name,
      act.capacity || 1,
      act.inputBufferCapacity || Infinity,
      act.outputBufferCapacity || Infinity,
      act.operationSteps || [],
      act.x || 0,
      act.y || 0
    );

    // Preserve connectType (the main property we're editing)
    safeActivity.connectType = act.connectType || ConnectType.Probability;

    // Preserve other properties
    safeActivity.financialProperties = act.financialProperties;
    safeActivity.preProcessingStateModifications = act.preProcessingStateModifications || [];
    safeActivity.postProcessingStateModifications = act.postProcessingStateModifications || [];

    return safeActivity;
  };

  // State management for BaseEditor replacement
  const [formData, setFormData] = useState<Activity>(() => extractActivityData(activity));
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Sync with activity prop changes (only when no unsaved changes and not saving)
  useEffect(() => {
    if (!hasChanges && !isSaving) {
      setFormData(extractActivityData(activity));
    }
  }, [activity, hasChanges, isSaving]);

  // Clear the saving flag after a short delay to allow for the new data to arrive
  useEffect(() => {
    if (isSaving) {
      const timer = setTimeout(() => {
        setIsSaving(false);
        setHasChanges(false);
      }, 500); // Give the parent component time to update

      return () => clearTimeout(timer);
    }
  }, [isSaving]);

  // ConnectType change handler
  const handleConnectTypeChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const newConnectType = e.target.value as ConnectType;
    setFormData(prev => {
      const updatedActivity = new Activity(
        prev.id,
        prev.name,
        prev.capacity,
        prev.inputBufferCapacity,
        prev.outputBufferCapacity,
        prev.operationSteps,
        prev.x,
        prev.y
      );

      // Update connectType
      updatedActivity.connectType = newConnectType;

      // Preserve other properties
      updatedActivity.financialProperties = prev.financialProperties;
      updatedActivity.preProcessingStateModifications = prev.preProcessingStateModifications;
      updatedActivity.postProcessingStateModifications = prev.postProcessingStateModifications;

      return updatedActivity;
    });
    setHasChanges(true);
  };

  // Save handler
  const handleSave = () => {
    const activityToSave = new Activity(
      formData.id,
      formData.name,
      formData.capacity,
      formData.inputBufferCapacity,
      formData.outputBufferCapacity,
      formData.operationSteps,
      formData.x,
      formData.y
    );

    // Preserve connectType (the main thing we're editing here)
    activityToSave.connectType = formData.connectType;

    // Preserve other properties
    activityToSave.financialProperties = formData.financialProperties;
    activityToSave.preProcessingStateModifications = formData.preProcessingStateModifications;
    activityToSave.postProcessingStateModifications = formData.postProcessingStateModifications;

    onSave(activityToSave);
    setIsSaving(true); // Will be cleared by useEffect after 500ms
  };

  // Cancel handler - resets form without closing the editor
  const handleCancel = () => {
    setFormData(extractActivityData(activity));
    setHasChanges(false);
  };

  return (
    <div className="space-y-2">
      <RoutingConfigurationContent
        localData={formData}
        handleChange={handleConnectTypeChange}
        outgoingConnectors={outgoingConnectors}
        selectedConnectorId={selectedConnectorId}
        referenceData={referenceData}
        states={states}
      />

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
          disabled={!hasChanges}
          className={`px-3 py-1.5 text-xs rounded ${
            hasChanges
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          Save
        </button>
      </div>
    </div>
  );
};

export default ConnectorsEditor;
