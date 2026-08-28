// React view rendered inside WorkScheduleEditorModal's real Lucid modal
// (?view=work-schedule&scheduleId=...), for the work-schedule editor (spec
// 2026-08-27 §6).
//
// ScheduleEditorView's direct sibling; that file's module header carries the
// full "why buffering", "why both unmount AND pagehide/beforeunload", and
// "why embedded + hideHeader" story, which is identical here and is not
// repeated. Only the two real differences are recorded:
//
//   - ADDRESSED BY SCHEDULE ID, NOT SHAPE ID. WorkScheduleModal's prop is
//     `scheduleId`, because a work schedule is a model-level record that any
//     number of Resources and Activities may follow; there is no owning
//     shape to name. The modal's URL therefore carries `scheduleId`, and this
//     view reads that param.
//
//   - NO CREATE-ON-FIRST-EDIT. ScheduleModal mints and links a schedule the
//     first time a SCHEDULED generator has none; WorkScheduleModal never
//     does, because the caller (WorkSchedulesEditor's "New schedule", or
//     CapacitySourcePicker's) created the record before it could hand over an
//     id. So this view's only write path is
//     accessor.updateModel({ workSchedules }) -- a MODEL_ROOT_UPDATE -- and
//     it never needs the shape-write route at all.
import { useEffect, useMemo } from 'react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { WorkScheduleModal } from 'quodsi_studio/platforms/shared'
import { useMessaging } from '../../messaging/MessageProvider'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { createBufferingAccessor } from '../../adapters/bufferingAccessor'

/** Trailing debounce for host writes. Matches ScheduleEditorView's constant. */
const WORK_SCHEDULE_EDITOR_DEBOUNCE_MS = 500

export function WorkScheduleEditorView() {
  const params = new URLSearchParams(window.location.search)
  const scheduleId = params.get('scheduleId') ?? ''

  const { sendMessage } = useMessaging()
  const { accessor: base, projection } = useModelRootSource()

  // Built once per `base` identity -- see ScheduleEditorView's own comment for
  // why this depends on the inner accessor and not the hook's return object.
  const accessor = useMemo(
    () => createBufferingAccessor(base, { debounceMs: WORK_SCHEDULE_EDITOR_DEBOUNCE_MS }),
    [base],
  )

  useEffect(() => {
    return () => {
      accessor.dispose()
    }
  }, [accessor])

  // THE CLOSE PATH. Closing this modal destroys the iframe document outright,
  // so React never unmounts and the cleanup above never runs in production --
  // without these listeners, anything edited in the last ~500ms before close
  // is silently dropped. Same posture as ScheduleEditorView.
  useEffect(() => {
    const flushNow = () => {
      void accessor.flush().catch(() => {
        // Nobody left to report to: the document is going away.
      })
    }
    window.addEventListener('pagehide', flushNow)
    window.addEventListener('beforeunload', flushNow)
    return () => {
      window.removeEventListener('pagehide', flushNow)
      window.removeEventListener('beforeunload', flushNow)
    }
  }, [accessor])

  if (!projection) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-surface">
        <span className="text-xs text-secondary">Loading work schedule…</span>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <WorkScheduleModal
        open
        embedded
        hideHeader
        onClose={() => sendMessage(EnvelopeMessageType.CLOSE_MODAL)}
        scheduleId={scheduleId}
        accessor={accessor}
      />
    </div>
  )
}
