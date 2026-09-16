import { render, screen, act, fireEvent } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import type { FakeHost } from './fakeModalHost'

const h = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  // What useMessaging currently returns; tests swap it to mimic the provider
  // handing out a new sendMessage identity after mount.
  currentSend: null as null | ((...args: unknown[]) => void),
  getter: null as null | (() => Promise<string | undefined>),
  order: [] as string[],
  surfaceProps: [] as Array<Record<string, any>>,
  hosts: [] as Array<{ host: unknown; opts: unknown }>,
}))

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ sendMessage: h.currentSend ?? h.sendMessage }),
}))
vi.mock('quodsi_studio/lib/api', () => ({
  configureApi: vi.fn((opts: { baseUrl: string }) => { h.order.push(`configureApi:${opts.baseUrl}`) }),
  registerTokenGetter: vi.fn((g: () => Promise<string | undefined>) => { h.getter = g }),
  registerAuthRefresher: vi.fn(),
}))
vi.mock('quodsi_studio/platforms/studies', () => ({
  StudiesSurface: (props: Record<string, any>) => {
    h.order.push('surface')
    h.surfaceProps.push(props)
    return <div data-testid="surface" />
  },
}))
vi.mock('../lucidModalHost', async () => {
  const { makeFakeHost } = await import('./fakeModalHost')
  return {
    windowPorts: (send: unknown) => ({ send }),
    createLucidModalHost: (ports: { send: (t: EnvelopeMessageType) => void }, opts?: unknown) => {
      const host = makeFakeHost(ports)
      h.hosts.push({ host, opts })
      return host
    },
  }
})

// eslint-disable-next-line import/first
import { StudiesModalView } from '../StudiesModalView'

function setSearch(qs: string) {
  window.history.replaceState({}, '', `/?${qs}`)
}
const lastProps = () => h.surfaceProps[h.surfaceProps.length - 1]
const host = () => h.hosts[h.hosts.length - 1].host as FakeHost

async function renderView() {
  const utils = render(<StudiesModalView />)
  await screen.findByTestId('surface')
  return utils
}

describe('StudiesModalView', () => {
  beforeEach(() => {
    h.sendMessage.mockClear()
    h.currentSend = null
    h.getter = null
    h.order.length = 0
    h.surfaceProps.length = 0
    h.hosts.length = 0
  })

  it('without apiBaseUrl shows a configuration alert and no surface', () => {
    setSearch('view=studies&title=Studies')
    render(<StudiesModalView />)
    expect(screen.getByRole('alert')).toHaveTextContent("Studies isn't configured for this environment.")
    expect(screen.queryByTestId('surface')).toBeNull()
  })

  it('cached open: shows the model studies at once, then marks sync done without a reset', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&title=Studies&modelId=m1')
    await renderView()
    expect(lastProps().initialScreen).toEqual({ kind: 'studies', modelId: 'm1' })
    expect(lastProps().syncStatus).toBe('pending')
    expect(lastProps().scenariosSource.kind).toBe('lucid')
    expect(lastProps().scenariosSource.host).toBe(host())
    const firstKey = lastProps().resetKey

    await act(async () => { host().sync.emit({ modelId: 'm1', synced: true }) })
    expect(lastProps().syncStatus).toBe('done')
    expect(lastProps().resetKey).toBe(firstKey)
    expect(lastProps().initialScreen).toEqual({ kind: 'studies', modelId: 'm1' })
  })

  it('first open: no screen until sync names the model, then resets to it', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&title=Studies')
    await renderView()
    expect(lastProps().initialScreen).toBeNull()
    const firstKey = lastProps().resetKey

    await act(async () => { host().sync.emit({ modelId: 'm2', synced: true }) })
    expect(lastProps().initialScreen).toEqual({ kind: 'studies', modelId: 'm2' })
    expect(lastProps().resetKey).not.toBe(firstKey)
    expect(lastProps().syncStatus).toBe('done')
  })

  it('a sync error marks sync failed', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&modelId=m1')
    await renderView()
    await act(async () => { host().sync.emit({ synced: false, error: 'x' }) })
    expect(lastProps().syncStatus).toBe('failed')
  })

  it('a late sync after the timeout moves a cached open from failed to done', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&modelId=m1')
    await renderView()
    const firstKey = lastProps().resetKey
    await act(async () => { host().sync.emit({ synced: false, error: 'The extension did not answer.' }) })
    expect(lastProps().syncStatus).toBe('failed')
    await act(async () => { host().sync.emit({ modelId: 'm1', synced: true }) })
    expect(lastProps().syncStatus).toBe('done')
    expect(lastProps().resetKey).toBe(firstKey)
  })

  it('a late sync after the timeout on a first open sets the screen and resets, as an on-time reply would', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example')
    await renderView()
    const firstKey = lastProps().resetKey
    await act(async () => { host().sync.emit({ synced: false, error: 'The extension did not answer.' }) })
    expect(lastProps().syncStatus).toBe('failed')
    expect(lastProps().initialScreen).toBeNull()
    await act(async () => { host().sync.emit({ modelId: 'm2', synced: true }) })
    expect(lastProps().syncStatus).toBe('done')
    expect(lastProps().initialScreen).toEqual({ kind: 'studies', modelId: 'm2' })
    expect(lastProps().resetKey).not.toBe(firstKey)
  })

  it('unmount unsubscribes from model sync; a later result updates nothing', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example')
    const { unmount } = await renderView()
    const count = h.surfaceProps.length
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
    unmount()
    expect(host().sync.unsubscribe).toHaveBeenCalledTimes(1)
    await act(async () => { host().sync.emit({ modelId: 'm2', synced: true }) })
    expect(h.surfaceProps.length).toBe(count)
    expect(errors).not.toHaveBeenCalled()
    errors.mockRestore()
  })

  it('no token: asks the user to sign in instead of showing the surface', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&modelId=m1')
    await renderView()
    await act(async () => { host().token.resolve(undefined) })
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to Quodsi in the Quodsi panel, then reopen Studies.')
    expect(screen.queryByTestId('surface')).toBeNull()
  })

  it('a token keeps the surface', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&modelId=m1')
    await renderView()
    await act(async () => { host().token.resolve('tok') })
    expect(screen.getByTestId('surface')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('points the api client at apiBaseUrl before the surface renders', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&modelId=m1')
    await renderView()
    expect(h.order[0]).toBe('configureApi:https://api.example')
    expect(h.order.indexOf('surface')).toBeGreaterThan(0)
  })

  it('connects the host on mount and disconnects on unmount', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&modelId=m1')
    const { unmount } = await renderView()
    expect(host().connect).toHaveBeenCalled()
    expect(host().requestModelSync).toHaveBeenCalledTimes(1)
    unmount()
    expect(host().disconnect).toHaveBeenCalled()
  })

  it('Close sends CLOSE_MODAL', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&title=My%20Studies&modelId=m1')
    await renderView()
    expect(screen.getByText('My Studies')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Close and return to your diagram'))
    expect(h.sendMessage).toHaveBeenCalledWith(EnvelopeMessageType.CLOSE_MODAL)
  })

  it('keeps one live host when sendMessage changes identity after mount', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&modelId=m1')
    const { rerender } = await renderView()
    const laterSend = vi.fn()
    h.currentSend = laterSend
    rerender(<StudiesModalView />)
    await screen.findByTestId('surface')

    expect(h.hosts).toHaveLength(1)
    expect(host().disconnect).not.toHaveBeenCalled()
    expect(lastProps().scenariosSource.host).toBe(host())

    // Studio's registered getter still answers through the live host.
    const got = h.getter!()
    await act(async () => { host().token.resolve('tok') })
    await expect(got).resolves.toBe('tok')

    // Sends go out through the current sendMessage.
    fireEvent.click(screen.getByTitle('Close and return to your diagram'))
    expect(laterSend).toHaveBeenCalledWith(EnvelopeMessageType.CLOSE_MODAL)
  })

  it('one open sends one token request, shared by the sign-in probe and the api getter', async () => {
    setSearch('view=studies&apiBaseUrl=https%3A%2F%2Fapi.example&modelId=m1')
    await renderView()
    const got = h.getter!()
    await act(async () => { host().token.resolve('tok') })
    await expect(got).resolves.toBe('tok')
    await expect(h.getter!()).resolves.toBe('tok')
    expect(host().requestToken).toHaveBeenCalledTimes(1)
  })
})
