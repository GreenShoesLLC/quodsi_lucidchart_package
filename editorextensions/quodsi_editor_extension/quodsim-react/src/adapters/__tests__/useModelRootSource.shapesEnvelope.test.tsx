// Spec 2026-09-13 lucid-shape-writes §2: queued shape edits travel on the
// MODEL_ROOT_UPDATE envelope as `shapes`, clears as cleared fields.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { useModelRootSource, MODEL_ROOT_DEBOUNCE_MS } from '../useModelRootSource'

vi.mock('../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' } }),
}))

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('useModelRootSource — shapes on the envelope', () => {
  it('puts queued shape edits on MODEL_ROOT_UPDATE with clears as cleared fields', async () => {
    vi.useFakeTimers()
    const posted: any[] = []
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
      posted.push(envelope)
    })

    const { result } = renderHook(() => useModelRootSource())
    act(() => {
      window.dispatchEvent(new MessageEvent('message', {
        data: {
          id: 'snap-1',
          type: EnvelopeMessageType.MODEL_ROOT_SNAPSHOT,
          data: { projection: { pageId: 'page-1', generators: [], arrivalPatterns: [], activities: [{ id: 'act-1', name: 'Triage' }], model: {} } },
        },
      }))
    })

    await act(async () => {
      await result.current.accessor.updateShape('act-1', 'Activity', { name: 'Intake', queueRanking: undefined })
      await vi.advanceTimersByTimeAsync(MODEL_ROOT_DEBOUNCE_MS)
    })

    const update = posted.find((e) => e.type === EnvelopeMessageType.MODEL_ROOT_UPDATE)
    expect(update.data).toEqual({
      patch: {},
      basedOnPageId: 'page-1',
      shapes: [{ shapeId: 'act-1', type: 'Activity', patch: { name: 'Intake' }, clearedFields: ['queueRanking'] }],
    })
  })
})
