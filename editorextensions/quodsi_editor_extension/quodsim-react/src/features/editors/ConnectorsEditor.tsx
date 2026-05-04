import React, { useState, useCallback } from "react";
import {
  Activity,
  ConnectType,
  EditorReferenceData,
  StateListManager,
  Connector,
} from "@quodsi/shared";
import { RoutingConfigurationContent } from "./RoutingConfigurationContent";
import { useModelOpsSender } from "../../messaging/senders";
import { useElementOpsState } from "../../messaging/hooks/useElementOpsState";
import { useFormSync, useSaveCompletionDetector, useAutoSave, useFlushOnChange } from "./hooks/useEditorState";
import SaveStatusLine from "./SaveStatusLine";

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
  referenceData: EditorReferenceData;
  states: StateListManager;
}

/**
 * ConnectorsEditor - Dedicated editor for Activity routing configuration
 *
 * Used standalone when a Connector/Line is selected (shows source Activity's
 * routing). When selectedConnectorId is provided, highlights that connector
 * in the list.
 *
 * NOTE: ActivityEditor's "connectors" tab uses RoutingConfigurationContent
 * directly (not this component); ActivityEditor handles its own auto-save
 * for connectType.
 *
 * Save Behavior:
 * - Routing type (connectType) change: immediate save via useFlushOnChange
 *   (selects have no useful onBlur). Status surfaced via SaveStatusLine
 *   ("Saved" / "Saving…" / "Save failed — keep typing to retry"). Native
 *   LucidChart Ctrl+Z reverses saved changes.
 * - Per-connector configuration (probabilities, conditions, entity mappings):
 *   handled by RoutingConfigurationPanel via its own messaging path —
 *   outside this editor's auto-save scope.
 */
const ConnectorsEditor: React.FC<ConnectorsEditorProps> = ({
  activity,
  outgoingConnectors,
  selectedConnectorId,
  referenceData,
  states,
}) => {
  const isDevelopment = process.env.NODE_ENV === "development";
  const { updateElementData } = useModelOpsSender();

  if (isDevelopment) {
    console.log("[ConnectorsEditor] Rendered with:", {
      activityId: activity?.id,
      activityName: activity?.name,
      connectorsCount: outgoingConnectors?.length,
      selectedConnectorId,
      hasReferenceData: !!referenceData,
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

  const extractActivityData = (act: ActivityInput): Activity => {
    const data = (act as any).data || act;
    const safeActivity = new Activity(
      data.id,
      data.name,
      data.capacity || 1,
      data.inboundQueueCapacity || Infinity,
      data.outboundQueueCapacity || Infinity,
      data.actions || [],
      data.x || 0,
      data.y || 0
    );

    safeActivity.connectType = data.connectType || ConnectType.Probability;
    safeActivity.financialProperties = data.financialProperties;

    return safeActivity;
  };

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  const [localActivityDraft, setLocalActivityDraft] = useState<Activity>(() =>
    extractActivityData(activity)
  );
  const [hasPendingChanges, setHasPendingChanges] = useState(false);

  // Get element operations state from Redux
  const elementOpsState = useElementOpsState();
  const isSaving = localActivityDraft.id
    ? elementOpsState.isSaving(localActivityDraft.id)
    : false;

  // Sync local draft when activity prop changes — guards against overwriting in-flight edits.
  useFormSync(
    activity.id,
    hasPendingChanges,
    () => extractActivityData(activity),
    setLocalActivityDraft,
    setHasPendingChanges
  );

  useSaveCompletionDetector(isSaving, setHasPendingChanges);

  // Wrap updateElementData in the onSave shape the hook expects.
  const onSave = useCallback(
    (updated: Activity) => {
      updateElementData(updated.id, "Activity", updated);
    },
    [updateElementData]
  );

  const { status, lastSavedAt, saveNow } = useAutoSave<Activity>({
    draft: localActivityDraft,
    hasPendingChanges,
    isValid: true, // No validation surface in this editor (connectType is enum-bounded).
    onSave,
    isSaving,
    elementId: localActivityDraft.id,
  });

  // Fire saveNow when routing type changes (no debounce — connectType is decisive).
  useFlushOnChange(localActivityDraft.connectType, saveNow);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles changes to the activity's routing type (ConnectType).
   *
   * Updates local draft and marks pending — useFlushOnChange watching connectType
   * fires saveNow on the next render, which dispatches the save through useAutoSave.
   * Status surfaced via SaveStatusLine.
   */
  const handleConnectTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
  ) => {
    const newConnectType = e.target.value as ConnectType;
    const updatedActivity = new Activity(
      localActivityDraft.id,
      localActivityDraft.name,
      localActivityDraft.capacity,
      localActivityDraft.inboundQueueCapacity,
      localActivityDraft.outboundQueueCapacity,
      localActivityDraft.actions,
      localActivityDraft.x,
      localActivityDraft.y
    );
    updatedActivity.connectType = newConnectType;
    updatedActivity.financialProperties = localActivityDraft.financialProperties;

    setLocalActivityDraft(updatedActivity);
    setHasPendingChanges(true);
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

      {/* Auto-save status */}
      <SaveStatusLine status={status} lastSavedAt={lastSavedAt} />
    </div>
  );
};

export default ConnectorsEditor;
