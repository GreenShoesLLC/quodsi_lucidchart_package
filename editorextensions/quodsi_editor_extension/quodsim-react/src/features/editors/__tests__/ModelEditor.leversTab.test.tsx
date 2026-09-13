// The shared Model editor's Levers tab in Lucid's host (final-fix brief
// 2026-09-13, Fix 2): toggling a lever must reach the Lucid model-root
// source (and so the extension) as a `{ levers }` model-root update. This
// pins the coverage the deleted Lucid-fork test
// (ModelEditor.levers.test.tsx, removed when Lucid un-forked
// LeverAuthoringSection onto the shared component) used to give, over the
// REAL projectModelRoot -> createModelRootSource -> accessor chain.
import { describe, it, expect, afterEach, beforeEach } from 'vitest'
import { screen, fireEvent, act, cleanup } from '@testing-library/react'
import { setView } from 'quodsi_studio/platforms/shared'

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, selection: {}, sendMessage: vi.fn() }),
}))

import { mountModelEditor } from './modelEditorSeam'

describe('Model editor — Levers tab (host write, final-fix brief 2026-09-13 Fix 2)', () => {
  // model.tab.levers is 'intermediate' (viewSurfaceMaps.ts).
  beforeEach(() => setView('intermediate'))
  afterEach(() => {
    cleanup()
    setView('basic')
  })

  it('toggling a lever sends a model-root update whose payload carries levers', async () => {
    const { transport, source } = mountModelEditor()

    fireEvent.click(screen.getByRole('tab', { name: 'Levers' }))
    fireEvent.click(screen.getByLabelText(/use Replications as a scenario lever/i))

    expect((screen.getByLabelText(/use Replications as a scenario lever/i) as HTMLInputElement).checked).toBe(true)

    await act(async () => {
      await source.flush()
    })

    expect(transport.send).toHaveBeenCalledTimes(1)
    const payload = transport.send.mock.calls[0][0] as { levers: unknown[] }
    expect(payload.levers).toHaveLength(1)
  })

  it('a refused model-root write shows the host message in the shared header save status', async () => {
    const { transport, source } = mountModelEditor(undefined, {
      transport: { send: vi.fn().mockRejectedValue(new Error('The model page changed')) },
    })

    fireEvent.click(screen.getByRole('tab', { name: 'Levers' }))
    fireEvent.click(screen.getByLabelText(/use Replications as a scenario lever/i))

    await act(async () => {
      await source.flush().catch(() => {})
    })

    const status = screen.getByText('Save failed')
    expect(status).toHaveAttribute('title', 'The model page changed')
    expect(transport.send).toHaveBeenCalled()
  })
})
