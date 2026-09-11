// quodsim-react/src/features/editors/__tests__/StatesTab.pageSwitch.test.tsx
//
// PAGE SWITCH (final fix wave I2): ModelPanel keeps `activeTab` across a
// Lucid page switch, and ModelEditor is not keyed -- so with the States tab
// open, switching Lucid pages left StatesEditor's local `editingState` /
// `deletingState` referring to page A's data. Saving or confirming on page B
// then pushed page A's State into B's list, or deleted by A's id.
//
// This test mocks useMessaging (for a controllable page id) and renders
// StatesTab with a REAL createReferenceDataAccessor accessor (not stubbed --
// only the message sender is), proving StatesTab remounts StatesEditor (and
// so drops any open delete-confirm dialog) whenever the current page id
// changes, and does NOT remount on an unrelated re-render with the same
// page id.

import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { createReferenceDataAccessor } from '../../../adapters/useReferenceDataAccessor'
import StatesTab from '../StatesTab'

let currentPageId: string | undefined = 'page-a'
vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ selection: { documentContext: { pageId: currentPageId } } }),
}))

const STATE_A = { id: 'state_a', name: 'state_a', componentType: 'model', dataType: 'number', initialValue: 0, collectStatistics: true }
const STATE_B = { id: 'state_b', name: 'state_b', componentType: 'model', dataType: 'number', initialValue: 0, collectStatistics: true }

function makeAccessor() {
  const { accessor } = createReferenceDataAccessor(
    { states: [STATE_A, STATE_B], activities: [], generators: [], entities: [], resources: [], resourceRequirements: [], connectors: [] } as any,
    () => ({ updateResourceRequirements: async () => {}, updateStates: async () => {} }),
  )
  return accessor
}

describe('StatesTab remounts StatesEditor on a page switch', () => {
  beforeEach(() => {
    cleanup()
    currentPageId = 'page-a'
  })

  it('drops an open delete-confirm dialog when the current page id changes', () => {
    const accessor = makeAccessor()
    const { rerender } = render(<StatesTab accessor={accessor} hasStates={true} />)

    fireEvent.click(screen.getByLabelText('Delete state_a'))
    expect(screen.getByRole('button', { name: 'Delete State' })).toBeInTheDocument()

    currentPageId = 'page-b'
    rerender(<StatesTab accessor={accessor} hasStates={true} />)

    expect(screen.queryByRole('button', { name: 'Delete State' })).toBeNull()
  })

  it('keeps an open delete-confirm dialog on a same-pageId rerender', () => {
    const accessor = makeAccessor()
    const { rerender } = render(<StatesTab accessor={accessor} hasStates={true} />)

    fireEvent.click(screen.getByLabelText('Delete state_a'))
    expect(screen.getByRole('button', { name: 'Delete State' })).toBeInTheDocument()

    rerender(<StatesTab accessor={accessor} hasStates={true} />)

    expect(screen.getByRole('button', { name: 'Delete State' })).toBeInTheDocument()
  })
})
