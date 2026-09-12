// quodsim-react/src/features/editors/ResourcesTab.tsx
//
// Lucid's mount point for the SHARED ResourcesEditor (quodsi_studio/platforms/
// shared) -- the model-level list of Resources introduced by Plan 2b. Written
// once and compiled into every host, exactly like ArrivalsTab above it and
// guarded by adapters/__tests__/sharedPanelImport.test.tsx. Only tab
// REGISTRATION differs between hosts: Studio/drawio/Visio share a flat TABS
// array in their own ModelEditor, Lucid has TAB_CONFIG with icons and tooltips.
//
// The accessor comes from useModelRootSource, which issues a model-root
// request on mount. That is why this wrapper exists rather than calling the
// hook up in ModelEditor: rendering it only while the Resources tab is active
// keeps the request off every model-panel open.
//
// It writes `resources` (and `workSchedules` from the capacity picker). A
// delete is `referenceCleanup="host"`: the extension prunes requirements and
// cleans steps with the user's choice (spec 2026-09-11 resource delete
// cleanup), so this panel never writes shapes or requirement lists on delete.
//
// THE `onEditWorkSchedule` SEAM. A resource that follows a work schedule gets
// an "Edit schedule" button from the shared CapacitySourcePicker, and without
// a handler the shared control opens its OWN WorkScheduleModal -- correct for
// Studio and drawio, trapped inside the 300px right dock here. Supplying the
// handler means "I will present the editor", exactly as SchedulesTab does for
// WorkSchedulesEditor (see its header) and ActivityEditor does for the
// activity-side picker. The id is a SCHEDULE id, not a shape id.
//
// Link status (which shape or lane represents each resource) is resolved
// through accessor.getShapeInfo, which useModelRootSource serves from the
// same projection -- see its own comment for why that lookup is a pure
// cached read rather than a host round trip.

import React from 'react'
import { ResourcesEditor } from 'quodsi_studio/platforms/shared'
import type { ModelStateAccessor } from 'quodsi_studio/platforms/shared'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { useMessaging } from '../../messaging/MessageProvider'

type ResourcesTabProps = {
  /**
   * The Model editor's referenceData accessor: activity and connector action
   * summaries for the delete dialog's counts (the model-root projection carries
   * none). Read-only here -- ResourcesEditor never writes to it.
   */
  referenceSource?: ModelStateAccessor
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({ referenceSource }) => {
  const { accessor } = useModelRootSource()
  const { sendMessage } = useMessaging()
  return (
    <ResourcesEditor
      accessor={accessor}
      referenceCleanup="host"
      referenceSource={referenceSource}
      onEditWorkSchedule={(id) =>
        sendMessage(EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL, { scheduleId: id })
      }
    />
  )
}

export default ResourcesTab
