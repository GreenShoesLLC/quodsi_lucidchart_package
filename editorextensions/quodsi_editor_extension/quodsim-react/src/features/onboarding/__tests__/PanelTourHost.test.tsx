import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import {
  anchorProps,
  lucidCapacityTradeoff,
  readTourState,
  writeTourState,
} from 'quodsi_studio/platforms/shared'
import { readExamplePageId, writeExamplePageId } from '../examplePageStore'

const openStudiesModal = vi.fn()
vi.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openStudiesModal }),
}))

import { PanelTourHost } from '../PanelTourHost'

type Posted = { id: string; type: string; data: any; source: string; target: string }

const USER = 'ann@example.com'
const TOUR = lucidCapacityTradeoff.id

type Props = { isConverted: boolean; currentPageId: string | undefined }

/** The host plus the panel's anchored elements the walked steps point at. */
function Harness({ isConverted, currentPageId }: Props) {
  return (
    <div {...anchorProps('panel.root')}>
      <PanelTourHost
        userKey={USER}
        authStatus="signed-in"
        isConverted={isConverted}
        currentPageId={currentPageId}
        documentId="doc-1"
      />
      <button {...anchorProps('panel.convert')}>Convert</button>
      <button {...anchorProps('panel.studies')}>What-if Analysis</button>
    </div>
  )
}

describe('PanelTourHost', () => {
  let posted: Posted[]
  const original = window.parent.postMessage

  beforeEach(() => {
    localStorage.clear()
    posted = []
    openStudiesModal.mockClear()
    window.parent.postMessage = ((msg: Posted) => { posted.push(msg) }) as never
  })
  afterEach(() => {
    window.parent.postMessage = original
  })

  const postedOf = (type: EnvelopeMessageType) => posted.filter((m) => m.type === type)
  const hostSends = (msg: object) =>
    act(async () => { window.dispatchEvent(new MessageEvent('message', { data: msg })) })
  const reply = (type: EnvelopeMessageType, resultType: EnvelopeMessageType, data: object, nth = 0) => {
    const req = postedOf(type)[nth]
    expect(req).toBeDefined()
    return hostSends({ id: req.id, type: resultType, source: 'host', target: 'model-iframe', version: '1.0', data })
  }
  const dock = () => screen.getByTestId('tour-dock')
  const cursor = () => readTourState(USER, TOUR).currentStepId
  const seed = (stepId: string, examplePage = 'ex-1') => {
    writeTourState(USER, TOUR, { state: 'started', currentStepId: stepId })
    writeExamplePageId(USER, examplePage)
  }
  const flush = () => act(async () => { await Promise.resolve() })

  it('invitation → Start → welcome card docked at top', async () => {
    render(<Harness isConverted={false} currentPageId="pg-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }))
    await waitFor(() => expect(dock().textContent).toContain("Let's test a business change"))
    // The dock is the host's first child: pinned above everything else.
    const host = screen.getByTestId('panel-tour-host')
    expect(host.firstElementChild).toBe(dock())
    expect(screen.queryByRole('button', { name: 'Start tour' })).toBeNull()
  })

  it('TOUR_START {reset:true} restarts from welcome even after completion', async () => {
    writeTourState(USER, TOUR, { state: 'completed' })
    render(<Harness isConverted={false} currentPageId="pg-1" />)
    expect(screen.queryByRole('button', { name: 'Start tour' })).toBeNull()
    expect(dock().textContent).toBe('')

    await hostSends({ id: '', type: EnvelopeMessageType.TOUR_START, source: 'host', target: 'model-iframe', version: '1.0', data: { reset: true } })
    await waitFor(() => expect(dock().textContent).toContain("Let's test a business change"))
    expect(cursor()).toBe('welcome')
  })

  it('load-example → TOUR_LOAD_EXAMPLE {replace:false}; occupied → the Lucid confirm-replace copy; Replace → {replace:true}', async () => {
    render(<Harness isConverted={false} currentPageId="pg-1" />)
    fireEvent.click(screen.getByRole('button', { name: 'Start tour' }))
    await waitFor(() => expect(dock().textContent).toContain("Let's test a business change"))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    await waitFor(() => expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)).toHaveLength(1))
    expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)[0].data).toEqual({ replace: false })

    await reply(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT, { outcome: 'occupied' })
    await waitFor(() => expect(dock().textContent).toContain('Replace the example page?'))

    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))
    await waitFor(() => expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)).toHaveLength(2))
    expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)[1].data).toEqual({ replace: true })

    await reply(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT, { outcome: 'loaded', pageId: 'ex-9' }, 1)
    await waitFor(() => expect(cursor()).toBe('panel'))
    expect(readExamplePageId(USER)).toBe('ex-9')
  })

  it('converted flag flip on the example page advances convert', async () => {
    seed('convert')
    const { rerender } = render(<Harness isConverted={false} currentPageId="ex-1" />)
    await reply(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, { outcome: 'shown', pageId: 'ex-1' })
    await waitFor(() => expect(dock().textContent).toContain('Turn the diagram into a model'))

    rerender(<Harness isConverted currentPageId="ex-1" />)
    await waitFor(() => expect(cursor()).toBe('model'))
  })

  it('a converted flag flip on another page does not advance convert', async () => {
    seed('convert')
    const { rerender } = render(<Harness isConverted={false} currentPageId="ex-1" />)
    await reply(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, { outcome: 'shown', pageId: 'ex-1' })
    await waitFor(() => expect(dock().textContent).toContain('Turn the diagram into a model'))
    rerender(<Harness isConverted={false} currentPageId="other" />)
    rerender(<Harness isConverted currentPageId="other" />)
    await flush()
    expect(cursor()).toBe('convert')
  })

  it('switching page mid-tour shows the pause card and suspends; returning resumes', async () => {
    seed('panel')
    const { rerender } = render(<Harness isConverted={false} currentPageId="ex-1" />)
    await reply(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, { outcome: 'shown', pageId: 'ex-1' })
    await waitFor(() => expect(dock().textContent).toContain('This is the Quodsi Panel'))

    rerender(<Harness isConverted={false} currentPageId="other" />)
    await waitFor(() => expect(screen.getByText('Go back to the example page to continue the tour.')).toBeInTheDocument())
    expect(dock().textContent).toBe('')
    expect(document.querySelector('[data-quodsi-tour-target]')).toBeNull()
    // Suspended, not paused: the cursor is kept and still resumable.
    expect(readTourState(USER, TOUR)).toMatchObject({ state: 'started', currentStepId: 'panel' })
    expect(readTourState(USER, TOUR).paused).toBeUndefined()

    const before = postedOf(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE).length
    fireEvent.click(screen.getByRole('button', { name: 'Go to example page' }))
    expect(postedOf(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE)).toHaveLength(before + 1)

    rerender(<Harness isConverted={false} currentPageId="ex-1" />)
    await waitFor(() => expect(dock().textContent).toContain('This is the Quodsi Panel'))
    expect(screen.queryByText('Go back to the example page to continue the tour.')).toBeNull()
  })

  it('cursor at run-baseline (written by the modal) shows the handoff card, also on a fresh mount', async () => {
    // Live: the panel is on open-studies when the modal writes run-baseline.
    seed('open-studies')
    const first = render(<Harness isConverted currentPageId="ex-1" />)
    await reply(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, { outcome: 'shown', pageId: 'ex-1' })
    await waitFor(() => expect(dock().textContent).toContain('Open What-if Analysis'))
    expect(screen.queryByText('The tour continues in What-if Analysis.')).toBeNull()

    writeTourState(USER, TOUR, { state: 'started', currentStepId: 'run-baseline' })
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: 'quodsi.onboarding.v1' }))
    })
    await waitFor(() => expect(screen.getByText('The tour continues in What-if Analysis.')).toBeInTheDocument())
    expect(dock().textContent).toBe('')
    expect(screen.queryByRole('button', { name: 'Start tour' })).toBeNull()
    first.unmount()

    // Fresh mount with the cursor already in the modal's hands.
    posted = []
    render(<Harness isConverted currentPageId="ex-1" />)
    await reply(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, { outcome: 'shown', pageId: 'ex-1' })
    await waitFor(() => expect(screen.getByText('The tour continues in What-if Analysis.')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Open What-if Analysis' }))
    expect(openStudiesModal).toHaveBeenCalledWith('doc-1', 'ex-1')
    expect(cursor()).toBe('run-baseline')
  })

  it('resume with example page missing returns to load-example', async () => {
    seed('model')
    render(<Harness isConverted currentPageId="pg-1" />)
    await reply(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, { outcome: 'missing' })
    await waitFor(() => expect(cursor()).toBe('load-example'))
    await waitFor(() => expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)).toHaveLength(1))
    expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)[0].data).toEqual({ replace: false })
  })

  it('does not auto-start a paused (×) cursor; the invitation offers Resume', async () => {
    writeTourState(USER, TOUR, { state: 'started', currentStepId: 'panel', paused: true })
    render(<Harness isConverted={false} currentPageId="pg-1" />)
    await flush()
    expect(postedOf(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE)).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()
  })
})
