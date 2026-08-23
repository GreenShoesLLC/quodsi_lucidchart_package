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
// The mode <select> has no accessible name (its <label> isn't associated via
// htmlFor/id) -- getByRole('combobox') with no name filter is the only
// selector that resolves it, and it stays the only combobox on screen in
// First Available mode (that connect type renders a priority <input>, not a
// <select>).
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConnectorRoutingView } from 'quodsi_studio/platforms/shared'
import { createReferenceDataAccessor } from '../useReferenceDataAccessor'

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
})
