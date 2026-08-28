// quodsim-react/src/features/editors/ResourceBlockEditor.tsx
//
// A Resource BLOCK is a POINTER at a model-level resource, not the record
// itself (Plan 2b). Its shape data carries only `{ id, type: 'Resource',
// resourceId }`; name / capacity / financials / levers all live on the
// model-root `resources` list. This component is the whole Resource-block
// selection surface, and it only ever chooses between two SHARED Studio
// panels:
//   - pointer resolves  -> <ResourceEditor> on that resource (Basic +
//     Financial tabs; Basic renders lever authoring, so nothing was lost
//     when Lucid's own ResourceEditor.tsx was deleted in this task).
//   - pointer absent or DANGLING -> <ResourceLinkPicker>, whose onLink
//     writes ONLY the pointer onto this block via accessor.updateShape
//     (ELEMENT_UPDATE). The create -> durable flush -> link ordering lives
//     inside the picker; do not reimplement it here.
//
// THE `onEditWorkSchedule` SEAM. A resource that follows a work schedule gets
// an "Edit schedule" button from the shared CapacitySourcePicker, and without
// a handler the shared control opens its OWN WorkScheduleModal -- correct for
// Studio and drawio, trapped inside the 300px right dock here. Supplying the
// handler means "I will present the editor", exactly as SchedulesTab does for
// WorkSchedulesEditor (see its header) and ActivityEditor does for the
// activity-side picker. The id is a SCHEDULE id, not a shape id.
//
// A dangling pointer is deliberately NOT auto-cleared: resolveResourceLinks
// already reports it, ValidationPanel surfaces the warning, and the picker
// below is the fix the user is offered.
//
// A resolving pointer is not enough on its own, though. Lucid copies
// shapeData wholesale on paste, so a pasted Resource block arrives carrying
// the ORIGINAL's resourceId. resolveResourceLinks is first-wins: the
// original keeps the record and its projection row is stamped with the
// winner's transient marker (`shapeId` for a block, `laneRef` for a lane),
// while the copy's claim is REJECTED and reported as `resource_link_*`.
// Existence-only resolution therefore handed the copy the shared editor and
// let it rewrite the record the original owns. So the pointer must resolve
// AND the row must not already belong to someone else:
//   - claimed by THIS block            -> editor;
//   - unclaimed (no shapeId, no laneRef) -> editor. Deliberate: this is the
//     window between writing a fresh link and the next snapshot stamping the
//     claim, and the user who just linked must not be told they lost;
//   - claimed by a different shape, or by a lane -> notice + the picker, so
//     the copy can take an unclaimed or new resource instead.

import React, { useSyncExternalStore } from 'react'
import { ResourceEditor, ResourceLinkPicker } from 'quodsi_studio/platforms/shared'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { useMessaging } from '../../messaging/MessageProvider'

/**
 * The model-root projection's resource row. `shapeId` / `laneRef` are
 * TRANSIENT claim markers stamped at build time by resolveResourceLinks --
 * never persisted, and present only on the row the winning claimant owns.
 */
type ResourceRow = {
  id: string
  name: string
  shapeId?: string
  laneRef?: { blockId: string; laneId: string }
}

interface Props {
  blockId: string
  /** The block's pointer. Absent on a freshly-classified Resource block. */
  resourceId?: string
}

export const ResourceBlockEditor: React.FC<Props> = ({ blockId, resourceId }) => {
  const { accessor } = useModelRootSource()
  const { sendMessage } = useMessaging()
  // Same subscription idiom every shared panel uses, so this re-renders the
  // moment a MODEL_ROOT_SNAPSHOT lands -- which is what swaps the picker for
  // the editor after a link is written (saveShape re-requests the projection
  // once the host confirms the ELEMENT_UPDATE).
  const snap = useSyncExternalStore(accessor.subscribe, accessor.getSnapshot)
  const resources =
    (snap.modelDefinition as unknown as { resources?: ResourceRow[] } | null)?.resources ?? []
  const linked = resourceId ? resources.find((r) => r.id === resourceId) : undefined
  const ownsClaim = !!linked && linked.shapeId === blockId
  const unclaimed = !!linked && !linked.shapeId && !linked.laneRef

  if (linked && (ownsClaim || unclaimed)) {
    return (
      <ResourceEditor
        resourceId={linked.id}
        accessor={accessor}
        onEditWorkSchedule={(id) =>
          sendMessage(EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL, { scheduleId: id })
        }
      />
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-600">
        {linked
          ? `Resource '${linked.name}' is already represented by another shape. This copy is not linked.`
          : resourceId
            ? 'This shape points at a Resource that no longer exists. Link it to an existing Resource or create a new one.'
            : 'This shape is not linked to a Resource yet.'}
      </p>
      <ResourceLinkPicker
        accessor={accessor}
        onLink={(id) => accessor.updateShape(blockId, 'Resource', { resourceId: id })}
        onLinked={() => {}}
      />
    </div>
  )
}

export default ResourceBlockEditor
