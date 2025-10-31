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
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector } from "./hooks/useEditorState";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Input type for activity data - accepts various formats
 */
type ActivityInput = Activity | { data: Partial<Activity> } | Partial<Activity>;

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

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Extracts and normalizes activity data from props into a clean Activity object.
   * Handles multiple data formats and initializes all required properties with safe defaults.
   */
  const extractActivityData = (act: ActivityInput): Activity => {
    const data = (act as any).data || act;
    const safeActivity = new Activity(
      data.id,
      data.name,
      data.capacity || 1,
      data.inputBufferCapacity || Infinity,
      data.outputBufferCapacity || Infinity,
      data.operationSteps || [],
      data.x || 0,
      data.y || 0
    );

    // Preserve connectType (the main property we're editing)
    safeActivity.connectType = data.connectType || ConnectType.Probability;

    // Preserve other properties
    safeActivity.financialProperties = data.financialProperties;
    safeActivity.preProcessingStateModifications = data.preProcessingStateModifications || [];
    safeActivity.postProcessingStateModifications = data.postProcessingStateModifications || [];

    return safeActivity;
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [localActivityDraft, setLocalActivityDraft] = useState<Activity>(() => extractActivityData(activity));
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Redux-based save state tracking
  const elementOpsState = useElementOpsState();
  const isSaving = activity?.id ? elementOpsState.isSaving(activity.id) : false;

  // Sync form data with activity prop changes
  useFormSync(
    activity?.id || "",
    hasPendingChanges,
    () => extractActivityData(activity),
    setLocalActivityDraft,
    setHasPendingChanges
  );

  // Clear hasPendingChanges flag when save completes
  useSaveCompletionDetector(isSaving, setHasPendingChanges);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles changes to the activity's routing type (ConnectType).
   * Updates the local draft and marks the form as having pending changes.
   */
  const handleConnectTypeChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const newConnectType = e.target.value as ConnectType;
    setLocalActivityDraft(prev => {
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
    setHasPendingChanges(true);
  };

  /**
   * Saves the activity's routing configuration changes.
   * Creates a new Activity instance with updated connectType and triggers the onSave callback.
   */
  const handleSave = () => {
    const activityToSave = new Activity(
      localActivityDraft.id,
      localActivityDraft.name,
      localActivityDraft.capacity,
      localActivityDraft.inputBufferCapacity,
      localActivityDraft.outputBufferCapacity,
      localActivityDraft.operationSteps,
      localActivityDraft.x,
      localActivityDraft.y
    );

    // Preserve connectType (the main thing we're editing here)
    activityToSave.connectType = localActivityDraft.connectType;

    // Preserve other properties
    activityToSave.financialProperties = localActivityDraft.financialProperties;
    activityToSave.preProcessingStateModifications = localActivityDraft.preProcessingStateModifications;
    activityToSave.postProcessingStateModifications = localActivityDraft.postProcessingStateModifications;

    onSave(activityToSave);
  };

  /**
   * Cancels any pending changes and resets the form to the original activity state.
   * Does not close the editor - only discards unsaved changes.
   */
  const handleCancel = () => {
    setLocalActivityDraft(extractActivityData(activity));
    setHasPendingChanges(false);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-2">
      <RoutingConfigurationContent
        localData={localActivityDraft}
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
          disabled={!hasPendingChanges}
          className={`px-3 py-1.5 text-xs rounded ${
            hasPendingChanges
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
