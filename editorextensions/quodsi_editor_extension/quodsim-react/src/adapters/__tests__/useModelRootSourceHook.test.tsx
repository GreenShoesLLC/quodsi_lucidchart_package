// React-hook half of useModelRootSource. The pure createModelRootSource
// factory is covered in useModelRootSource.test.ts; this file exercises the
// hook's wiring to window.postMessage, mirroring the idiom (and test style)
// of usePortalSender / useUpgradeInterestSender.

import React, { useSyncExternalStore } from 'react'
import { render, screen, act } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

vi.mock('../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' } }),
}))

import { useModelRootSource, MODEL_ROOT_DEBOUNCE_MS } from '../useModelRootSource'

function Harness() {
  const { accessor, projection, request } = useModelRootSource()
  // Real consumers (e.g. GeneratorEditor) read the accessor's saveStatus via
  // useSyncExternalStore, not a one-off getSnapshot() call at render time --
  // do the same here so this harness re-renders when updateModel notifies.
  const state = useSyncExternalStore(accessor.subscribe, accessor.getSnapshot)
  return (
    <div>
      <div data-testid="projection">{projection ? 'has-projection' : 'no-projection'}</div>
      <div data-testid="pattern-count">{(projection as any)?.arrivalPatterns?.length ?? ''}</div>
      <div data-testid="save-status">{state.saveStatus}</div>
      <button
        onClick={() => {
          accessor.updateModel({ arrivalPatterns: [] }).catch(() => {})
        }}
      >
        save
      </button>
      <button
        onClick={() => {
          accessor.updateModel({ resources: [] }, { seizeRelease: 'remove' }).catch(() => {})
        }}
      >
        delete-remove
      </button>
      <button onClick={() => request()}>request</button>
    </div>
  )
}

function pushSnapshot(
  id = 'whatever-id',
  projection: Record<string, unknown> = { generators: [], arrivalPatterns: [], model: {}, pageId: 'page-1' },
) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { id, type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT, source: 'host', target: 'model-iframe', version: '1.0', data: { projection } },
      }),
    )
  })
}

function reply(envelope: any, data: Record<string, unknown>) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { id: envelope.id, type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT, source: 'host', target: 'model-iframe', version: '1.0', data },
    }),
  )
}

describe('useModelRootSource (hook)', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('sends a MODEL_ROOT_REQUEST envelope on mount', () => {
    const postMessageSpy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})

    render(<Harness />)

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: EnvelopeMessageType.MODEL_ROOT_REQUEST,
        source: 'model-iframe',
        target: 'host',
      }),
      '*',
    )
  })

  it('feeds an incoming MODEL_ROOT_SNAPSHOT into the projection and re-renders', () => {
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})

    render(<Harness />)
    expect(screen.getByTestId('projection').textContent).toBe('no-projection')

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: 'whatever-id',
            type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: { projection: { generators: [], arrivalPatterns: [], model: {} } },
          },
        }),
      )
    })

    expect(screen.getByTestId('projection').textContent).toBe('has-projection')
  })

  it('accepts a snapshot pushed with a DIFFERENT id than any outstanding request (post-write push)', () => {
    vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    render(<Harness />)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: {
            id: 'some-unrelated-write-id',
            type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: { projection: { generators: [], arrivalPatterns: [{ id: 'ap-1' }], model: {} } },
          },
        }),
      )
    })

    expect(screen.getByTestId('projection').textContent).toBe('has-projection')
  })

  it('batches updateModel into one MODEL_ROOT_UPDATE after the debounce and flips saveStatus to saved', async () => {
    vi.useFakeTimers()
    const posted: any[] = []
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      posted.push(envelope)
      if (envelope.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) reply(envelope, { success: true })
    })
    render(<Harness />)
    pushSnapshot()

    await act(async () => {
      screen.getByText('save').click()
      screen.getByText('save').click()
    })
    expect(posted.filter((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE)).toHaveLength(0)
    expect(screen.getByTestId('save-status').textContent).toBe('saving')

    await act(async () => { await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS) })

    const updates = posted.filter((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE)
    expect(updates).toHaveLength(1)
    expect(updates[0].data).toEqual({ patch: { arrivalPatterns: [] }, basedOnPageId: 'page-1' })
    expect(screen.getByTestId('save-status').textContent).toBe('saved')
  })

  it("flips saveStatus to failed when the host refuses the batch, and the corrective snapshot tagged with the write's id restores the stored value", async () => {
    vi.useFakeTimers()
    const stored = { generators: [], arrivalPatterns: [{ id: 'stored' }], model: {}, pageId: 'page-1' }
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      if (envelope.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
        reply(envelope, { success: false, errorMessage: 'boom' })
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { id: envelope.id, type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT, source: 'host', target: 'model-iframe', version: '1.0', data: { projection: stored } },
          }),
        )
      }
    })
    render(<Harness />)
    pushSnapshot('whatever-id', stored)

    await act(async () => { screen.getByText('save').click() })
    expect(screen.getByTestId('pattern-count').textContent).toBe('0')

    await act(async () => { await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS) })

    expect(screen.getByTestId('save-status').textContent).toBe('failed')
    expect(screen.getByTestId('pattern-count').textContent).toBe('1')
  })

  it('puts seizeRelease on the MODEL_ROOT_UPDATE envelope only when the write carries it', async () => {
    vi.useFakeTimers()
    const posted: any[] = []
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      posted.push(envelope)
      if (envelope.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) reply(envelope, { success: true })
    })
    render(<Harness />)
    pushSnapshot()

    await act(async () => { screen.getByText('delete-remove').click() })
    await act(async () => { screen.getByText('save').click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS) })

    const updates = posted.filter((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE)
    expect(updates[0].data).toEqual({ patch: { resources: [] }, basedOnPageId: 'page-1', seizeRelease: 'remove' })
    expect(updates[1].data).toEqual({ patch: { arrivalPatterns: [] }, basedOnPageId: 'page-1' })
  })

  it('marks a write with no reply failed and asks for a fresh snapshot', async () => {
    vi.useFakeTimers()
    const posted: any[] = []
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => { posted.push(envelope) })
    render(<Harness />)
    pushSnapshot()

    await act(async () => { screen.getByText('save').click() })
    await act(async () => { await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS + 30_000) })

    expect(screen.getByTestId('save-status').textContent).toBe('failed')
    expect(posted.filter((e) => e.type === EnvelopeMessageType.MODEL_ROOT_REQUEST)).toHaveLength(2)
  })

  it('returns request, which asks the host for another snapshot', () => {
    const postMessageSpy = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {})
    render(<Harness />)

    act(() => {
      screen.getByText('request').click()
    })

    const requests = postMessageSpy.mock.calls.filter(([envelope]) => (envelope as any)?.type === EnvelopeMessageType.MODEL_ROOT_REQUEST)
    expect(requests).toHaveLength(2)
  })
})
