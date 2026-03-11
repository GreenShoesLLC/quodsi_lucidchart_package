import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Layers, Plus, Loader2, Trash2 } from "lucide-react";
import { AccordionSection } from "../shared/AccordionSection";
import {
  SwimLaneQuodsiData,
  SwimLaneResourceData,
  EnvelopeMessageType,
  EditorReferenceData,
  Resource,
  ResourceFinancialProperties,
  StateListManager,
} from "@quodsi/shared";
import { useMessaging } from "../../messaging/MessageContext";
import ResourceEditor from "./ResourceEditor";

interface LaneInfo {
  index: number;
  title: string;
  size: number;
  boundingBox: { x: number; y: number; w: number; h: number };
}

interface SwimLaneEditorProps {
  elementData: {
    blockId: string;
    className: string;
    isVertical: boolean;
    isMagnetized: boolean;
    boundingBox: { x: number; y: number; w: number; h: number };
    lanes: LaneInfo[];
    swimlaneData: SwimLaneQuodsiData | null;
  };
  onSave: (data: any) => void;
  referenceData?: EditorReferenceData;
}

const SwimLaneEditor: React.FC<SwimLaneEditorProps> = ({
  elementData,
  onSave,
  referenceData,
}) => {
  const { sendMessage } = useMessaging();
  const [activeLaneIndex, setActiveLaneIndex] = useState(0);
  const [converting, setConverting] = useState(false);
  const [isAssignmentExpanded, setIsAssignmentExpanded] = useState(true);
  const [swimlaneData, setSwimlaneData] = useState<SwimLaneQuodsiData>(
    elementData.swimlaneData || {
      lanes: elementData.lanes.map(() => null),
      lastSyncedAt: new Date().toISOString(),
    }
  );

  // Ensure lanes array matches SDK lane count
  useEffect(() => {
    if (swimlaneData.lanes.length !== elementData.lanes.length) {
      setSwimlaneData(prev => ({
        ...prev,
        lanes: elementData.lanes.map((lane, i) =>
          i < prev.lanes.length ? prev.lanes[i] : null
        ),
      }));
    }
  }, [elementData.lanes.length]);

  // Listen for SWIMLANE_CONVERT_LANE_RESULT from extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      try {
        const msg = event.data;
        if (msg?.type === EnvelopeMessageType.SWIMLANE_CONVERT_LANE_RESULT) {
          const result = msg.data as {
            success: boolean;
            swimlaneBlockId: string;
            swimlaneData?: SwimLaneQuodsiData;
            error?: string;
          };
          if (result.swimlaneBlockId === elementData.blockId && result.success && result.swimlaneData) {
            setSwimlaneData(result.swimlaneData);
          }
          setConverting(false);
        }
      } catch {
        // Ignore non-matching messages
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [elementData.blockId]);

  const activeMapping = swimlaneData.lanes[activeLaneIndex] || null;
  const activeLane = elementData.lanes[activeLaneIndex];

  // Reset confirmation state when switching lanes
  useEffect(() => {
    setConfirmingRemove(false);
  }, [activeLaneIndex]);

  // Resource data is stored inline in the lane mapping
  const activeResource = activeMapping?.resource || null;

  const handleConvertLane = useCallback(() => {
    if (!activeLane || converting) return;

    setConverting(true);

    // Send request to extension — it handles Resource creation in ModelDefinition
    // and q_swimlane persistence, then returns the updated swimlaneData
    sendMessage(EnvelopeMessageType.SWIMLANE_CONVERT_LANE, {
      swimlaneBlockId: elementData.blockId,
      laneIndex: activeLaneIndex,
      resourceName: activeLane.title || `Lane ${activeLane.index} Resource`,
    });
  }, [activeLane, activeLaneIndex, converting, elementData.blockId, sendMessage]);

  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const handleUnconvertLane = useCallback(() => {
    if (!activeMapping) return;

    const updatedLanes = [...swimlaneData.lanes];
    updatedLanes[activeLaneIndex] = null;
    const updatedData: SwimLaneQuodsiData = {
      lanes: updatedLanes,
      lastSyncedAt: new Date().toISOString(),
    };
    setSwimlaneData(updatedData);
    setConfirmingRemove(false);

    sendMessage(EnvelopeMessageType.SWIMLANE_UPDATE, {
      swimlaneBlockId: elementData.blockId,
      swimlaneData: updatedData,
    });
  }, [activeMapping, activeLaneIndex, swimlaneData, elementData.blockId, sendMessage]);

  const handleAssignmentModeChange = useCallback((mode: "runtime-derive" | "explicit") => {
    const updatedLanes = [...swimlaneData.lanes];
    const current = updatedLanes[activeLaneIndex];
    if (!current) return;

    updatedLanes[activeLaneIndex] = { ...current, assignmentMode: mode };
    const updatedData: SwimLaneQuodsiData = {
      lanes: updatedLanes,
      lastSyncedAt: new Date().toISOString(),
    };
    setSwimlaneData(updatedData);

    sendMessage(EnvelopeMessageType.SWIMLANE_UPDATE, {
      swimlaneBlockId: elementData.blockId,
      swimlaneData: updatedData,
    });
  }, [activeLaneIndex, swimlaneData, elementData.blockId, sendMessage]);

  // ---- ResourceEditor adapter ----

  // Convert SwimLaneResourceData → Resource for ResourceEditor
  const resourceFromMapping = useMemo((): Resource => {
    if (!activeMapping?.resource) {
      return new Resource("", "New Resource", 1, 0, 0);
    }
    const r = activeMapping.resource;
    const resource = new Resource(r.id, r.name, r.capacity, 0, 0);
    resource.description = r.description || "";
    if (r.financialProperties) {
      resource.financialProperties = new ResourceFinancialProperties({
        enabled: r.financialProperties.enabled,
        costPerSeize: r.financialProperties.costPerSeize,
        costPerHourUtilized: r.financialProperties.costPerHourUtilized,
        costPerHourIdle: r.financialProperties.costPerHourIdle,
      });
    }
    return resource;
  }, [activeMapping]);

  // Convert Resource back → SwimLaneResourceData and send SWIMLANE_UPDATE
  const handleResourceSave = useCallback((updatedResource: Resource) => {
    if (!activeMapping) return;

    const updatedInline: SwimLaneResourceData = {
      id: updatedResource.id,
      name: updatedResource.name,
      capacity: updatedResource.capacity,
      description: updatedResource.description || "",
    };
    if (updatedResource.financialProperties?.enabled) {
      updatedInline.financialProperties = {
        enabled: true,
        costPerSeize: updatedResource.financialProperties.costPerSeize,
        costPerHourUtilized: updatedResource.financialProperties.costPerHourUtilized,
        costPerHourIdle: updatedResource.financialProperties.costPerHourIdle,
      };
    }

    const updatedLanes = [...swimlaneData.lanes];
    updatedLanes[activeLaneIndex] = {
      ...activeMapping,
      resource: updatedInline,
      titleSnapshot: updatedResource.name, // keep in sync
    };
    const updatedData: SwimLaneQuodsiData = {
      lanes: updatedLanes,
      lastSyncedAt: new Date().toISOString(),
    };
    setSwimlaneData(updatedData);

    sendMessage(EnvelopeMessageType.SWIMLANE_UPDATE, {
      swimlaneBlockId: elementData.blockId,
      swimlaneData: updatedData,
    });
  }, [activeMapping, activeLaneIndex, swimlaneData, elementData.blockId, sendMessage]);

  // Cancel just resets local state — doesn't navigate away from swimlane
  const handleResourceCancel = useCallback(() => {
    // No-op: stays on the swimlane editor, ResourceEditor resets internally
  }, []);

  // Empty states — lane resources don't support custom state variables
  const emptyStates = useMemo(() => new StateListManager(), []);
  const noopStatesChange = useCallback((_states: StateListManager) => {}, []);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-semibold text-gray-900">Swimlane</span>
        </div>
        <div className="text-xs text-gray-500 mt-0.5">
          {elementData.isVertical ? "Vertical" : "Horizontal"} &middot;{" "}
          {elementData.lanes.length} lanes
        </div>
      </div>

      {/* Lane Selector */}
      <div className="px-3 py-2 border-b border-gray-200">
        <label className="block text-xs font-medium text-gray-700 mb-1">Lane</label>
        <select
          value={activeLaneIndex}
          onChange={(e) => setActiveLaneIndex(Number(e.target.value))}
          className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        >
          {elementData.lanes.map((lane, i) => {
            const mapping = swimlaneData.lanes[i];
            return (
              <option key={i} value={i}>
                {mapping ? "\u2713 " : ""}{lane.title || `Lane ${i}`}
              </option>
            );
          })}
        </select>
      </div>

      {/* Lane Content */}
      <div className="flex-1 overflow-y-auto p-3">
        {activeLane && !activeMapping && (
          /* Unmapped lane */
          <div className="text-center py-8">
            <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-3">
              "{activeLane.title || `Lane ${activeLane.index}`}" is not mapped to a resource
            </p>
            <button
              onClick={handleConvertLane}
              disabled={converting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 rounded transition-colors"
            >
              {converting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Plus className="w-3.5 h-3.5" />
              )}
              {converting ? "Converting..." : "Convert to Resource"}
            </button>
          </div>
        )}

        {activeLane && activeMapping && (
          /* Mapped lane — embed ResourceEditor + assignment mode toggle */
          <div className="space-y-4">
            {/* Assignment Mode */}
            <AccordionSection
              title="Resource Assignment"
              isExpanded={isAssignmentExpanded}
              onToggle={() => setIsAssignmentExpanded(!isAssignmentExpanded)}
            >
              <div className="space-y-1.5">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assignmentMode"
                    value="runtime-derive"
                    checked={activeMapping.assignmentMode === "runtime-derive"}
                    onChange={() => handleAssignmentModeChange("runtime-derive")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-900">Auto-derive</div>
                    <div className="text-xs text-gray-500">
                      Activities in this lane automatically require this resource
                    </div>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="assignmentMode"
                    value="explicit"
                    checked={activeMapping.assignmentMode === "explicit"}
                    onChange={() => handleAssignmentModeChange("explicit")}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-medium text-gray-900">Explicit</div>
                    <div className="text-xs text-gray-500">
                      Manually assign resource requirements on each activity
                    </div>
                  </div>
                </label>
              </div>
            </AccordionSection>

            {/* Embedded ResourceEditor */}
            <div className="border-t border-gray-200 pt-3">
              <ResourceEditor
                resource={resourceFromMapping}
                onSave={handleResourceSave}
                onCancel={handleResourceCancel}
                states={emptyStates}
                onStatesChange={noopStatesChange}
                referenceData={referenceData}
              />
            </div>

            {/* Lane Info */}
            <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
              <div>Lane index: {activeLane.index}</div>
              <div>Size: {activeLane.size}px</div>
              <div>Resource ID: <code className="text-xs">{activeMapping.resource.id}</code></div>
            </div>

            {/* Remove Resource */}
            <div className="border-t border-gray-100 pt-3">
              {!confirmingRemove ? (
                <button
                  onClick={() => setConfirmingRemove(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 hover:bg-red-50 rounded transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Remove Resource
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-red-600">
                    Remove resource mapping from this lane? The resource will be deleted from the model.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUnconvertLane}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded transition-colors"
                    >
                      Confirm Remove
                    </button>
                    <button
                      onClick={() => setConfirmingRemove(false)}
                      className="px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-300 hover:bg-gray-50 rounded transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwimLaneEditor;
