// quodsim-react/src/features/editors/LucidActivityEditor.tsx
//
// Lucid renders Studio's shared ActivityEditor (spec 2026-09-14
// lucid-shared-activity-editor): every tab reads and writes through the
// composite element-editor accessor (model-root snapshot, full connectors from
// the selection's reference data), and the host hooks open Lucid's own
// work-schedule modal, States tab and Settings modal. The panel has no network,
// so Script actions are not offered and existing ones show read-only.
//
// The swimlane resource banner is Lucid-only chrome: it reads the selection's
// swimLaneContainment, which only Lucid's host builds, and shows even before
// the first model-root snapshot. Nothing is editable before that snapshot.

import React, { useCallback } from 'react'
import { EnvelopeMessageType, type EditorReferenceData } from '@quodsi/lucid-shared'
import { ActivityEditor } from 'quodsi_studio/platforms/shared'
import { useElementEditorAccessor } from '../../adapters/useElementEditorAccessor'
import { useMessaging } from '../../messaging/MessageProvider'
import { useSimulationRunSender } from '../../messaging/senders/simulationRunSender'
import { useModelOpsSender } from '../../messaging/senders/modelOpsSender'

export interface LucidActivityEditorProps {
  shapeId: string
  referenceData: EditorReferenceData | undefined
}

export const LucidActivityEditor: React.FC<LucidActivityEditorProps> = ({ shapeId, referenceData }) => {
  const { accessor, projection } = useElementEditorAccessor(referenceData)
  const { sendMessage } = useMessaging()
  const { openSettingsModal } = useSimulationRunSender()
  const { selectElement } = useModelOpsSender()
  // Stable hooks: ActivityEditor memoises its EditorHostContext on
  // onGoToStates. Same OPEN_WORK_SCHEDULE_MODAL call as LucidModelEditor.
  const onEditWorkSchedule = useCallback(
    (scheduleId: string) => sendMessage(EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL, { scheduleId }),
    [sendMessage],
  )
  const onGoToStates = useCallback(() => selectElement('model', { targetTab: 'States' }), [selectElement])

  const lane = referenceData?.swimLaneContainment

  return (
    <div className="space-y-2">
      {lane && (
        <div className="px-3 py-2 bg-info-soft text-info-soft-fg rounded text-xs" data-testid="swimlane-resource-banner">
          <div className="font-medium">Swimlane Resource: {lane.resourceName}</div>
          <div className="mt-0.5">
            {lane.assignmentMode === 'runtime-derive'
              ? 'Seize/Release actions auto-injected at simulation time'
              : 'Explicit assignment mode — manage resource actions manually'}
          </div>
        </div>
      )}
      {projection ? (
        <ActivityEditor
          shapeId={shapeId}
          accessor={accessor}
          onOpenSettings={openSettingsModal}
          onEditWorkSchedule={onEditWorkSchedule}
          onGoToStates={onGoToStates}
          network={false}
        />
      ) : (
        <div className="p-3 text-xs text-muted">Loading model…</div>
      )}
    </div>
  )
}

export default LucidActivityEditor
