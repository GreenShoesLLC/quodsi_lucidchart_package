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
// simply omitting `onClose`, not wiring a second exit. (SettingsPanel's
// "Settings" `<h2>` heading itself still renders unconditionally alongside
// Lucid's own title bar text -- a smaller, purely cosmetic text repeat this
// view accepts, distinct from the doubled INTERACTIVE close button the
// previous version had.)
//
// `extraSections` is deliberately omitted -- that slot is Studio's theme
// control, and Lucid has no theme-preference machinery to hand it (see
// SettingsPanel's own header comment and this task's brief).
import { SettingsPanel } from 'quodsi_studio/platforms/shared'

export function SettingsEditorView() {
  return (
    <div className="h-full w-full bg-surface">
      <SettingsPanel />
    </div>
  )
}
