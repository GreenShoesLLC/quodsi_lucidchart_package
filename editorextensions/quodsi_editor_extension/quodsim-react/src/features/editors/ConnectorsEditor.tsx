import React, { useState, useEffect } from "react";
import {
  Activity,
  ConnectType,
  EditorReferenceData,
  StateListManager,
  Connector,
} from "@quodsi/shared";
import { RoutingConfigurationContent } from "./RoutingConfigurationContent";
import { useModelOpsSender } from "../../messaging/senders";

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

  // Sync local draft when activity prop changes (e.g., user selects a different connector)
  useEffect(() => {
    setLocalActivityDraft(extractActivityData(activity));
  }, [activity?.id]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handles changes to the activity's routing type (ConnectType).
   * Auto-saves immediately by sending the updated Activity to the extension.
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
    updateElementData(updatedActivity.id, "Activity", updatedActivity);
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
    </div>
  );
};

export default ConnectorsEditor;
