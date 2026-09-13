// PatternEditorView.realSource.test.tsx
//
// The Arrival Pattern modal's close path over the REAL useModelRootSource
// (final review I1, spec 2026-09-13 lucid-shape-writes). PatternEditorView.test.tsx
// mocks the base accessor, whose writes complete when they resolve; the real
// one queues a Generator shape edit in the batching source and resolves at
// once. Closing the modal fires `pagehide`: the panel-wide registry flushes
// the (still empty) source first, THEN the view's own listener flushes the
// buffered volume -- so that flush must carry the edit all the way to
// postMessage inside the same task, with no timer allowed to help.
import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, act, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { resetModelRootWritesForTests } from '../../../adapters/modelRootWrites'

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'pattern' }, sendMessage: vi.fn() }),
}))

let lastProps: any = null
vi.mock('quodsi_studio/platforms/shared', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  GeneratorPatternTab: (props: any) => {
    lastProps = props
    return <div data-testid="pattern-tab">{props.shapeId}</div>
  },
}))

// eslint-disable-next-line import/first
import { PatternEditorView } from '../PatternEditorView'

function installHost() {
  const posted: any[] = []
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
    posted.push(envelope)
    if (envelope?.type === EnvelopeMessageType.MODEL_ROOT_UPDATE) {
      window.dispatchEvent(new MessageEvent('message', {
        data: { id: envelope.id, type: EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT, data: { success: true } },
      }))
    }
  })
  return posted
}

function pushSnapshot() {
  act(() => {
    window.dispatchEvent(new MessageEvent('message', {
      data: {
        id: 'snap-1',
        type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
        data: {
          projection: {
            pageId: 'page-1',
            generators: [{ id: 'g1', name: 'Arrivals', mode: 'pattern', arrivalPatternId: 'ap-1', volume: 100 }],
            arrivalPatterns: [{ id: 'ap-1', name: 'Arrivals pattern' }],
            model: {},
          },
        },
      },
    }))
  })
}

async function flushMicrotasks() {
  for (let i = 0; i < 50; i++) await Promise.resolve()
}

const updates = (posted: any[]) => posted.filter((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE)

describe('PatternEditorView over the real model-root source', () => {
  beforeEach(() => {
    lastProps = null
    vi.useFakeTimers()
  })
  afterEach(() => {
    cleanup()
    resetModelRootWritesForTests()
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('posts a volume edit made just before close on pagehide, with no timer advanced', async () => {
    window.history.replaceState({}, '', '/?view=pattern&shapeId=g1')
    const posted = installHost()
    render(<PatternEditorView />)
    pushSnapshot()
    expect(lastProps).not.toBeNull()

    act(() => {
      void lastProps.accessor.updateShape('g1', 'Generator', { volume: 42 })
    })
    expect(updates(posted)).toHaveLength(0)

    await act(async () => {
      window.dispatchEvent(new Event('pagehide'))
      await flushMicrotasks()
    })

    expect(updates(posted).map((e) => e.data.shapes)).toEqual([
      [{ shapeId: 'g1', type: 'Generator', patch: { volume: 42 }, clearedFields: [] }],
    ])
  })
})
