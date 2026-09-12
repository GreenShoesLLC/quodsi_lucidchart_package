// The Basic tab's draft on the one model-root accessor (spec 2026-09-12 §5),
// over the REAL hooks (useAutoSave, useFormSync, useSaveInFlight) and the real
// projection -> source -> accessor chain. Only the transport is faked.
import React from 'react'
import { screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react'
import { MODEL_FIELD_KEYS, ModelDefaults } from '@quodsi/lucid-shared'
import { definition, mountModelEditor } from './modelEditorSeam'

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, selection: {}, sendMessage: vi.fn() }),
}))

const nameInput = () => screen.getByPlaceholderText('Enter model name') as HTMLInputElement

function deferred() {
  let resolve!: () => void
  let reject!: (err: Error) => void
  const promise = new Promise<void>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

function typeName(value: string, blur = true) {
  fireEvent.change(nameInput(), { target: { value } })
  if (blur) fireEvent.blur(nameInput())
}

afterEach(() => cleanup())

describe('ModelEditor — Basic draft on the model-root accessor', () => {
  it('saves the settings patch (model fields minus id, defaults applied) with the snapshot page id', async () => {
    const { transport } = mountModelEditor(definition({ model: { seed: 0 } }))

    typeName('Renamed')

    await waitFor(() => expect(transport.send).toHaveBeenCalledTimes(1))
    const [patch, basedOnPageId] = transport.send.mock.calls[0]
    expect(Object.keys(patch).sort()).toEqual(MODEL_FIELD_KEYS.filter((key) => key !== 'id').sort())
    expect(patch).toMatchObject({ name: 'Renamed', seed: ModelDefaults.DEFAULT_SEED })
    expect(basedOnPageId).toBe('page-1')
  })

  it('keeps the typed value through its own echo and the equal host snapshot that follows', async () => {
    const { transport, pushSnapshot } = mountModelEditor()

    typeName('Renamed')
    await waitFor(() => expect(transport.send).toHaveBeenCalledTimes(1))
    await act(async () => {})
    act(() => pushSnapshot())

    expect(nameInput().value).toBe('Renamed')
  })

  it('resyncs when the model settings change elsewhere while the editor is idle', () => {
    const { pushSnapshot } = mountModelEditor()

    act(() => pushSnapshot({ name: 'From Advisor' }))

    expect(nameInput().value).toBe('From Advisor')
  })

  it('does not resync while an edit is pending', () => {
    const { pushSnapshot } = mountModelEditor()

    typeName('Mine', false)
    act(() => pushSnapshot({ name: 'From Advisor' }))

    expect(nameInput().value).toBe('Mine')
  })

  it('fires the trailing save after a slow save, and a stale snapshot landing during it does not reset the draft', async () => {
    const first = deferred()
    const second = deferred()
    const send = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { pushSnapshot } = mountModelEditor(definition(), { transport: { send } })

    typeName('A')
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    fireEvent.change(nameInput(), { target: { value: 'AB' } })

    await act(async () => { first.resolve() })
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    expect(send.mock.calls[1][0]).toMatchObject({ name: 'AB' })

    // The first save's snapshot arrives while the trailing save is in flight
    // and nothing is pending any more: only the in-flight guard protects "AB".
    act(() => pushSnapshot({ name: 'A' }))
    expect(nameInput().value).toBe('AB')

    await act(async () => { second.resolve() })
    expect(nameInput().value).toBe('AB')
    expect(send).toHaveBeenCalledTimes(2)
  })

  it('a rejected save keeps the typed value, even under the corrective snapshot, and says so', async () => {
    const { pushSnapshot } = mountModelEditor(definition(), {
      transport: { send: vi.fn().mockRejectedValue(new Error('Model changed on another page')) },
    })

    typeName('Mine')

    expect(await screen.findByText('Save failed — keep typing to retry')).toBeInTheDocument()
    act(() => pushSnapshot({ name: 'My Model' }))
    expect(nameInput().value).toBe('Mine')
  })

  it("catches the unmount flush's rejection", async () => {
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      const { transport, unmount } = mountModelEditor(definition(), {
        transport: { send: vi.fn().mockRejectedValue(new Error('Model changed on another page')) },
      })

      typeName('Mine', false)
      unmount()

      expect(transport.send).toHaveBeenCalledTimes(1)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(unhandled).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })

  // PRODUCTION ORDER. The host posts MODEL_ROOT_UPDATE_RESULT and then the
  // snapshot back-to-back, so the write settles and the snapshot is accepted
  // before React commits saving=false: the editor sees the new values while its
  // guard is still up, and nothing later carries different values.
  it('shows the page title once idle when the host stores it for a cleared name', async () => {
    const write = deferred()
    const send = vi.fn().mockReturnValueOnce(write.promise)
    const { pushSnapshot } = mountModelEditor(definition(), { transport: { send } })

    typeName('')
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    await act(async () => {
      write.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0))
      pushSnapshot({ name: 'Emergency Dept' })
    })

    await waitFor(() => expect(nameInput().value).toBe('Emergency Dept'))
    expect(send).toHaveBeenCalledTimes(1)
  })

  // The review's A/AB sequence: re-checking a skipped key once the guard drops
  // would re-extract the stale 'A' over the typed 'AB'.
  it('a stale snapshot that was in flight during the last save is not applied after the save settles', async () => {
    const first = deferred()
    const second = deferred()
    const send = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { pushSnapshot } = mountModelEditor(definition(), { transport: { send } })

    typeName('A')
    await waitFor(() => expect(send).toHaveBeenCalledTimes(1))
    fireEvent.change(nameInput(), { target: { value: 'AB' } })

    await act(async () => { first.resolve() })
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2))
    expect(send.mock.calls[1][0]).toMatchObject({ name: 'AB' })

    // Save 1's snapshot lands while the trailing save 'AB' is in flight.
    act(() => pushSnapshot({ name: 'A' }))

    await act(async () => {
      second.resolve()
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await act(async () => {})

    expect(nameInput().value).toBe('AB')
    expect(send).toHaveBeenCalledTimes(2)
  })
})
