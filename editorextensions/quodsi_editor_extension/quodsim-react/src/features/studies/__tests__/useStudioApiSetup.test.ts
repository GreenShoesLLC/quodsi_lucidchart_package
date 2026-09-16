import { renderHook } from '@testing-library/react'
import type { LucidModalHost } from '../lucidModalHost'

const h = vi.hoisted(() => ({
  configureApi: vi.fn(),
  getter: null as null | (() => Promise<string | undefined>),
  refresher: null as null | (() => Promise<boolean>),
}))
vi.mock('quodsi_studio/lib/api', () => ({
  configureApi: h.configureApi,
  registerTokenGetter: (g: () => Promise<string | undefined>) => { h.getter = g },
  registerAuthRefresher: (r: () => Promise<boolean>) => { h.refresher = r },
}))

// eslint-disable-next-line import/first
import { useStudioApiSetup } from '../useStudioApiSetup'

function hostWith(tokens: Array<string | undefined>) {
  const requestToken = vi.fn(async () => tokens.shift())
  return { host: { requestToken } as unknown as LucidModalHost, requestToken }
}

describe('useStudioApiSetup', () => {
  beforeEach(() => {
    h.configureApi.mockClear()
    h.getter = null
    h.refresher = null
  })

  it('does nothing without an apiBaseUrl', () => {
    const { host } = hostWith([])
    renderHook(() => useStudioApiSetup(null, host))
    expect(h.configureApi).not.toHaveBeenCalled()
    expect(h.getter).toBeNull()
  })

  it('configures the api client once, even across re-renders', () => {
    const { host } = hostWith([])
    const { rerender } = renderHook(() => useStudioApiSetup('https://api.example', host))
    rerender()
    expect(h.configureApi).toHaveBeenCalledTimes(1)
    expect(h.configureApi).toHaveBeenCalledWith({ baseUrl: 'https://api.example' })
  })

  it('the token getter asks the host once and caches the token', async () => {
    const { host, requestToken } = hostWith(['t1', 't2'])
    renderHook(() => useStudioApiSetup('https://api.example', host))
    expect(await h.getter!()).toBe('t1')
    expect(await h.getter!()).toBe('t1')
    expect(requestToken).toHaveBeenCalledTimes(1)
  })

  it('the refresher re-requests and reports true only for a new non-empty token', async () => {
    const { host, requestToken } = hostWith(['t1', 't2', 't2', undefined, ''])
    renderHook(() => useStudioApiSetup('https://api.example', host))
    expect(await h.getter!()).toBe('t1')
    expect(await h.refresher!()).toBe(true) // t2
    expect(await h.getter!()).toBe('t2') // cached from the refresh
    expect(await h.refresher!()).toBe(false) // t2 again
    expect(await h.refresher!()).toBe(false) // undefined
    expect(await h.refresher!()).toBe(false) // ''
    expect(requestToken).toHaveBeenCalledTimes(5)
  })

  it('coalesces concurrent getter calls into one request and returns the getter', async () => {
    let release!: (t: string | undefined) => void
    const requestToken = vi.fn(() => new Promise<string | undefined>((r) => { release = r }))
    const host = { requestToken } as unknown as LucidModalHost
    const { result } = renderHook(() => useStudioApiSetup('https://api.example', host))
    const a = h.getter!()
    const b = result.current()
    release('t1')
    await expect(a).resolves.toBe('t1')
    await expect(b).resolves.toBe('t1')
    expect(requestToken).toHaveBeenCalledTimes(1)
  })

  it('an empty token is not cached: the next call asks again', async () => {
    const { host, requestToken } = hostWith([undefined, 't1'])
    renderHook(() => useStudioApiSetup('https://api.example', host))
    expect(await h.getter!()).toBeUndefined()
    expect(await h.getter!()).toBe('t1')
    expect(await h.getter!()).toBe('t1')
    expect(requestToken).toHaveBeenCalledTimes(2)
  })

  it('returns a working getter even without an apiBaseUrl', async () => {
    const { host, requestToken } = hostWith(['t1'])
    const { result } = renderHook(() => useStudioApiSetup(null, host))
    expect(await result.current()).toBe('t1')
    expect(requestToken).toHaveBeenCalledTimes(1)
  })
})
