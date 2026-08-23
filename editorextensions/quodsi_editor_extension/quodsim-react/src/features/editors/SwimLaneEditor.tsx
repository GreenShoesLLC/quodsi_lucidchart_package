// quodsim-react/src/features/editors/SwimLaneEditor.tsx
//
// A swimlane LANE is a POINTER at a model-level resource, exactly like a
// Resource block (Plan 2b). Its q_swimlane mapping carries laneId /
// titleSnapshot / assignmentMode / resourceId and nothing else -- the record
// itself lives in the page's q_resources and outlives every claimant.
//
// So this editor owns no resource state. It chooses between the two SHARED
// Studio panels the Resource block also uses:
//   - no resourceId, or a resourceId that resolves to NOTHING in the
//     model-root snapshot -> <ResourceLinkPicker claimantNoun="lane">, whose
//     onLink writes ONLY the pointer into the lane. The create -> confirmed
//     model-root write -> link ordering lives inside the picker; do not
//     reimplement it here.
//   - a resourceId that resolves -> <ResourceEditor> on that resource.
//
// Resolving the pointer against the snapshot (rather than trusting its mere
// presence) is what keeps a DANGLING lane out of the shared editor. Deleting a
// resource from the Resources tab does not rewrite q_swimlane -- the cascade
// leaves the pointer behind and the builder reports it as
// `resource_link_dangling` -- and ResourceEditor's answer to an unknown id is
// a "Resource ... not found ... Re-bootstrap" dead end that no gesture in this
// panel can clear. Same posture, same copy, as ResourceBlockEditor next door.
//
// Two consequences worth stating, because both were true the other way round
// until this task:
//   - There is no lane-side resource CREATION message any more. The
//     extension's convert route (and its result envelope) is gone; the only
//     message this editor sends is SWIMLANE_UPDATE, which persists the blob
//     composed here.
//   - "Remove Resource" is now "Unlink lane". Unlinking a lane unlinks a
//     lane; the resource stays in the model, unclaimed, and can be re-linked
//     here or from any other claimant.
//
// Storage format 1's inline mapping.resource copy is read by nothing here.
// It exists on the type for ResourceStorageMigration alone, and this file
// must never write it back.

import React, { useState, useEffect, useCallback, useSyncExternalStore } from "react";
import { Layers, Unlink } from "lucide-react";
import { AccordionSection } from "../shared/AccordionSection";
import {
  SwimLaneQuodsiData,
  SwimLaneLaneMapping,
  EnvelopeMessageType,
  generateUUID,
} from "@quodsi/lucid-shared";
import { ResourceEditor, ResourceLinkPicker } from "quodsi_studio/platforms/shared";
import { useMessaging } from "../../messaging/MessageContext";
import { useModelRootSource } from "../../adapters/useModelRootSource";

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
}

const SwimLaneEditor: React.FC<SwimLaneEditorProps> = ({ elementData }) => {
  const { sendMessage } = useMessaging();
  const { accessor } = useModelRootSource();
  const [activeLaneIndex, setActiveLaneIndex] = useState(0);
  const [confirmingUnlink, setConfirmingUnlink] = useState(false);
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

  const activeMapping = swimlaneData.lanes[activeLaneIndex] || null;
  const activeLane = elementData.lanes[activeLaneIndex];

  // Same subscription idiom every shared panel uses, so this re-renders the
  // moment a MODEL_ROOT_SNAPSHOT lands.
  const snap = useSyncExternalStore(accessor.subscribe, accessor.getSnapshot);
  const resources =
    (snap.modelDefinition as unknown as { resources?: Array<{ id: string }> } | null)?.resources ??
    [];
  const linkedResource = activeMapping?.resourceId
    ? resources.find((r) => r.id === activeMapping.resourceId)
    : undefined;

  // Reset confirmation state when switching lanes
  useEffect(() => {
    setConfirmingUnlink(false);
  }, [activeLaneIndex]);

  /**
   * The ONE write path for lane state: replaces the mapping at `index` (or
   * clears it with null), keeps local state in step, and persists the whole
   * q_swimlane blob through SWIMLANE_UPDATE. The blob is positional and
   * complete every time -- the handler overwrites, it does not merge.
   */
  const writeLane = useCallback(
    (index: number, mapping: SwimLaneLaneMapping | null) => {
      const updatedLanes = [...swimlaneData.lanes];
      updatedLanes[index] = mapping;
      const updatedData: SwimLaneQuodsiData = {
        lanes: updatedLanes,
        lastSyncedAt: new Date().toISOString(),
      };
      setSwimlaneData(updatedData);

      sendMessage(EnvelopeMessageType.SWIMLANE_UPDATE, {
        swimlaneBlockId: elementData.blockId,
        swimlaneData: updatedData,
      });
    },
    [swimlaneData, elementData.blockId, sendMessage]
  );

  const handleUnlinkLane = useCallback(() => {
    setConfirmingUnlink(false);
    writeLane(activeLaneIndex, null);
  }, [activeLaneIndex, writeLane]);

  const handleAssignmentModeChange = useCallback(
    (mode: "runtime-derive" | "explicit") => {
      if (!activeMapping) return;
      writeLane(activeLaneIndex, { ...activeMapping, assignmentMode: mode });
    },
    [activeMapping, activeLaneIndex, writeLane]
  );

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
        {activeLane && !linkedResource && (
          /* Unlinked -- or DANGLING -- lane: pick or create the model-level
             resource it stands for. Either way the fix is the same picker. */
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              {activeMapping?.resourceId
                ? "This lane points at a Resource that no longer exists. Link it to an existing Resource or create a new one."
                : "This lane is not linked to a Resource."}
            </p>
            <ResourceLinkPicker
              accessor={accessor}
              claimantNoun="lane"
              onLink={async (resourceId) => {
                writeLane(activeLaneIndex, {
                  laneId: activeMapping?.laneId ?? generateUUID(),
                  titleSnapshot:
                    activeMapping?.titleSnapshot ?? activeLane.title ?? `Lane ${activeLane.index}`,
                  assignmentMode: activeMapping?.assignmentMode ?? "runtime-derive",
                  resourceId,
                });
              }}
              onLinked={() => {}}
            />
          </div>
        )}

        {activeLane && activeMapping?.resourceId && linkedResource && (
          /* Linked lane -- assignment mode + the SHARED editor on the resource */
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

            {/* The model-level record this lane points at, edited in place. */}
            <div className="border-t border-gray-200 pt-3">
              <ResourceEditor resourceId={activeMapping.resourceId} accessor={accessor} />
            </div>

            {/* Lane Info */}
            <div className="text-xs text-gray-500 border-t border-gray-100 pt-3">
              <div>Lane index: {activeLane.index}</div>
              <div>Size: {activeLane.size}px</div>
              <div>Resource ID: <code className="text-xs">{activeMapping.resourceId}</code></div>
            </div>

            {/* Unlink */}
            <div className="border-t border-gray-100 pt-3">
              {!confirmingUnlink ? (
                <button
                  onClick={() => setConfirmingUnlink(true)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 rounded transition-colors"
                >
                  <Unlink className="w-3.5 h-3.5" />
                  Unlink lane
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-gray-600">
                    Unlink this lane from its Resource? The Resource stays in the
                    model&apos;s Resources list; only the lane&apos;s link is removed.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleUnlinkLane}
                      className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                    >
                      Confirm unlink
                    </button>
                    <button
                      onClick={() => setConfirmingUnlink(false)}
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
