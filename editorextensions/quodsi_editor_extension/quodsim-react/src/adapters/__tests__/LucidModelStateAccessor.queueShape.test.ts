// Spec 2026-09-13 lucid-shape-writes §2: the accessor queues Activity and
// Generator shape edits into the batching source and keeps Resource on the
// confirmed save.
import { describe, it, expect, vi } from 'vitest'
import { createLucidModelStateAccessor } from '../LucidModelStateAccessor'

function deps(overrides: Record<string, unknown> = {}) {
  return {
    getModelDefinition: () => null,
    onModelChanged: () => () => {},
    save: vi.fn().mockResolvedValue(undefined),
    queueShape: vi.fn().mockResolvedValue(undefined),
    getModelWriteStatus: () => ({ status: 'idle' as const, error: null }),
    ...overrides,
  }
}

describe('LucidModelStateAccessor.updateShape routing', () => {
  it('queues Activity and Generator edits and keeps Resource on the confirmed save', async () => {
    const d = deps()
    const accessor = createLucidModelStateAccessor(d as any)

    await accessor.updateShape('act-1', 'Activity', { capacity: 2 })
    await accessor.updateShape('gen-1', 'Generator', { name: 'G' })
    await accessor.updateShape('blk-1', 'Resource', { resourceId: 'r1' })

    expect(d.queueShape).toHaveBeenNthCalledWith(1, 'act-1', 'Activity', { capacity: 2 })
    expect(d.queueShape).toHaveBeenNthCalledWith(2, 'gen-1', 'Generator', { name: 'G' })
    expect(d.save).toHaveBeenCalledTimes(1)
    expect(d.save).toHaveBeenCalledWith('blk-1', 'Resource', { resourceId: 'r1' })
  })

  it('uses the confirmed save for every type when there is no queue', async () => {
    const d = deps({ queueShape: undefined })
    const accessor = createLucidModelStateAccessor(d as any)

    await accessor.updateShape('act-1', 'Activity', { capacity: 2 })

    expect(d.save).toHaveBeenCalledWith('act-1', 'Activity', { capacity: 2 })
  })

  it('records a refused queue as failed and rethrows it', async () => {
    const d = deps({ queueShape: vi.fn().mockRejectedValue(new Error('Model not loaded')) })
    const accessor = createLucidModelStateAccessor(d as any)

    await expect(accessor.updateShape('act-1', 'Activity', { capacity: 2 })).rejects.toThrow('Model not loaded')
    expect(accessor.getSnapshot().saveStatus).toBe('failed')
    expect(accessor.getSnapshot().saveError).toBe('Model not loaded')
  })
})
