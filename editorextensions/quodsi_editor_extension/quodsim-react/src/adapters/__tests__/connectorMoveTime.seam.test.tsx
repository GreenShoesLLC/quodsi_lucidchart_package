// Real ConnectorRoutingView + ConnectorMoveTimeSection + real
// createReferenceDataAccessor, fake senders.
//
// ConnectorMoveTimeSection only renders inside a ConnectorRoutingCard when
// that card is the selected connector (`selectedConnectorId` prop on
// ConnectorRoutingView) -- see ConnectorRoutingView.tsx's `isSelected &&
// <ConnectorMoveTimeSection .../>`. Its onActionsChange goes through
// ConnectorRoutingView's handleActionsChange, which calls
// `accessor.updateShape(connectorId, 'Connector', { actions: next })` --
// exactly the same no-shape-writer path the priority field uses in
// connectorRoutingView.seam.test.tsx (there is no shapeWriter for a
// Connector, only for the routing SOURCE), so this always lands on the
// ELEMENT_UPDATE sender. Task 7 (connector-move-time-actions): this is the
// seam pin that the section's edits actually reach the host, not just that
// ConnectorLucid can round-trip an actions array it's handed directly.
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ConnectorRoutingView } from 'quodsi_studio/platforms/shared'
import { createReferenceDataAccessor } from '../useReferenceDataAccessor'

const referenceData = {
  resources: [],
  resourceRequirements: [],
  activities: [{ id: 'a1', name: 'Activity 1' }],
  generators: [{ id: 'gen-1', name: 'Door', routing: 'probability' }],
  connectors: [
    { id: 'c1', sourceId: 'gen-1', targetId: 'a1', weight: 1 },
  ],
  entities: [],
  states: [],
} as any

describe('ConnectorMoveTimeSection over useReferenceDataAccessor (seam)', () => {
  it('adding a move time on the selected connector sends a Connector patch with a one-element DELAY action list', async () => {
    const updateElement = vi.fn<(id: string, type: string, data: Record<string, unknown>) => Promise<void>>(async () => {})
    const source = createReferenceDataAccessor(
      referenceData,
      () => ({ updateResourceRequirements: vi.fn(), updateElement }),
      // No shapeWriters registered for 'c1' -- a Connector edit has no
      // writer of its own (only the routing SOURCE can get one), so this
      // must go through ELEMENT_UPDATE, same as the priority field.
    )

    render(
      <ConnectorRoutingView
        sourceId="gen-1"
        sourceType="Generator"
        accessor={source.accessor}
        selectedConnectorId="c1"
      />,
    )

    // The section only renders for the selected connector's card.
    expect(screen.getByTestId('connector-move-time-section')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('connector-move-time-add'))

    await waitFor(() => expect(updateElement).toHaveBeenCalledTimes(1))
    const [id, type, data] = updateElement.mock.calls[0]
    expect(id).toBe('c1')
    expect(type).toBe('Connector')
    const actions = (data as { actions: Array<{ type: string }> }).actions
    expect(actions).toHaveLength(1)
    expect(actions[0].type).toBe('delay')

    // Optimistic overlay: the section reflects the new move time immediately,
    // without waiting on the (already-resolved, in this test) round trip.
    await waitFor(() => expect(screen.getByTestId('connector-move-time-clear')).toBeInTheDocument())
  })
})
