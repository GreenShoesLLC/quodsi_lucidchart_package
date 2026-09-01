// React view rendered inside SettingsModal's real Lucid modal (?view=settings),
// the host-side modal Task 11b introduced -- see SettingsModal.ts's own header.
//
// THE STRUCTURAL DIFFERENCE FROM ScheduleEditorView/PatternEditorView. Those
// two host a self-contained Studio editor that reads/writes MODEL data, so
// they wrap the host's model-root accessor (with buffering, flush-on-close,
// the works). SettingsPanel has none of that: it is host-agnostic and reads
// / writes only the viewer's own localStorage view preference (see its own
// header comment) -- there is no model, no shapeId, no accessor, and
// therefore nothing to buffer or flush. This view is correspondingly the
// thinnest of the four *EditorView siblings: it renders SettingsPanel and
// wires its own close button to CLOSE_MODAL, exactly as StudioEmbedView's
// close button and ScheduleEditorView's `onClose` do for a chromeless modal
// with no native title-bar X (Lucid's real title bar here supplies a second
// exit; SettingsPanel's own X stays wired for the same doubled-chrome reason
// ScheduleEditorModal accepts).
//
// `extraSections` is deliberately omitted -- that slot is Studio's theme
// control, and Lucid has no theme-preference machinery to hand it (see
// SettingsPanel's own header comment and this task's brief).
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { SettingsPanel } from 'quodsi_studio/platforms/shared'
import { useMessaging } from '../../messaging/MessageProvider'

export function SettingsEditorView() {
  const { sendMessage } = useMessaging()

  return (
    <div className="h-full w-full bg-surface">
      <SettingsPanel onClose={() => sendMessage(EnvelopeMessageType.CLOSE_MODAL)} />
    </div>
  )
}
