import { ModelSyncError } from 'quodsi_studio/platforms/lucid-host'
import { syncModelOnce } from '../modelSync'
import { makeFakeHost } from './fakeModalHost'
import type { LucidModalHost } from '../lucidModalHost'

function setup() {
  const host = makeFakeHost({ send: vi.fn() })
  const onResult = vi.fn()
  const p = syncModelOnce(host as unknown as LucidModalHost, { documentId: 'd1', pageId: 'p1' }, onResult)
  return { host, onResult, p }
}

describe('syncModelOnce', () => {
  it('asks for a resync of its page and resolves on {synced:true}', async () => {
    const { host, onResult, p } = setup()
    expect((host.requestModelSync.mock.calls[0] as unknown[])[1]).toEqual({ documentId: 'd1', pageId: 'p1' })
    host.sync.emit({ modelId: 'm1', synced: true })
    await expect(p).resolves.toBeUndefined()
    expect(onResult).toHaveBeenCalledWith({ modelId: 'm1', synced: true })
    expect(host.sync.unsubscribe).toHaveBeenCalled()
  })

  it('with a userMessage, rejects with a ModelSyncError carrying it (a line meant for her)', async () => {
    const { host, p } = setup()
    host.sync.emit({ synced: false, error: 'other page', userMessage: 'Go back to Page 1.' })
    const e = await p.catch((err: unknown) => err)
    expect(e).toBeInstanceOf(ModelSyncError)
    expect((e as Error).message).toBe('Go back to Page 1.')
  })

  it("with only an error, rejects with a plain Error (the task shows its own line)", async () => {
    const { host, p } = setup()
    host.sync.emit({ synced: false, error: 'no pending Studies open' })
    const e = await p.catch((err: unknown) => err)
    expect(e).toBeInstanceOf(Error)
    expect(e).not.toBeInstanceOf(ModelSyncError)
    expect((e as Error).message).toBe('no pending Studies open')
  })

  it('rejects on the timeout with a plain Error, and still delivers a late reply', async () => {
    const { host, onResult, p } = setup()
    host.sync.emit({ synced: false, error: 'The extension did not answer.' })
    const e = await p.catch((err: unknown) => err)
    expect(e).toBeInstanceOf(Error)
    expect(e).not.toBeInstanceOf(ModelSyncError)
    expect(host.sync.unsubscribe).not.toHaveBeenCalled()
    host.sync.emit({ modelId: 'm1', synced: true })
    expect(onResult).toHaveBeenLastCalledWith({ modelId: 'm1', synced: true })
  })

  it('with no reason at all, still rejects', async () => {
    const { host, p } = setup()
    host.sync.emit({ synced: false })
    await expect(p).rejects.toThrow('sync failed')
  })
})
