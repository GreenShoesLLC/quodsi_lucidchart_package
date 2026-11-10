// The model panel's bridge to the expression builder modal (spec 2026-11-10):
// OPEN goes out with a fresh requestId, and the promise settles on the
// RESULT with that requestId.
import { renderHook, act, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { StateOperation, StateType, type ExpressionBuilderRequest } from '@quodsi/shared'

const h = vi.hoisted(() => ({ sendMessage: vi.fn() }))
vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ sendMessage: h.sendMessage }),
}))

import { useExpressionBuilderBridge } from '../useExpressionBuilderBridge'

const request: ExpressionBuilderRequest = {
  expression: 'qty + 1',
  target: { name: 'qty', dataType: StateType.NUMBER, operation: StateOperation.ASSIGN },
  states: [],
}

/** The requestId of the n-th OPEN sent. */
const openedId = (n: number): string => h.sendMessage.mock.calls[n][1].requestId

function deliverResult(requestId: string, expression: string | null) {
  window.dispatchEvent(new MessageEvent('message', {
    data: {
      id: 'host-1', type: EnvelopeMessageType.EXPRESSION_BUILDER_RESULT,
      source: 'host', target: 'model-iframe', version: '1.0',
      data: { requestId, expression },
    },
  }))
}

beforeEach(() => h.sendMessage.mockClear())
afterEach(() => cleanup())

describe('useExpressionBuilderBridge', () => {
  it('resolves with the matching result', async () => {
    const { result } = renderHook(() => useExpressionBuilderBridge())
    let promise!: Promise<string | null>
    act(() => { promise = result.current(request) })

    expect(h.sendMessage).toHaveBeenCalledTimes(1)
    expect(h.sendMessage.mock.calls[0][0]).toBe(EnvelopeMessageType.OPEN_EXPRESSION_BUILDER)
    expect(h.sendMessage.mock.calls[0][1]).toMatchObject({ request })
    const id = openedId(0)
    expect(id).toEqual(expect.any(String))

    const settled = vi.fn()
    void promise.then(settled)
    deliverResult('someone-else', 'wrong')
    await Promise.resolve()
    expect(settled).not.toHaveBeenCalled()

    deliverResult(id, 'qty * 2')
    await expect(promise).resolves.toBe('qty * 2')
  })

  it('resolves an earlier pending request with null', async () => {
    const { result } = renderHook(() => useExpressionBuilderBridge())
    let first!: Promise<string | null>
    let second!: Promise<string | null>
    act(() => { first = result.current(request) })
    act(() => { second = result.current(request) })

    await expect(first).resolves.toBeNull()
    expect(openedId(1)).not.toBe(openedId(0))

    deliverResult(openedId(1), 'qty')
    await expect(second).resolves.toBe('qty')
  })

  it('resolves a pending request with null when the editor unmounts', async () => {
    const { result, unmount } = renderHook(() => useExpressionBuilderBridge())
    let promise!: Promise<string | null>
    act(() => { promise = result.current(request) })
    unmount()
    await expect(promise).resolves.toBeNull()
  })
})
