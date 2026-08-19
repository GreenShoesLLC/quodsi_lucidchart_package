// React view rendered inside PatternEditorModal's real Lucid modal
// (?view=pattern&shapeId=...), the host-side modal Task 2 introduced.
//
// This is the FIRST production consumer of createBufferingAccessor (Task 1):
// unlike PatternModal (the old in-panel host, which shares the panel's own
// accessor in-process), this view runs in its own iframe/JS realm and every
// edit crosses postMessage into the extension host. Wrapping the base
// accessor keeps typing feeling local while writes settle on a trailing
// debounce -- see bufferingAccessor.ts's module header for the overlay
// design this relies on.
//
// REFERENCE STABILITY. GeneratorPatternTab reads its accessor via
// useSyncExternalStore(accessor.subscribe, accessor.getSnapshot), which
// throws if getSnapshot returns a different object across renders with no
// intervening change. That means the wrapped accessor must be built ONCE per
// mount and reused -- never rebuilt on every render. useModelRootSource's
// `accessor` return value is already stable for the life of the component
// instance (it is cached behind a useRef + useMemo pinned to that ref, see
// useModelRootSource.ts), so depending on it in our own useMemo below does
// not defeat the memo the way depending on the hook's whole return object
// (a fresh `{ accessor, projection }` literal every render) would.
//
// UNMOUNT. dispose() is called from a useEffect cleanup -- not left
// incidental -- specifically because a user who types and immediately closes
// the modal must not lose the edit. dispose() itself performs a
// fire-and-forget final flush before tearing down (see its own doc comment):
// it promotes whatever is pending into a batch SYNCHRONOUSLY, but the actual
// base.updateShape/updateModel call (and the window.parent.postMessage
// inside it) runs on the next microtask via the accessor's internal flush
// queue, not synchronously inside this cleanup. Once that postMessage call
// does fire, delivery to the parent window does not depend on this iframe
// surviving -- the browser hands the message to window.parent's queue
// independent of the sender's later teardown. The real risk window is
// therefore narrow but real: if the host removes this iframe from the DOM
// (destroying its JS realm) before that queued microtask gets a turn, the
// write is silently lost -- dispose()'s fire-and-forget flush has no one
// left to report a failure to. Nothing in this codebase proves Lucid keeps
// the iframe alive long enough for a same-tick microtask to run before
// teardown; this is a documented risk, not a verified guarantee.
import { useEffect, useMemo } from 'react'
import { GeneratorPatternTab } from 'quodsi_studio/platforms/shared'
import { useModelRootSource } from '../../adapters/useModelRootSource'
import { createBufferingAccessor } from '../../adapters/bufferingAccessor'

/** Trailing debounce for host writes. Matches Task 1's own default example. */
const PATTERN_EDITOR_DEBOUNCE_MS = 500

export function PatternEditorView() {
  const params = new URLSearchParams(window.location.search)
  const shapeId = params.get('shapeId') ?? ''

  const { accessor: base, projection } = useModelRootSource()

  // Built once per `base` identity. `base` is stable for the life of this
  // component instance (see the module header above), so this effectively
  // runs once -- exactly what GeneratorPatternTab's useSyncExternalStore
  // needs.
  const accessor = useMemo(
    () => createBufferingAccessor(base, { debounceMs: PATTERN_EDITOR_DEBOUNCE_MS }),
    [base],
  )

  useEffect(() => {
    // Deliberate, not incidental: dispose() on unmount is what guarantees a
    // user who types and immediately closes the modal does not lose the
    // edit -- see the module header for what this call does and does not
    // guarantee once the iframe itself is torn down.
    return () => {
      accessor.dispose()
    }
  }, [accessor])

  if (!projection) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-surface">
        <span className="text-xs text-secondary">Loading pattern…</span>
      </div>
    )
  }

  return (
    <div className="h-full w-full overflow-auto bg-surface p-4">
      <GeneratorPatternTab shapeId={shapeId} accessor={accessor} showLevers={false} />
    </div>
  )
}
