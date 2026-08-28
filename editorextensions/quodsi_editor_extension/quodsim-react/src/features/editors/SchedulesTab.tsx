// quodsim-react/src/features/editors/SchedulesTab.tsx
//
// Lucid's mount point for the SHARED WorkSchedulesEditor (quodsi_studio/
// platforms/shared), the "Schedules" tab beside Arrivals (spec 2026-08-27
// §6). ArrivalsTab is the direct precedent for both the wrapper's existence
// and its shape -- see that file's header for why the useModelRootSource call
// lives HERE rather than in ModelEditor (rendering it only while this tab is
// active keeps a model-root request off every model-panel open).
//
// `workSchedules` is in updateModelRoot's `knownKeys` on the extension side
// (core/ModelManager.ts), so every write this editor makes -- create, rename,
// delete -- has a real persistence path. That matters specifically here:
// updateModelRoot THROWS on a key it cannot persist rather than dropping it,
// so a missing case would fail the whole patch, not part of it.
//
// THE `onEdit` SEAM IS THE WHOLE POINT OF THIS FILE. WorkSchedulesEditor
// opens its OWN WorkScheduleModal when no `onEdit` handler is supplied --
// correct for Studio and drawio, which have no host-level wider surface.
// Lucid does: a real Lucid modal the user sizes by preference. Supplying
// `onEdit` therefore means "I will present the editor", and the shared
// component then presents nothing -- otherwise one click opens two modals,
// one of them trapped inside the 300px right-dock panel iframe.
//
// The id handed to OPEN_WORK_SCHEDULE_MODAL is a SCHEDULE id, not a shape id
// (a work schedule is a model-level record; see WorkScheduleEditorModal).

import React from 'react'
import { WorkSchedulesEditor } from 'quodsi_studio/platforms/shared'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { useMessaging } from '../../messaging/MessageProvider'

export const SchedulesTab: React.FC = () => {
  const { accessor } = useModelRootSource()
  const { sendMessage } = useMessaging()
  return (
    <WorkSchedulesEditor
      accessor={accessor}
      onEdit={(id) => sendMessage(EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL, { scheduleId: id })}
    />
  )
}

export default SchedulesTab
