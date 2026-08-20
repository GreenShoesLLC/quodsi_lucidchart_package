import { describe, it, expect, vi } from 'vitest'
import { createModelRootSource } from '../useModelRootSource'

describe('createModelRootSource', () => {
  it('returns null before any snapshot arrives', () => {
    const source = createModelRootSource({ send: vi.fn() })
    expect(source.deps.getModelDefinition()).toBeNull()
  })

  it('returns a STABLE reference between snapshots', () => {
    const source = createModelRootSource({ send: vi.fn() })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {} })

    const a = source.deps.getModelDefinition()
    const b = source.deps.getModelDefinition()
    expect(a).toBe(b)
  })

  it('returns a NEW reference after a new snapshot', () => {
    const source = createModelRootSource({ send: vi.fn() })
    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {} })
    const a = source.deps.getModelDefinition()

    source.acceptSnapshot({ generators: [], arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], model: {} })
    const b = source.deps.getModelDefinition()

    expect(b).not.toBe(a)
    expect((b as any).arrivalPatterns).toHaveLength(1)
  })

  it('notifies listeners when a snapshot arrives', () => {
    const source = createModelRootSource({ send: vi.fn() })
    const listener = vi.fn()
    source.deps.onModelChanged(listener)

    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {} })

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('stops notifying after unsubscribe', () => {
    const source = createModelRootSource({ send: vi.fn() })
    const listener = vi.fn()
    const off = source.deps.onModelChanged(listener)
    off()

    source.acceptSnapshot({ generators: [], arrivalPatterns: [], model: {} })

    expect(listener).not.toHaveBeenCalled()
  })

  it('sends the WHOLE patch verbatim through saveModel', async () => {
    const send = vi.fn().mockResolvedValue(undefined)
    const source = createModelRootSource({ send })

    await source.deps.saveModel!({ arrivalPatterns: [{ id: 'ap-1', name: 'P1' }], future: 42 })

    expect(send).toHaveBeenCalledWith({
      arrivalPatterns: [{ id: 'ap-1', name: 'P1' }],
      future: 42,
    })
  })
})
