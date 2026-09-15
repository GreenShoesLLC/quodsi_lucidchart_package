import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { FLUSH_BEFORE_SEND, useSendMessage } from '../useSendMessage'
import { registerModelRootSource, resetModelRootWritesForTests } from '../../../adapters/modelRootWrites'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => { resolve = res })
  return { promise, resolve }
}

function setup() {
  const posted: Array<{ type: string }> = []
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => { posted.push(envelope) })
  const { result } = renderHook(() => useSendMessage({ app: { panelType: 'model' } }, vi.fn()))
  return { send: result.current, types: () => posted.map((e) => e.type) }
}

afterEach(() => {
  resetModelRootWritesForTests()
  vi.restoreAllMocks()
})

describe('useSendMessage — flush before sends that read the stored model', () => {
  it('waits for pending model-root writes before posting a listed message', async () => {
    const write = deferred()
    registerModelRootSource({ hasPendingWrites: () => true, flush: vi.fn(() => write.promise) })
    const { send, types } = setup()

    send(EnvelopeMessageType.OPEN_STUDIES_MODAL, { documentId: 'd', pageId: 'p' })
    expect(types()).toEqual([])

    write.resolve()
    await vi.waitFor(() => expect(types()).toEqual([EnvelopeMessageType.OPEN_STUDIES_MODAL]))
  })

  it('still posts the listed message when the flush is refused', async () => {
    registerModelRootSource({ hasPendingWrites: () => true, flush: vi.fn().mockRejectedValue(new Error('refused')) })
    const { send, types } = setup()

    send(EnvelopeMessageType.MODEL_RUN_REQUEST, { documentId: 'd' })

    await vi.waitFor(() => expect(types()).toEqual([EnvelopeMessageType.MODEL_RUN_REQUEST]))
  })

  it('posts a listed message at once when nothing is pending', () => {
    const flush = vi.fn()
    registerModelRootSource({ hasPendingWrites: () => false, flush })
    const { send, types } = setup()

    send(EnvelopeMessageType.OPEN_PATTERN_MODAL, { shapeId: 'g1' })

    expect(types()).toEqual([EnvelopeMessageType.OPEN_PATTERN_MODAL])
    expect(flush).not.toHaveBeenCalled()
  })

  it('posts an unlisted message at once even with writes pending', () => {
    const flush = vi.fn()
    registerModelRootSource({ hasPendingWrites: () => true, flush })
    const { send, types } = setup()

    send(EnvelopeMessageType.ELEMENT_SELECT, { elementId: 'a1' })

    expect(types()).toEqual([EnvelopeMessageType.ELEMENT_SELECT])
    expect(flush).not.toHaveBeenCalled()
  })

  it('maps panelType diagram-mapping to source diagram-mapping-iframe', () => {
    const posted: Array<{ source: string }> = []
    vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => { posted.push(envelope) })
    const { result } = renderHook(() => useSendMessage({ app: { panelType: 'diagram-mapping' } }, vi.fn()))

    result.current(EnvelopeMessageType.ANALYZE_PAGE, { requestId: 1 })

    expect(posted).toHaveLength(1)
    expect(posted[0].source).toBe('diagram-mapping-iframe')
  })

  it('lists exactly the messages whose host handler reads the stored model', () => {
    expect([...FLUSH_BEFORE_SEND].sort()).toEqual(
      [
        EnvelopeMessageType.MODEL_RUN_REQUEST,
        EnvelopeMessageType.MODEL_VALIDATE,
        EnvelopeMessageType.MODEL_JSON_REQUEST,
        EnvelopeMessageType.RUN_SCENARIO,
        EnvelopeMessageType.OPEN_STUDIES_MODAL,
        EnvelopeMessageType.OPEN_ADVISOR_MODAL,
        EnvelopeMessageType.OPEN_DIAGRAM_MAPPING_MODAL,
        EnvelopeMessageType.OPEN_PATTERN_MODAL,
        EnvelopeMessageType.OPEN_SCHEDULE_MODAL,
        EnvelopeMessageType.OPEN_WORK_SCHEDULE_MODAL,
      ].sort(),
    )
  })
})
