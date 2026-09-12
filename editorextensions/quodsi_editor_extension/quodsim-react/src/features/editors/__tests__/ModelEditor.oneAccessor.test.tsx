// Every list tab of the Model editor is handed the editor's ONE model-root
// accessor (spec 2026-09-12 §4). The tab bodies are covered end to end
// elsewhere (statesTab, requirementsTab, EntitiesTab.projection,
// ResourcesTab.hostCleanup); here only the wiring is pinned.
import React from 'react'
import { screen, cleanup } from '@testing-library/react'
import { setView } from 'quodsi_studio/platforms/shared'

const received = vi.hoisted(() => ({} as Record<string, unknown>))

vi.mock('../StatesTab', () => ({
  StatesTab: (p: { accessor: unknown }) => { received.states = p.accessor; return <div data-testid="states-tab" /> },
}))
vi.mock('../EntitiesTab', () => ({
  EntitiesTab: (p: { accessor: unknown }) => { received.entities = p.accessor; return <div data-testid="entities-tab" /> },
}))
vi.mock('../ResourcesTab', () => ({
  ResourcesTab: (p: { accessor: unknown }) => { received.resources = p.accessor; return <div data-testid="resources-tab" /> },
}))
vi.mock('../ArrivalsTab', () => ({
  ArrivalsTab: (p: { accessor: unknown }) => { received.arrivals = p.accessor; return <div data-testid="arrivals-tab" /> },
}))
vi.mock('../SchedulesTab', () => ({
  SchedulesTab: (p: { accessor: unknown }) => { received.schedules = p.accessor; return <div data-testid="schedules-tab" /> },
}))

import { definition, mountModelEditor } from './modelEditorSeam'

describe('ModelEditor — one accessor for every tab', () => {
  // Arrivals and Schedules are 'advanced' in quodsi_shared/src/views/catalog.ts.
  beforeEach(() => setView('advanced'))
  afterEach(() => { cleanup(); setView('basic') })

  it.each(['states', 'entities', 'resources', 'arrivals', 'schedules'] as const)(
    "the %s tab gets the editor's accessor",
    (tab) => {
      const { accessor } = mountModelEditor(definition(), { props: { activeTab: tab } })
      expect(screen.getByTestId(`${tab}-tab`)).toBeInTheDocument()
      expect(received[tab]).toBe(accessor)
    },
  )
})
