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
// nothing else.
//
// NO `onClose` (review round 1, Minor). SettingsModal.ts gives this modal a
// real Lucid title bar with a native X -- there is already a way out.
// Passing `onClose` here made SettingsPanel draw its OWN close button too
// (`{onClose && (...)}` in its render), doubling the interactive close
// affordance for no reason: unlike ScheduleModal/ScheduleEditorView, which
// take a `hideHeader` prop specifically to collapse this redundancy,
// SettingsPanel has no such prop -- so the correct equivalent here is
// simply omitting `onClose`, not wiring a second exit. `showTitle={false}`
// likewise drops SettingsPanel's own "Settings" heading, which repeated the
// title bar's.
//
// `extraSections` is deliberately omitted -- that slot is Studio's theme
// control, and Lucid has no theme-preference machinery to hand it (see
// SettingsPanel's own header comment and this task's brief).
//
// `showWindowSize` is on: Lucid opens its Studio surfaces in sized host
// modals, and the Window size section is where the user picks that size
// (it replaced Lucid's Preferences dialog, spec 2026-09-15 section 3).
//
// `onTakeTour` asks the extension to start the tour (TOUR_START, handled by
// TourHandler, which shows the panel the tour runs in), then closes this
// modal so the tour isn't behind it.
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { SettingsPanel } from 'quodsi_studio/platforms/shared'
import { useMessaging } from '../../messaging/MessageProvider'

export function SettingsEditorView() {
  const { sendMessage } = useMessaging()
  const takeTour = () => {
    sendMessage(EnvelopeMessageType.TOUR_START)
    sendMessage(EnvelopeMessageType.CLOSE_MODAL)
  }
  return (
    <div className="h-full w-full bg-surface">
      <SettingsPanel showTitle={false} showWindowSize onTakeTour={takeTour} />
    </div>
  )
}
