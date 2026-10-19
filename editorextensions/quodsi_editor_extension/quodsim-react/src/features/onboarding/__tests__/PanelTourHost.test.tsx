import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import {
  TOUR_STORAGE_KEY,
  anchorProps,
  lucidCapacityTradeoff,
  readTourState,
  writeTourState,
} from 'quodsi_studio/platforms/shared'
import { EXAMPLE_PAGE_STORAGE_KEY, readExamplePageId, readTourOwner, writeExamplePage } from '../examplePageStore'

const openStudiesModal = vi.fn()
vi.mock('../../../messaging/senders/simulationRunSender', () => ({
  useSimulationRunSender: () => ({ openStudiesModal }),
}))

import { PanelTourHost } from '../PanelTourHost'

type Posted = { id: string; type: string; data: any; source: string; target: string }

const USER = 'ann@example.com'
const TOUR = lucidCapacityTradeoff.id

type Props = {
  isConverted: boolean
  currentPageId: string | undefined
  userKey?: string
  authStatus?: 'loading' | 'signed-in' | 'signed-out'
  documentId?: string
}

/** The host plus the panel's anchored elements the walked steps point at. */
function Harness({ isConverted, currentPageId, userKey = USER, authStatus = 'signed-in', documentId = 'doc-1' }: Props) {
  return (
    <div {...anchorProps('panel.root')}>
      <PanelTourHost
        userKey={userKey}
        authStatus={authStatus}
        isConverted={isConverted}
        currentPageId={currentPageId}
        documentId={documentId}
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
  /** A live cursor in the tour's owning document, doc-1, whose example page is ex-1. */
  const seed = (stepId: string, examplePage = 'ex-1') => {
    writeTourState(USER, TOUR, { state: 'started', currentStepId: stepId })
    writeExamplePage(USER, 'doc-1', examplePage)
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
    expect(readTourOwner(USER)).toEqual({ documentId: 'doc-1', pageId: 'ex-9' })
  })

  it('converted flag flip on the example page advances convert', async () => {
    seed('convert')
    const { rerender } = render(<Harness isConverted={false} currentPageId="ex-1" />)
    await waitFor(() => expect(dock().textContent).toContain('Turn the diagram into a model'))

    rerender(<Harness isConverted currentPageId="ex-1" />)
    await waitFor(() => expect(cursor()).toBe('model'))
  })

  it('a converted flag flip on another page does not advance convert', async () => {
    seed('convert')
    const { rerender } = render(<Harness isConverted={false} currentPageId="ex-1" />)
    await waitFor(() => expect(dock().textContent).toContain('Turn the diagram into a model'))
    rerender(<Harness isConverted={false} currentPageId="other" />)
    rerender(<Harness isConverted currentPageId="other" />)
    await flush()
    expect(cursor()).toBe('convert')
  })

  it('switching page mid-tour shows the pause card and suspends; returning resumes', async () => {
    seed('panel')
    const { rerender } = render(<Harness isConverted={false} currentPageId="ex-1" />)
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
    await waitFor(() => expect(dock().textContent).toContain('Open What-if Analysis'))
    expect(screen.queryByText('The tour continues in What-if Analysis.')).toBeNull()

    writeTourState(USER, TOUR, { state: 'started', currentStepId: 'run-baseline' })
    await act(async () => {
      window.dispatchEvent(new StorageEvent('storage', { key: TOUR_STORAGE_KEY }))
    })
    await waitFor(() => expect(screen.getByText('The tour continues in What-if Analysis.')).toBeInTheDocument())
    expect(dock().textContent).toBe('')
    expect(screen.queryByRole('button', { name: 'Start tour' })).toBeNull()
    first.unmount()

    // Fresh mount with the cursor already in the modal's hands.
    posted = []
    render(<Harness isConverted currentPageId="ex-1" />)
    await waitFor(() => expect(screen.getByText('The tour continues in What-if Analysis.')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'Open What-if Analysis' }))
    expect(openStudiesModal).toHaveBeenCalledWith('doc-1', 'ex-1')
    expect(cursor()).toBe('run-baseline')
  })

  it('a dormant cursor off the example page shows the pause card, not the handoff (C2)', async () => {
    seed('run-baseline')
    const { rerender } = render(<Harness isConverted currentPageId="ex-1" />)
    await waitFor(() => expect(screen.getByText('The tour continues in What-if Analysis.')).toBeInTheDocument())

    rerender(<Harness isConverted currentPageId="mine" />)
    await waitFor(() => expect(screen.getByText('Go back to the example page to continue the tour.')).toBeInTheDocument())
    expect(screen.queryByText('The tour continues in What-if Analysis.')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Open What-if Analysis' })).toBeNull()
    expect(openStudiesModal).not.toHaveBeenCalled()
    expect(cursor()).toBe('run-baseline')

    rerender(<Harness isConverted currentPageId="ex-1" />)
    await waitFor(() => expect(screen.getByText('The tour continues in What-if Analysis.')).toBeInTheDocument())
    expect(screen.queryByText('Go back to the example page to continue the tour.')).toBeNull()
  })

  it('TOUR_START before auth resolves is buffered and honoured once signed in (reset kept)', async () => {
    writeTourState(USER, TOUR, { state: 'completed' })
    const { rerender } = render(<Harness isConverted={false} currentPageId="pg-1" userKey="" authStatus="loading" />)
    expect(screen.queryByRole('button', { name: 'Start tour' })).toBeNull()
    await hostSends({ id: '', type: EnvelopeMessageType.TOUR_START, source: 'host', target: 'model-iframe', version: '1.0', data: { reset: true } })
    await flush()
    expect(dock().textContent).toBe('')
    expect(readTourState(USER, TOUR).state).toBe('completed')

    rerender(<Harness isConverted={false} currentPageId="pg-1" />)
    await waitFor(() => expect(dock().textContent).toContain("Let's test a business change"))
    expect(cursor()).toBe('welcome')
  })

  // Ruling 7: the tour belongs to one Lucid document, and only a click moves
  // it -- a mount never switches pages or builds the example.
  it('remount in another document with a live cursor posts nothing and shows the invitation', async () => {
    seed('model')
    render(<Harness isConverted currentPageId="pg-1" documentId="doc-2" />)
    await flush()
    expect(postedOf(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE)).toHaveLength(0)
    expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)).toHaveLength(0)
    expect(dock().textContent).toBe('')
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()
    expect(cursor()).toBe('model')
  })

  it('remount in the owning document posts nothing and shows the right card', async () => {
    seed('panel')
    const first = render(<Harness isConverted={false} currentPageId="ex-1" />)
    await waitFor(() => expect(dock().textContent).toContain('This is the Quodsi Panel'))
    first.unmount()

    seed('model')
    render(<Harness isConverted currentPageId="pg-1" />)
    await waitFor(() => expect(screen.getByText('Go back to the example page to continue the tour.')).toBeInTheDocument())
    expect(postedOf(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE)).toHaveLength(0)
    expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)).toHaveLength(0)
    expect(screen.queryByRole('button', { name: 'Resume tour' })).toBeNull()
  })

  it('no owning document stored: a live cursor is offered, not resumed', async () => {
    writeTourState(USER, TOUR, { state: 'started', currentStepId: 'panel' })
    render(<Harness isConverted={false} currentPageId="pg-1" />)
    await flush()
    expect(dock().textContent).toBe('')
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()
  })

  it('a cursor at load-example is not resumed on mount, even in the owning document (it would build)', async () => {
    seed('load-example')
    render(<Harness isConverted={false} currentPageId="ex-1" />)
    await flush()
    expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()
  })

  it('Resume in another document adopts it: example missing there, so back to load-example, built here', async () => {
    seed('model')
    render(<Harness isConverted currentPageId="pg-1" documentId="doc-2" />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume tour' }))
    expect(readTourOwner(USER)).toEqual({ documentId: 'doc-2', pageId: null })
    await reply(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT, { outcome: 'missing' })
    await waitFor(() => expect(cursor()).toBe('load-example'))
    await waitFor(() => expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)).toHaveLength(1))
    expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)[0].data).toEqual({ replace: false })
    await reply(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT, { outcome: 'loaded', pageId: 'ex-2' })
    await waitFor(() => expect(readTourOwner(USER)).toEqual({ documentId: 'doc-2', pageId: 'ex-2' }))
  })

  it('another tab adopting the tour stops the session here and offers the invitation', async () => {
    seed('panel')
    render(<Harness isConverted={false} currentPageId="ex-1" />)
    await waitFor(() => expect(dock().textContent).toContain('This is the Quodsi Panel'))

    await act(async () => {
      writeExamplePage(USER, 'doc-2', 'ex-2')
      window.dispatchEvent(new StorageEvent('storage', { key: EXAMPLE_PAGE_STORAGE_KEY }))
    })
    await waitFor(() => expect(dock().textContent).toBe(''))
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()

    // Nor does it follow the other tab's cursor any more.
    await act(async () => {
      writeTourState(USER, TOUR, { state: 'started', currentStepId: 'load-example' })
      window.dispatchEvent(new StorageEvent('storage', { key: TOUR_STORAGE_KEY }))
    })
    await flush()
    expect(postedOf(EnvelopeMessageType.TOUR_LOAD_EXAMPLE)).toHaveLength(0)
    expect(dock().textContent).toBe('')
  })

  it('a cursor change from the other frame re-checks the owner (onCursor)', async () => {
    seed('panel')
    render(<Harness isConverted={false} currentPageId="ex-1" />)
    await waitFor(() => expect(dock().textContent).toContain('This is the Quodsi Panel'))
    // The owner moved without this tab hearing the owner key's own event.
    writeExamplePage(USER, 'doc-2', 'ex-2')
    await act(async () => {
      writeTourState(USER, TOUR, { state: 'started', currentStepId: 'convert' })
      window.dispatchEvent(new StorageEvent('storage', { key: TOUR_STORAGE_KEY }))
    })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument())
    expect(dock().textContent).toBe('')
  })

  it('a start overtaken mid-preflight (auth flips away) does not leave the invitation hidden', async () => {
    // Paused, so the re-sign-in below does not resume it on its own.
    writeTourState(USER, TOUR, { state: 'started', currentStepId: 'model', paused: true })
    const { rerender } = render(<Harness isConverted currentPageId="pg-1" documentId="doc-2" />)
    fireEvent.click(screen.getByRole('button', { name: 'Resume tour' }))
    expect(postedOf(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE)).toHaveLength(1) // reply never comes
    rerender(<Harness isConverted currentPageId="pg-1" documentId="doc-2" authStatus="loading" />)
    rerender(<Harness isConverted currentPageId="pg-1" documentId="doc-2" />)
    await flush()
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()
  })

  it('does not auto-start a paused (×) cursor; the invitation offers Resume', async () => {
    writeTourState(USER, TOUR, { state: 'started', currentStepId: 'panel', paused: true })
    render(<Harness isConverted={false} currentPageId="pg-1" />)
    await flush()
    expect(postedOf(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE)).toHaveLength(0)
    expect(screen.getByRole('button', { name: 'Resume tour' })).toBeInTheDocument()
  })
})
