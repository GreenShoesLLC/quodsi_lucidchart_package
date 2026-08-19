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

import { useModelRootSource } from '../useModelRootSource'

function Harness() {
  const { accessor, projection } = useModelRootSource()
  // Real consumers (e.g. GeneratorEditor) read the accessor's saveStatus via
  // useSyncExternalStore, not a one-off getSnapshot() call at render time --
  // do the same here so this harness re-renders when updateModel notifies.
  const state = useSyncExternalStore(accessor.subscribe, accessor.getSnapshot)
  return (
    <div>
      <div data-testid="projection">{projection ? 'has-projection' : 'no-projection'}</div>
      <div data-testid="save-status">{state.saveStatus}</div>
      <button
        onClick={() => {
          accessor.updateModel({ arrivalPatterns: [] }).catch(() => {})
        }}
      >
        save
      </button>
    </div>
  )
}

describe('useModelRootSource (hook)', () => {
  afterEach(() => {
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

  it('updateModel round-trips through MODEL_ROOT_UPDATE / MODEL_ROOT_UPDATE_RESULT and flips saveStatus to saved', async () => {
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      if (envelope.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              id: envelope.id,
              type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
              source: 'host',
              target: 'model-iframe',
              version: '1.0',
              data: { success: true },
            },
          }),
        )
      }
    })

    render(<Harness />)

    await act(async () => {
      screen.getByText('save').click()
      await Promise.resolve()
    })

    expect(screen.getByTestId('save-status').textContent).toBe('saved')
  })

  it('updateModel rejects and flips saveStatus to failed when the host reports failure', async () => {
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      if (envelope.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: {
              id: envelope.id,
              type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
              source: 'host',
              target: 'model-iframe',
              version: '1.0',
              data: { success: false, errorMessage: 'boom' },
            },
          }),
        )
      }
    })

    render(<Harness />)

    await act(async () => {
      screen.getByText('save').click()
      await Promise.resolve()
    })

    expect(screen.getByTestId('save-status').textContent).toBe('failed')
  })
})
