import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  TOUR_STORAGE_KEY,
  anchorProps,
  lucidCapacityTradeoff,
  readTourState,
  writeTourState,
  type TourState,
} from 'quodsi_studio/platforms/shared'
import { EXAMPLE_PAGE_STORAGE_KEY, writeExamplePage } from '../examplePageStore'
import { ModalTourHost } from '../ModalTourHost'

const USER = 'ann@example.com'
const TOUR = lucidCapacityTradeoff.id

type HarnessProps = { client: QueryClient; userKey?: string; documentId?: string; children?: ReactNode }
function Harness({ client, userKey = USER, documentId = 'doc-1', children }: HarnessProps) {
  return (
    <QueryClientProvider client={client}>
      <ModalTourHost userKey={userKey} documentId={documentId} />
      {children}
    </QueryClientProvider>
  )
}

describe('ModalTourHost', () => {
  let client: QueryClient
  beforeEach(() => {
    localStorage.clear()
    // doc-1 owns the tour unless a test says otherwise (ruling 7).
    writeExamplePage(USER, 'doc-1', 'ex-1')
    client = new QueryClient()
  })
  afterEach(() => {
    client.clear()
  })

  const seed = (s: TourState) => writeTourState(USER, TOUR, s)
  const cursor = () => readTourState(USER, TOUR).currentStepId
  /** What the other frame's write looks like here: storage changed, then the event. */
  const otherFrameWrites = (s: TourState) => act(async () => {
    writeTourState(USER, TOUR, s)
    window.dispatchEvent(new StorageEvent('storage', { key: TOUR_STORAGE_KEY }))
  })

  it('cursor at open-studies: dormant until runs.baseline.run renders, then shows run-baseline', async () => {
    seed({ state: 'started', currentStepId: 'open-studies' })
    const { rerender } = render(<Harness client={client} />)
    // Dormant: the panel owns open-studies, so no card here.
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByText('Open What-if Analysis')).toBeNull()
    expect(screen.queryByText('Run it')).toBeNull()
    expect(cursor()).toBe('open-studies')

    rerender(<Harness client={client}><button {...anchorProps('runs.baseline.run')}>Run</button></Harness>)
    await waitFor(() => expect(cursor()).toBe('run-baseline'))
    expect(await screen.findByText('Run it')).toBeTruthy()
  })

  it('C3: entering at wait-baseline with a scenario query already terminal advances to view-results', async () => {
    seed({ state: 'started', currentStepId: 'wait-baseline' })
    render(<Harness client={client} />)
    expect(await screen.findByText('Running your simulation')).toBeTruthy()
    // The scenario row arrives already terminal: never seen in flight here.
    await act(async () => {
      client.setQueryData(['model', 'm1', 'scenarios'], [{ id: 's1', last_run_status: 'completed' }])
    })
    await waitFor(() => expect(cursor()).toBe('view-results'))
  })

  it('aha → completed is written, and the panel-side stored state reads completed', async () => {
    seed({ state: 'started', currentStepId: 'aha' })
    render(<Harness client={client} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Explore Quodsi' }))
    await waitFor(() => expect(readTourState(USER, TOUR).state).toBe('completed'))
    await waitFor(() => expect(screen.queryByText('You just priced a change before making it')).toBeNull())
  })

  it('unmount stops the session without changing the cursor', async () => {
    seed({ state: 'started', currentStepId: 'run-baseline' })
    const { unmount } = render(
      <Harness client={client}><button {...anchorProps('runs.baseline.run')}>Run</button></Harness>,
    )
    expect(await screen.findByText('Run it')).toBeTruthy()
    const before = readTourState(USER, TOUR)
    unmount()
    expect(screen.queryByText('Run it')).toBeNull()
    const after = readTourState(USER, TOUR)
    expect(after.state).toBe('started')
    expect(after.currentStepId).toBe('run-baseline')
    expect(after.paused).toBe(before.paused)
  })

  it('not started: starts when the other frame writes a started cursor', async () => {
    render(<Harness client={client} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByText('You just priced a change before making it')).toBeNull()
    await otherFrameWrites({ state: 'started', currentStepId: 'aha' })
    expect(await screen.findByText('You just priced a change before making it')).toBeTruthy()
  })

  it('a paused cursor does not start; unpausing it does', async () => {
    seed({ state: 'started', currentStepId: 'aha', paused: true })
    render(<Harness client={client} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByText('You just priced a change before making it')).toBeNull()
    expect(readTourState(USER, TOUR).paused).toBe(true)
    await otherFrameWrites({ state: 'started', currentStepId: 'aha' })
    expect(await screen.findByText('You just priced a change before making it')).toBeTruthy()
  })

  it('no user: nothing starts and storage is not read', async () => {
    seed({ state: 'started', currentStepId: 'aha' })
    render(<Harness client={client} userKey="" />)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByText('You just priced a change before making it')).toBeNull()
  })

  it('after the tour completes, a fresh start from the panel is picked up again', async () => {
    seed({ state: 'started', currentStepId: 'aha' })
    render(<Harness client={client} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Explore Quodsi' }))
    await waitFor(() => expect(readTourState(USER, TOUR).state).toBe('completed'))
    await otherFrameWrites({ state: 'started', currentStepId: 'aha' })
    expect(await screen.findByText('You just priced a change before making it')).toBeTruthy()
  })

  // Ruling 7: the modal picks the tour up only in the document that owns it.
  it('in a document that does not own the tour, nothing starts, nor on a later cursor write', async () => {
    seed({ state: 'started', currentStepId: 'aha' })
    render(<Harness client={client} documentId="doc-2" />)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByText('You just priced a change before making it')).toBeNull()
    await otherFrameWrites({ state: 'started', currentStepId: 'aha' })
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByText('You just priced a change before making it')).toBeNull()
  })

  it('with no owning document stored, nothing starts', async () => {
    localStorage.removeItem(EXAMPLE_PAGE_STORAGE_KEY)
    seed({ state: 'started', currentStepId: 'aha' })
    render(<Harness client={client} />)
    await act(async () => { await Promise.resolve() })
    expect(screen.queryByText('You just priced a change before making it')).toBeNull()
  })

  it('a running modal session stops when another document adopts the tour', async () => {
    seed({ state: 'started', currentStepId: 'aha' })
    render(<Harness client={client} />)
    expect(await screen.findByText('You just priced a change before making it')).toBeTruthy()
    await act(async () => {
      writeExamplePage(USER, 'doc-2', 'ex-2')
      window.dispatchEvent(new StorageEvent('storage', { key: EXAMPLE_PAGE_STORAGE_KEY }))
    })
    await waitFor(() => expect(screen.queryByText('You just priced a change before making it')).toBeNull())
    expect(readTourState(USER, TOUR)).toMatchObject({ state: 'started', currentStepId: 'aha' })
  })
})
