import { render, screen, act, fireEvent } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import type { FakeHost } from './fakeModalHost'

const h = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  currentSend: null as null | ((...args: unknown[]) => void),
  getter: null as null | (() => Promise<string | undefined>),
  order: [] as string[],
  consultProps: [] as Array<Record<string, any>>,
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
  focusFromParams: (p: URLSearchParams) => ({ parsedFrom: p.toString() }),
  AdvisorConsultSurface: (props: Record<string, any>) => {
    h.order.push('consult')
    h.consultProps.push(props)
    return <div data-testid="consult" />
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
import { AdvisorModalView } from '../AdvisorModalView'

function setSearch(qs: string) {
  window.history.replaceState({}, '', `/?${qs}`)
}
const last = () => h.consultProps[h.consultProps.length - 1]
const hostEntry = () => h.hosts[h.hosts.length - 1]

describe('AdvisorModalView', () => {
  beforeEach(() => {
    h.sendMessage.mockClear()
    h.currentSend = null
    h.getter = null
    h.order.length = 0
    h.consultProps.length = 0
    h.hosts.length = 0
  })

  it('without apiBaseUrl shows a configuration alert and no consult', () => {
    setSearch('view=advisor&focusType=Activity&focusId=a1')
    render(<AdvisorModalView />)
    expect(screen.getByRole('alert')).toHaveTextContent("The Advisor isn't configured for this environment.")
    expect(screen.queryByTestId('consult')).toBeNull()
  })

  it('passes the URL focus and a writer-enabled host to the consult surface', async () => {
    const qs = 'view=advisor&apiBaseUrl=https%3A%2F%2Fapi.example&title=Ask&focusType=Activity&focusId=a1&focusName=Pack&mode=definition'
    setSearch(qs)
    render(<AdvisorModalView />)
    await screen.findByTestId('consult')
    expect(last().focus).toEqual({ parsedFrom: new URLSearchParams(qs).toString() })
    expect(hostEntry().opts).toEqual({ withWriter: true })
    expect(last().host).toBe(hostEntry().host)
    expect(h.order[0]).toBe('configureApi:https://api.example')
    expect(screen.getByText('Ask')).toBeInTheDocument()
  })

  it('no token: asks the user to sign in', async () => {
    setSearch('view=advisor&apiBaseUrl=https%3A%2F%2Fapi.example&focusType=Model')
    render(<AdvisorModalView />)
    await screen.findByTestId('consult')
    await act(async () => { (hostEntry().host as FakeHost).token.resolve(undefined) })
    expect(screen.getByRole('alert')).toHaveTextContent('Sign in to Quodsi in the Quodsi panel, then reopen the Advisor.')
    expect(screen.queryByTestId('consult')).toBeNull()
  })

  it('Close sends CLOSE_MODAL', () => {
    setSearch('view=advisor&apiBaseUrl=https%3A%2F%2Fapi.example')
    render(<AdvisorModalView />)
    expect(screen.getByText('Ask the Advisor')).toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Close and return to your diagram'))
    expect(h.sendMessage).toHaveBeenCalledWith(EnvelopeMessageType.CLOSE_MODAL)
  })

  it('keeps one live writer host when sendMessage changes identity after mount', async () => {
    setSearch('view=advisor&apiBaseUrl=https%3A%2F%2Fapi.example&focusType=Model')
    const { rerender } = render(<AdvisorModalView />)
    await screen.findByTestId('consult')
    const laterSend = vi.fn()
    h.currentSend = laterSend
    rerender(<AdvisorModalView />)
    await screen.findByTestId('consult')

    expect(h.hosts).toHaveLength(1)
    const host = hostEntry().host as FakeHost
    expect(host.disconnect).not.toHaveBeenCalled()
    expect(last().host).toBe(host)

    const got = h.getter!()
    await act(async () => { host.token.resolve('tok') })
    await expect(got).resolves.toBe('tok')
    expect(host.requestToken).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByTitle('Close and return to your diagram'))
    expect(laterSend).toHaveBeenCalledWith(EnvelopeMessageType.CLOSE_MODAL)
  })
})
