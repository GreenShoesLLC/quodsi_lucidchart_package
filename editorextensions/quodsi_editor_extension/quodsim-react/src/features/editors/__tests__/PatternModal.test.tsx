import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PatternModal } from '../PatternModal'

function fakeAccessor() {
  // useSyncExternalStore requires getSnapshot to return a referentially
  // stable value between calls when nothing changed -- a fresh object
  // literal on every call sends React into "Maximum update depth exceeded".
  // Mirrors the stable-`state`-reference pattern used by Studio's own
  // GeneratorPatternTab.test.tsx.
  const snapshot = {
    modelDefinition: { generators: [], arrivalPatterns: [], model: {} } as any,
    saveStatus: 'idle' as const,
    saveError: null,
  }
  return {
    subscribe: () => () => {},
    getSnapshot: () => snapshot,
    updateShape: vi.fn().mockResolvedValue(undefined),
    updateModel: vi.fn().mockResolvedValue(undefined),
  }
}

describe('PatternModal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <PatternModal open={false} onClose={() => {}} shapeId="g1" accessor={fakeAccessor()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a labelled dialog when open', () => {
    render(<PatternModal open onClose={() => {}} shapeId="g1" accessor={fakeAccessor()} />)
    expect(screen.getByRole('dialog', { name: /arrival pattern/i })).toBeInTheDocument()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<PatternModal open onClose={onClose} shapeId="g1" accessor={fakeAccessor()} />)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does NOT close on backdrop click', () => {
    const onClose = vi.fn()
    render(<PatternModal open onClose={onClose} shapeId="g1" accessor={fakeAccessor()} />)
    fireEvent.click(screen.getByTestId('pattern-modal-backdrop'))
    expect(onClose).not.toHaveBeenCalled()
  })
})
