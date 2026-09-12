// quodsim-react/src/features/editors/SchedulesTab.tsx
//
// Lucid's mount point for the SHARED WorkSchedulesEditor (quodsi_studio/
// platforms/shared), the "Schedules" tab beside Arrivals (spec 2026-08-27 §6).
// The accessor is the Model editor's one model-root accessor (spec 2026-09-12).
//
// `workSchedules` is in updateModelRoot's known keys, so every write this
// editor makes -- create, rename, delete -- has a real persistence path.
//
// THE `onEdit` SEAM IS THE WHOLE POINT OF THIS FILE. WorkSchedulesEditor opens
// its OWN WorkScheduleModal when no `onEdit` handler is supplied -- correct for
// Studio and drawio. Lucid has a real, resizable modal, so supplying `onEdit`
// means "I will present the editor"; otherwise one click opens two modals, one
// trapped inside the 300px right-dock panel iframe. The id handed to
// OPEN_WORK_SCHEDULE_MODAL is a SCHEDULE id, not a shape id.

import React from 'react'
import { WorkSchedulesEditor } from 'quodsi_studio/platforms/shared'
import type { ModelStateAccessor } from 'quodsi_studio/platforms/shared'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useMessaging } from '../../messaging/MessageProvider'

export interface SchedulesTabProps {
  accessor: ModelStateAccessor
}

export const SchedulesTab: React.FC<SchedulesTabProps> = ({ accessor }) => {
  const { sendMessage } = useMessaging()
  return (
    <WorkSchedulesEditor
      accessor={accessor}
      onEdit={(id) => sendMessage(EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL, { scheduleId: id })}
    />
  )
}

export default SchedulesTab
