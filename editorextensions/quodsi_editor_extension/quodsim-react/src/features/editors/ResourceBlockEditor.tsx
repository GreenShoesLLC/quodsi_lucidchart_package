// quodsim-react/src/features/editors/ResourceBlockEditor.tsx
//
// A Resource BLOCK is a POINTER at a model-level resource, not the record
// itself (Plan 2b). Its shape data carries only `{ id, type: 'Resource',
// resourceId }`; name / capacity / financials / levers all live on the
// model-root `resources` list.
//
// This component is Lucid's host wiring around the SHARED ResourceClaimPanel,
// which decides (resolveClaimantView) between the Resource editor and the
// reason-plus-picker, with the same rule drawio and Visio use:
//   - the row this block owns, or an unclaimed row its pointer names (the
//     window between writing a link and the next snapshot stamping the
//     claim) -> <ResourceEditor>;
//   - a row another claimant owns (Lucid copies shapeData wholesale on paste,
//     so a pasted block carries the original's resourceId) -> "already
//     represented elsewhere" + <ResourceLinkPicker>;
//   - a pointer naming no row (deleted from the Resources tab; left in place
//     and reported as resource_link_dangling) -> "no longer exists" + picker;
//   - no pointer -> the picker.
//
// What Lucid supplies:
//   - onLink writes ONLY the pointer onto this block via accessor.updateShape
//     (ELEMENT_UPDATE). The create -> durable flush -> link ordering lives
//     inside the picker.
//   - THE `onEditWorkSchedule` SEAM: without a handler the shared
//     CapacitySourcePicker opens its OWN WorkScheduleModal, trapped inside the
//     300px right dock. Supplying it means "Lucid presents the editor" (a real
//     Lucid modal). The id is a SCHEDULE id, not a shape id.
//   - onOpenSettings: the OPEN_SETTINGS_MODAL sender for ResourceEditor's
//     ViewTell.

import React from 'react'
import { ResourceClaimPanel } from 'quodsi_studio/platforms/shared'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { useMessaging } from '../../messaging/MessageProvider'
import { useSimulationRunSender } from '../../messaging/senders/simulationRunSender'

interface Props {
  blockId: string
  /** The block's pointer. Absent on a freshly-classified Resource block. */
  resourceId?: string
}

export const ResourceBlockEditor: React.FC<Props> = ({ blockId, resourceId }) => {
  const { accessor } = useModelRootSource()
  const { sendMessage } = useMessaging()
  const { openSettingsModal } = useSimulationRunSender()

  return (
    <ResourceClaimPanel
      shapeId={blockId}
      resourceId={resourceId}
      accessor={accessor}
      onLink={(id) => accessor.updateShape(blockId, 'Resource', { resourceId: id })}
      onEditWorkSchedule={(id) =>
        sendMessage(EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL, { scheduleId: id })
      }
      onOpenSettings={openSettingsModal}
    />
  )
}

export default ResourceBlockEditor
