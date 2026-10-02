// The ?view=status Lucid modal (ClickUp 86e3f949t) renders quodsi_studio's
// shared StatusPanel with the apiBaseUrl the extension put on its URL
// (StatusModal.ts). The real panel is rendered, with fetch stubbed.
import { render, screen, cleanup } from '@testing-library/react'
import { StatusModalView } from '../StatusModalView'
import { App } from '../../../App'

const OK = {
  overall: 'ok', environment: 'dev', checked_at: '2026-06-07T12:00:00Z',
  components: [{ name: 'Azure Batch pool', status: 'ok', detail: 'available' }],
}

function setSearch(qs: string) {
  window.history.replaceState({}, '', `/?${qs}`)
}

let fetchFn: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchFn = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve(OK) })
  vi.stubGlobal('fetch', fetchFn)
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  setSearch('')
})

describe('StatusModalView', () => {
  it('renders the shared StatusPanel against the apiBaseUrl on its URL', async () => {
    setSearch(`view=status&apiBaseUrl=${encodeURIComponent('https://api.lucid.test')}`)
    render(<StatusModalView />)
    expect(screen.getByTestId('status-panel')).toBeInTheDocument()
    expect(await screen.findByTestId('status-component-Azure Batch pool')).toHaveTextContent('Running simulations')
    expect(fetchFn).toHaveBeenCalledWith('https://api.lucid.test/status')
  })

  it('shows a clear "not configured" message and does not fetch when apiBaseUrl is empty', () => {
    setSearch('view=status&apiBaseUrl=')
    render(<StatusModalView />)
    expect(screen.getByTestId('status-unconfigured')).toBeInTheDocument()
    expect(fetchFn).not.toHaveBeenCalled()
  })

  it('App routes ?view=status to the status view', async () => {
    setSearch(`view=status&apiBaseUrl=${encodeURIComponent('https://api.lucid.test')}`)
    render(<App />)
    expect(await screen.findByTestId('status-panel')).toBeInTheDocument()
  })
})
