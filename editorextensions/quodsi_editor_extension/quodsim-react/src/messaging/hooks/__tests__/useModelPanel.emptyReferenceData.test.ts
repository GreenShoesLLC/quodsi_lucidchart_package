// quodsim-react/src/messaging/hooks/__tests__/useModelPanel.emptyReferenceData.test.ts
//
// Before the host's first real referenceData arrives, useModelPanel
// substitutes a frozen EMPTY_REFERENCE_DATA. It carries no `states` key, so
// "not loaded yet" stays distinguishable from a loaded model with zero states.

import { renderHook } from '@testing-library/react'

vi.mock('../../MessageProvider', () => ({
  useMessaging: () => ({
    selection: {
      selectedElements: [],
      documentContext: undefined,
      referenceData: undefined,
      diagramElementType: undefined,
      lastUpdated: undefined,
    },
    validation: { isValid: true, issues: [], summary: undefined },
    simulation: { error: null, lastUpdated: undefined },
    app: { initialized: true },
  }),
}))

vi.mock('../../senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({
    updateElementData: vi.fn(),
    convertElement: vi.fn(),
    validateModel: vi.fn(),
    removeModel: vi.fn(),
    convertPage: vi.fn(),
  }),
}))

vi.mock('../../senders/simulationSender', () => ({
  useSimulationSender: () => ({
    requestSimulation: vi.fn(),
  }),
}))

import { useModelPanel, EMPTY_REFERENCE_DATA } from '../useModelPanel'

describe('useModelPanel EMPTY_REFERENCE_DATA fallback', () => {
  it('has no `states` key -- absence, not an empty array, is what tells the States tab "not loaded yet"', () => {
    expect('states' in EMPTY_REFERENCE_DATA).toBe(false)
  })

  it('useModelPanel exposes that same fallback (no referenceData.states key) when selection carries no referenceData', () => {
    const { result } = renderHook(() => useModelPanel())
    expect('states' in result.current.referenceData).toBe(false)
    // The OTHER reader (states: referenceData?.states || []) still degrades
    // safely to an empty array -- this fix must not break it.
    expect(result.current.states).toEqual([])
  })
})
