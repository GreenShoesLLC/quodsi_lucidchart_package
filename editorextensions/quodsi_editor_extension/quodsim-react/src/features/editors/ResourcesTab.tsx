// quodsim-react/src/features/editors/ResourcesTab.tsx
//
// Lucid's mount point for the SHARED ResourcesEditor (quodsi_studio/platforms/
// shared) -- the model-level list of Resources introduced by Plan 2b. Written
// once and compiled into every host; only tab REGISTRATION differs.
//
// The accessor is the Model editor's one model-root accessor (spec
// 2026-09-12). Its snapshot carries activity and connector summaries with
// levers, so the delete dialog counts from it directly -- the separate
// referenceData source this tab used to be handed is gone.
//
// It writes `resources` (and `workSchedules` from the capacity picker). A
// delete is `referenceCleanup="host"`: the extension prunes requirements and
// cleans steps with the user's choice, so this panel never writes shapes or
// requirement lists on delete.
//
// THE `onEditWorkSchedule` SEAM. Without a handler the shared
// CapacitySourcePicker opens its OWN WorkScheduleModal, trapped inside the
// 300px right dock here. Supplying it means "I will present the editor",
// exactly as SchedulesTab does. The id is a SCHEDULE id, not a shape id.

import React from 'react'
import { ResourcesEditor } from 'quodsi_studio/platforms/shared'
import type { ModelStateAccessor } from 'quodsi_studio/platforms/shared'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useMessaging } from '../../messaging/MessageProvider'

export interface ResourcesTabProps {
  accessor: ModelStateAccessor
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({ accessor }) => {
  const { sendMessage } = useMessaging()
  return (
    <ResourcesEditor
      accessor={accessor}
      referenceCleanup="host"
      onEditWorkSchedule={(id) =>
        sendMessage(EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL, { scheduleId: id })
      }
    />
  )
}

export default ResourcesTab
