import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  anchorProps,
  lucidCapacityTradeoff,
  readTourState,
  writeTourState,
  type TourState,
} from 'quodsi_studio/platforms/shared'
import { ModalTourHost } from '../ModalTourHost'

const USER = 'ann@example.com'
const TOUR = lucidCapacityTradeoff.id
const STORAGE_KEY = 'quodsi.onboarding.v1'

function Harness({ client, userKey = USER, children }: { client: QueryClient; userKey?: string; children?: ReactNode }) {
  return (
    <QueryClientProvider client={client}>
      <ModalTourHost userKey={userKey} />
      {children}
    </QueryClientProvider>
  )
}

describe('ModalTourHost', () => {
  let client: QueryClient
  beforeEach(() => {
    localStorage.clear()
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
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
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
})
