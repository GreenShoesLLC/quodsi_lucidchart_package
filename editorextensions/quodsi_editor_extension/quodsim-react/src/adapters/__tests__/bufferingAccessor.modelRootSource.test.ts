// bufferingAccessor.modelRootSource.test.ts
//
// The buffering accessor over the REAL batching model-root source (final
// review I1, spec 2026-09-13 lucid-shape-writes). Since that spec a Generator
// `updateShape` on the base accessor queues into the source and resolves at
// once, so a SHAPE-ONLY buffered batch (the Arrival Pattern modal's volume)
// is not stored until the source is flushed. Without that flush the edit
// sits behind the source's 0.4 s pause -- and is lost when the modal's realm
// dies on close -- while flush() cheerfully reports it written.
//
// bufferingAccessor.test.ts drives a mocked base whose writes complete when
// they resolve, which is exactly why it cannot see this.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { Mock } from 'vitest'
import { createBufferingAccessor } from '../bufferingAccessor'
import { createModelRootSource } from '../useModelRootSource'
import type { ModelRootTransport } from '../useModelRootSource'
import { createLucidModelStateAccessor } from '../LucidModelStateAccessor'

type Send = ModelRootTransport['send']

const SNAPSHOT = {
  pageId: 'page-1',
  generators: [{ id: 'g1', name: 'Arrivals', mode: 'pattern', arrivalPatternId: 'ap-1', volume: 100 }],
  arrivalPatterns: [],
  model: {},
} as any

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => { resolve = res })
  return { promise, resolve }
}

// Drains the promise chain between flush() and transport.send without
// touching a single timer: "posted" here means posted inside the task that
// called flush(), before a realm teardown could run.
async function flushMicrotasks() {
  for (let i = 0; i < 50; i++) await Promise.resolve()
}

function realChain(send: Mock<Send>) {
  const source = createModelRootSource({ send })
  source.acceptSnapshot(SNAPSHOT)
  const base = createLucidModelStateAccessor(source.deps)
  const buffered = createBufferingAccessor(base, { debounceMs: 500 })
  return { source, buffered }
}

const volumeShape = (volume: number) => [
  { shapeId: 'g1', type: 'Generator', patch: { volume }, clearedFields: [] },
]

describe('createBufferingAccessor over the real model-root source', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('flush() posts a shape-only buffered edit at once and resolves only when the host confirms it', async () => {
    const write = deferred()
    const send = vi.fn<Send>().mockReturnValueOnce(write.promise)
    const { buffered } = realChain(send)

    void buffered.updateShape('g1', 'Generator', { volume: 42 })
    let flushed = false
    const done = buffered.flush().then(() => { flushed = true })

    // No timer has moved: the source's 0.4 s pause cannot have sent it.
    await flushMicrotasks()
    expect(send).toHaveBeenCalledTimes(1)
    expect(send.mock.calls[0][4]).toEqual(volumeShape(42))
    expect(flushed).toBe(false)

    write.resolve()
    await done
    expect(flushed).toBe(true)
  })

  // A refusal reaches rollback() and the close path is told. What rollback()
  // can NOT do over this base is hold the edit for a retry: the source shows a
  // queued edit at once, so the buffer's value reconcile has already retired
  // the in-flight entry before the host answers (true of model edits since
  // the 2026-09-12 batching too). The host's corrective snapshot then shows
  // the stored value -- the same outcome as a refused edit in the panel.
  it('a refused shape-only batch rejects flush(), keeps reporting it, and leaves the stored value to show', async () => {
    const send = vi.fn<Send>().mockRejectedValue(new Error('storage write failed'))
    const { source, buffered } = realChain(send)

    void buffered.updateShape('g1', 'Generator', { volume: 42 })
    await expect(buffered.flush()).rejects.toThrow('storage write failed')
    expect(send).toHaveBeenCalledTimes(1)

    // Nothing new to send: flush() still says the last write failed.
    await expect(buffered.flush()).rejects.toThrow('storage write failed')
    expect(send).toHaveBeenCalledTimes(1)

    // The corrective snapshot, tagged with the refused batch: nothing left in
    // either overlay masks the stored value.
    source.acceptSnapshot(SNAPSHOT, send.mock.calls[0][3])
    expect((buffered.getSnapshot().modelDefinition as any).generators[0].volume).toBe(100)
  })
})
