import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mirrors bufferingAccessor.test.ts's own `makeBase` helper: a fake base
// ModelStateAccessor with a referentially-stable snapshot (required by
// useSyncExternalStore) and spy-able writes.
function makeBase(initial: any = { generators: [], arrivalPatterns: [], model: {} }) {
  let def = initial
  const listeners = new Set<() => void>()
  let snap: any = { modelDefinition: def, saveStatus: 'idle', saveError: null }
  const notifyAll = () => listeners.forEach((l) => l())

  const write = async (..._args: unknown[]): Promise<void> => {
    snap = { modelDefinition: def, saveStatus: 'saving', saveError: null }
    notifyAll()
    snap = { modelDefinition: def, saveStatus: 'saved', saveError: null }
    notifyAll()
  }

  return {
    accessor: {
      subscribe: (l: () => void) => {
        listeners.add(l)
        return () => listeners.delete(l)
      },
      getSnapshot: () => snap,
      updateShape: vi.fn(write),
      updateModel: vi.fn(write),
    },
  }
}

// `baseAccessor` / `currentProjection` are reassigned per-test in beforeEach;
// the mock factory below closes over them rather than capturing a snapshot,
// so each test controls what useModelRootSource "returns" to the view.
let baseAccessor: ReturnType<typeof makeBase>['accessor']
let currentProjection: unknown = null

vi.mock('../../../adapters/useModelRootSource', () => ({
  // Deliberately returns a BRAND NEW wrapper object on every call, exactly
  // like the real hook (`return { accessor, projection }` is a fresh object
  // literal each render even though `accessor` itself is stable) -- so a
  // reference-stability test here is only trustworthy if it survives that.
  useModelRootSource: () => ({ accessor: baseAccessor, projection: currentProjection }),
}))

// Stub the heavy shared editor so this test targets the view's own plumbing
// (URL read, loading gate, accessor wiring, unmount flush) rather than
// GeneratorPatternTab's own behaviour, which has its own suite in
// quodsi_studio. Mirrors the mocking approach in
// StudioEmbedView.test.tsx (stub EmbeddedStudioFrame, assert what it was
// handed).
let lastProps: any = null
vi.mock('quodsi_studio/platforms/shared', () => ({
  GeneratorPatternTab: (props: any) => {
    lastProps = props
    return <div data-testid="pattern-tab">{props.shapeId}</div>
  },
}))

// eslint-disable-next-line import/first
import { PatternEditorView } from '../PatternEditorView'

function setSearch(qs: string) {
  window.history.replaceState({}, '', `/?${qs}`)
}

beforeEach(() => {
  lastProps = null
  currentProjection = null
  baseAccessor = makeBase().accessor
})

describe('PatternEditorView', () => {
  it('renders a loading placeholder while the projection is null, and never mounts the editor', () => {
    setSearch('view=pattern&shapeId=g1')
    currentProjection = null

    render(<PatternEditorView />)

    expect(screen.getByText(/loading pattern/i)).toBeInTheDocument()
    expect(screen.queryByTestId('pattern-tab')).toBeNull()
    expect(lastProps).toBeNull()
  })

  it('reads shapeId from the URL and passes it (plus showLevers=false) to GeneratorPatternTab once the projection arrives', () => {
    setSearch('view=pattern&shapeId=g42')
    currentProjection = { generators: [], arrivalPatterns: [], model: {} }

    render(<PatternEditorView />)

    expect(screen.getByTestId('pattern-tab')).toHaveTextContent('g42')
    expect(lastProps.shapeId).toBe('g42')
    expect(lastProps.showLevers).toBe(false)
  })

  it('builds the buffering accessor ONCE and hands GeneratorPatternTab the SAME reference across re-renders', () => {
    setSearch('view=pattern&shapeId=g1')
    currentProjection = { generators: [], arrivalPatterns: [], model: {} }

    const { rerender } = render(<PatternEditorView />)
    const accessor1 = lastProps.accessor
    expect(accessor1).toBeDefined()

    // A second render pass with an UNCHANGED base accessor. useModelRootSource
    // (mocked above) hands back a fresh `{ accessor, projection }` object
    // every call, so this would fail if the view's own useMemo depended on
    // that wrapper instead of the stable `accessor` field inside it --
    // exactly the "useMemo dependency changes identity every render" trap
    // called out in the task brief.
    rerender(<PatternEditorView />)
    const accessor2 = lastProps.accessor

    expect(accessor2).toBe(accessor1)
  })

  it('rebuilds the accessor if the underlying base accessor identity actually changes', () => {
    setSearch('view=pattern&shapeId=g1')
    currentProjection = { generators: [], arrivalPatterns: [], model: {} }

    const { rerender } = render(<PatternEditorView />)
    const accessor1 = lastProps.accessor

    baseAccessor = makeBase().accessor
    rerender(<PatternEditorView />)
    const accessor2 = lastProps.accessor

    expect(accessor2).not.toBe(accessor1)
  })

  it('flushes a pending edit through to the base accessor on unmount, so closing right after typing does not lose it', async () => {
    setSearch('view=pattern&shapeId=g1')
    currentProjection = { generators: [], arrivalPatterns: [], model: {} }

    const { unmount } = render(<PatternEditorView />)

    // Simulate a user edit exactly as the real GeneratorPatternTab would
    // make it: through the wrapped (buffering) accessor handed to it.
    act(() => {
      void lastProps.accessor.updateShape('g1', 'Generator', { volume: 42 })
    })

    // Not written yet -- the buffering accessor debounces (500ms) and we
    // have not advanced past it.
    expect(baseAccessor.updateShape).not.toHaveBeenCalled()

    unmount()

    // dispose()'s fire-and-forget flush promotes the pending batch
    // synchronously but sends it on the next microtask -- so this needs to
    // wait a tick, not assert synchronously.
    await waitFor(() => {
      expect(baseAccessor.updateShape).toHaveBeenCalledWith('g1', 'Generator', { volume: 42 })
    })
  })
})
