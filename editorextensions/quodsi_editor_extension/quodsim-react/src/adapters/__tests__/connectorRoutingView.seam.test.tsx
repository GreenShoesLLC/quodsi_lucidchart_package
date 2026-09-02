// Real ConnectorRoutingView + real createReferenceDataAccessor, fake senders.
// Pins the two write paths a routing edit can take:
//   - a mode change on the source (Generator/Activity) goes through a
//     registered shape writer when the caller registered one for that shape
//     id (the host editor's own autosave), and the adapter overlays the
//     patch so the select reflects it immediately;
//   - a connector-level edit (priority) has no writer of its own, so it
//     always goes through the ELEMENT_UPDATE sender, and the overlay is what
//     re-ranks the FirstAvailable order badges before any referenceData
//     refresh.
// Also pins the optimistic-overlay fix for the priority input specifically:
// it is fully controlled off the snapshot with no local buffer, so the
// overlay must land BEFORE the ELEMENT_UPDATE send resolves (not after) or
// the field snaps back to the pre-edit value for the whole pending window;
// and a rejected send must roll the overlay back to that pre-edit value.
// The mode <select> has no accessible name (its <label> isn't associated via
// htmlFor/id) -- getByRole('combobox') with no name filter is the only
// selector that resolves it, and it stays the only combobox on screen in
// First Available mode (that connect type renders a priority <input>, not a
// <select>).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectorRoutingView, setView } from 'quodsi_studio/platforms/shared'
import { createReferenceDataAccessor } from '../useReferenceDataAccessor'

// First Available moved basic -> INTERMEDIATE on 2026-09-01 (Renee's
// simple-version spec: Basic offers Probability only), so the option is only
// in the picker from Intermediate up. What this file pins is the WRITE PATH,
// not the gating, so it just asks for a view where the option exists. Basic's
// grandfathering of an already-First-Available connector is covered in the
// monorepo's panels/__tests__/optionGating.test.tsx -- ConnectorRoutingView is
// the same shared component in both hosts.

const referenceData = {
  resources: [],
  resourceRequirements: [],
  activities: [
    { id: 'a1', name: 'Activity 1' },
    { id: 'a2', name: 'Activity 2' },
  ],
  generators: [{ id: 'gen-1', name: 'Door', routing: 'probability' }],
  connectors: [
    { id: 'c1', sourceId: 'gen-1', targetId: 'a1', weight: 1, priority: 3 },
    { id: 'c2', sourceId: 'gen-1', targetId: 'a2', weight: 1, priority: 5 },
  ],
  entities: [],
  states: [],
} as any

describe('ConnectorRoutingView over useReferenceDataAccessor (seam)', () => {
  beforeEach(() => setView('intermediate'))
  afterEach(() => setView('basic'))

  it('First Available: mode goes to the source writer, priority goes to ELEMENT_UPDATE and re-ranks from the overlay', async () => {
    const user = userEvent.setup()
    const updateElement = vi.fn<(id: string, type: string, data: Record<string, unknown>) => Promise<void>>(async () => {})
    const writer = vi.fn()
    const source = createReferenceDataAccessor(
      referenceData,
      () => ({ updateResourceRequirements: vi.fn(), updateElement }),
      () => ({ shapeWriters: { 'gen-1': writer } }),
    )

    render(<ConnectorRoutingView sourceId="gen-1" sourceType="Generator" accessor={source.accessor} />)

    await user.selectOptions(screen.getByRole('combobox'), 'first_available')

    expect(writer).toHaveBeenCalledWith({ routing: 'first_available' })
    expect(updateElement).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('first_available')) // writer-path overlay

    // Pre-edit order: c1 (priority 3) ranks ahead of c2 (priority 5).
    expect(screen.getByTestId('connector-order-c1').textContent).toMatch(/1/)
    expect(screen.getByTestId('connector-order-c2').textContent).toMatch(/2/)

    fireEvent.change(screen.getByTestId('connector-priority-input-c2'), { target: { value: '0' } }) // clamps to 1

    await waitFor(() => expect(updateElement).toHaveBeenCalledWith('c2', 'Connector', { priority: 1 }))
    // Post-edit: c2 (now priority 1) outranks c1 (priority 3) -- the order
    // flips, which only happens if the overlay actually reached the view.
    await waitFor(() => expect(screen.getByTestId('connector-order-c2').textContent).toMatch(/1/))
    expect(screen.getByTestId('connector-order-c1').textContent).toMatch(/2/)
  })

  it('with no writer, the mode change goes to ELEMENT_UPDATE for the source', async () => {
    const user = userEvent.setup()
    const updateElement = vi.fn<(id: string, type: string, data: Record<string, unknown>) => Promise<void>>(async () => {})
    const source = createReferenceDataAccessor(
      referenceData,
      () => ({ updateResourceRequirements: vi.fn(), updateElement }),
    )

    render(<ConnectorRoutingView sourceId="gen-1" sourceType="Generator" accessor={source.accessor} />)

    await user.selectOptions(screen.getByRole('combobox'), 'first_available')

    await waitFor(() => expect(updateElement).toHaveBeenCalledWith('gen-1', 'Generator', { routing: 'first_available' }))
    await waitFor(() => expect(screen.getByRole('combobox')).toHaveValue('first_available')) // overlay after the resolved ELEMENT_UPDATE
  })

  // I2/I3: the priority input is fully controlled off the snapshot with no
  // local buffer. Without an optimistic overlay it would revert to the
  // pre-edit value the instant ELEMENT_UPDATE puts saveStatus into 'saving'
  // and the snapshot rebuilds off the still-unchanged referenceData.
  const firstAvailableReferenceData = {
    ...referenceData,
    generators: [{ id: 'gen-1', name: 'Door', routing: 'first_available' }],
  }

  it('a pending priority write shows the typed value and re-ranks before ELEMENT_UPDATE_RESULT lands', async () => {
    let resolveHost!: () => void
    const updateElement = vi.fn<(id: string, type: string, data: Record<string, unknown>) => Promise<void>>(
      () => new Promise((r) => { resolveHost = r }),
    )
    const source = createReferenceDataAccessor(
      firstAvailableReferenceData,
      () => ({ updateResourceRequirements: vi.fn(), updateElement }),
    )

    render(<ConnectorRoutingView sourceId="gen-1" sourceType="Generator" accessor={source.accessor} />)

    // Pre-edit order: c1 (priority 3) ranks ahead of c2 (priority 5).
    expect(screen.getByTestId('connector-order-c1').textContent).toMatch(/1/)
    expect(screen.getByTestId('connector-order-c2').textContent).toMatch(/2/)

    fireEvent.change(screen.getByTestId('connector-priority-input-c2'), { target: { value: '0' } }) // clamps to 1

    expect(updateElement).toHaveBeenCalledWith('c2', 'Connector', { priority: 1 })
    expect(source.accessor.getSnapshot().saveStatus).toBe('saving')
    // Still pending: the optimistic overlay already shows the clamped typed
    // value and re-ranks c2 ahead of c1, ahead of any host round trip.
    expect((screen.getByTestId('connector-priority-input-c2') as HTMLInputElement).value).toBe('1')
    expect(screen.getByTestId('connector-order-c2').textContent).toMatch(/1/)
    expect(screen.getByTestId('connector-order-c1').textContent).toMatch(/2/)

    resolveHost()
    await waitFor(() => expect(source.accessor.getSnapshot().saveStatus).toBe('saved'))
    // Unchanged after the round trip resolves.
    expect((screen.getByTestId('connector-priority-input-c2') as HTMLInputElement).value).toBe('1')
    expect(screen.getByTestId('connector-order-c2').textContent).toMatch(/1/)
    expect(screen.getByTestId('connector-order-c1').textContent).toMatch(/2/)
  })

  it('a rejected priority write reverts the input to the pre-edit value and sets saveError', async () => {
    const updateElement = vi.fn<(id: string, type: string, data: Record<string, unknown>) => Promise<void>>(
      async () => { throw new Error('line not found') },
    )
    const source = createReferenceDataAccessor(
      firstAvailableReferenceData,
      () => ({ updateResourceRequirements: vi.fn(), updateElement }),
    )
    // ConnectorRoutingView dispatches updateShape without awaiting it
    // (`void accessor.updateShape(...)`) -- the adapter surfaces failure
    // through saveStatus/saveError on the snapshot, not by propagating the
    // rejection back to a caller. Attach a no-op .catch here, synchronously
    // alongside the real call, purely so that fire-and-forget rejection
    // doesn't register as unhandled in this test run.
    const rawUpdateShape = source.accessor.updateShape.bind(source.accessor)
    source.accessor.updateShape = (...args: Parameters<typeof rawUpdateShape>) => {
      const result = rawUpdateShape(...args)
      result.catch(() => {})
      return result
    }

    render(<ConnectorRoutingView sourceId="gen-1" sourceType="Generator" accessor={source.accessor} />)

    fireEvent.change(screen.getByTestId('connector-priority-input-c2'), { target: { value: '1' } })

    await waitFor(() => expect(source.accessor.getSnapshot().saveStatus).toBe('failed'))
    expect(source.accessor.getSnapshot().saveError).toBe('line not found')
    // Reverted to the pre-edit value (c2's priority was 5).
    expect((screen.getByTestId('connector-priority-input-c2') as HTMLInputElement).value).toBe('5')
  })
})
