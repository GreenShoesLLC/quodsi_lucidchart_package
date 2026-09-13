// Typing a resource name writes the whole resources list through the
// model-root source on every keystroke. Batched (spec 2026-09-12
// lucid-model-root-batching): every character shows at once, and a pause
// sends ONE update carrying the whole name.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react'
import { ResourcesEditor } from 'quodsi_studio/platforms/shared'
import { MODEL_ROOT_DEBOUNCE_MS } from '../../../adapters/useModelRootSource'
import { definition, modelRootSeam } from './modelEditorSeam'

describe('ResourcesEditor name typing on the batched model-root source', () => {
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows every keystroke at once and sends one update per pause', async () => {
    vi.useFakeTimers()
    const { accessor, transport } = modelRootSeam(definition({ resources: [{ id: 'r1', name: 'N', capacity: 1 }] }))
    render(<ResourcesEditor accessor={accessor} />)
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    for (const [from, to] of [['N', 'Nu'], ['Nu', 'Nur'], ['Nur', 'Nurs'], ['Nurs', 'Nurse']]) {
      fireEvent.change(screen.getByDisplayValue(from), { target: { value: to } })
      expect(screen.getByDisplayValue(to)).toBeInTheDocument()
    }
    expect(transport.send).not.toHaveBeenCalled()

    await act(async () => { await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS) })

    expect(transport.send).toHaveBeenCalledTimes(1)
    const [patch] = transport.send.mock.calls[0] as [{ resources: Array<{ id: string; name: string }> }]
    expect(Object.keys(patch)).toEqual(['resources'])
    expect(patch.resources.find((r) => r.id === 'r1')?.name).toBe('Nurse')
  })
})
