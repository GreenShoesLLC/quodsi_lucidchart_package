// React view rendered inside ScheduleEditorModal's real Lucid modal
// (?view=schedule&shapeId=...), the host-side CHROMELESS modal Task 2
// introduced.
//
// This is PatternEditorView's sibling and shares its whole rationale for
// wrapping the base accessor in createBufferingAccessor -- see that file's
// module header for the full "why buffering" and "why both unmount AND
// pagehide/beforeunload" story; it is not repeated here except where this
// view differs from it.
//
// THE STRUCTURAL DIFFERENCE FROM PatternEditorView. PatternEditorView
// renders GeneratorPatternTab, which IS the editor -- this view's own
// wrapper div supplies the loading gate and nothing else. Here we render
// quodsi_studio's ScheduleModal, which is a SELF-CONTAINED overlay: it draws
// its own 900x640 card with its own header and close button, and owns all
// persistence itself -- including creating and linking a schedule the first
// time a generator has none (see ScheduleModal's own header comment,
// "Create-on-first-edit"). Consequences:
//   - `open` is always true. The Lucid modal's existence IS the open state;
//     there is no in-view toggle -- ScheduleModal unmounts everything it
//     owns (including its useSyncExternalStore subscription) when `open` is
//     false, which we never want here.
//   - `embedded` is set. ScheduleModal normally draws its own overlay: a
//     dimming scrim plus a fixed 900x640 card with border, shadow and
//     rounded corners. Here the HOST already supplies the modal -- a real,
//     chromeless Lucid modal sized by the user's own preference (medium
//     1000x640 by default) -- so that chrome would be doubled: a card
//     inside a card, a visible band of scrim between the two, and a second
//     scrollbar. `embedded` collapses it to a plain full-size surface, and
//     the h-full chain above it (index_new.css's `html, body, #root`, then
//     App's wrapper, then this view's) is what gives it a real height. That
//     chain was previously inert, because `fixed inset-0` escaped the flow.
//   - `onClose` must ask the HOST to close the Lucid modal, not flip local
//     state. CLOSE_MODAL is exactly this hook: StudioEmbedView's own close
//     button (`sendMessage(EnvelopeMessageType.CLOSE_MODAL)`) is the
//     existing precedent for a chromeless modal's content asking the host to
//     hide it, since a chromeless modal has no native title-bar X. Once the
//     host hides the modal it also fires ScheduleEditorModal's onClosed,
//     which releases the extension's open-guard -- none of that is this
//     view's concern.
//   - No lifecycle wiring here resembling ensurePatternForGenerator.
//     ScheduleModal creates+links the schedule itself on first edit; adding
//     an equivalent in this view would just race it.
import { useEffect, useMemo } from 'react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { ScheduleModal } from 'quodsi_studio/platforms/shared'
import { useMessaging } from '../../messaging/MessageProvider'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { createBufferingAccessor } from '../../adapters/bufferingAccessor'

/** Trailing debounce for host writes. Matches PatternEditorView's own constant. */
const SCHEDULE_EDITOR_DEBOUNCE_MS = 500

export function ScheduleEditorView() {
  const params = new URLSearchParams(window.location.search)
  const shapeId = params.get('shapeId') ?? ''

  const { sendMessage } = useMessaging()
  const { accessor: base, projection } = useModelRootSource()

  // Built once per `base` identity -- `base` is useModelRootSource's inner
  // `accessor` field, stable for the life of this component instance, NOT
  // the hook's own return value (a fresh `{ accessor, projection }` object
  // literal every render). Depending on the wrapper instead would rebuild
  // this on every render and break ScheduleModal's
  // useSyncExternalStore(accessor.subscribe, accessor.getSnapshot) contract.
  // See PatternEditorView's module header for the full explanation this
  // mirrors.
  const accessor = useMemo(
    () => createBufferingAccessor(base, { debounceMs: SCHEDULE_EDITOR_DEBOUNCE_MS }),
    [base],
  )

  // Mirrors PatternEditorView's identical cleanup: correct for the cases
  // where React really does unmount (a re-render swapping the view out, a
  // test's unmount()), which is NOT the Lucid-modal-close path -- see the
  // pagehide/beforeunload effect below for that.
  useEffect(() => {
    return () => {
      accessor.dispose()
    }
  }, [accessor])

  // THE CLOSE PATH. Closing this modal (via the CLOSE_MODAL send below, or
  // any other route the host offers) destroys this iframe's document
  // outright -- React never unmounts, so the cleanup above never runs in
  // production. Without these listeners the only thing that ever moved an
  // edit to the host was the debounce, so anything typed in the last
  // ~500ms before close was silently dropped. See PatternEditorView's own
  // comment for the full honesty-about-the-race writeup this mirrors
  // verbatim; nothing about that story changes for this view.
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
        <span className="text-xs text-secondary">Loading schedule…</span>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      <ScheduleModal
        open
        embedded
        onClose={() => sendMessage(EnvelopeMessageType.CLOSE_MODAL)}
        shapeId={shapeId}
        accessor={accessor}
      />
    </div>
  )
}
