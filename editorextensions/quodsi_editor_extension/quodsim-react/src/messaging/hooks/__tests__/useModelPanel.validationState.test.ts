// useModelPanel.validationState.test.ts
//
// Final-fix brief 2026-09-13, Fix 1: a clean (zero-issue) validation result
// must not read as "no result yet". "A result has arrived" is
// `validation.lastUpdated !== undefined`; useModelPanel must feed the shared
// Model editor a real ValidationResult in that case, `null` only before the
// first result.

import { renderHook } from '@testing-library/react'

const messaging = vi.hoisted(() => ({ current: {} as any }))
vi.mock('../../MessageProvider', () => ({ useMessaging: () => messaging.current }))

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
  useSimulationSender: () => ({ requestSimulation: vi.fn() }),
}))

import { useModelPanel } from '../useModelPanel'

function baseMessaging(validation: any) {
  return {
    selection: {
      selectedElements: [],
      documentContext: undefined,
      referenceData: undefined,
      diagramElementType: undefined,
      lastUpdated: undefined,
    },
    validation,
    simulation: { error: null, lastUpdated: undefined },
    app: { initialized: true },
  }
}

describe('useModelPanel validationState (final-fix brief 2026-09-13, Fix 1)', () => {
  it('is null before any result has arrived (lastUpdated undefined)', () => {
    messaging.current = baseMessaging({
      isValid: true,
      issues: [],
      summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
      lastUpdated: undefined,
    })

    const { result } = renderHook(() => useModelPanel())

    expect(result.current.validationState).toBeNull()
  })

  it('is a real, valid result once a zero-issue VALIDATION_RESULT has arrived', () => {
    messaging.current = baseMessaging({
      isValid: true,
      issues: [],
      summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
      lastUpdated: Date.now(),
    })

    const { result } = renderHook(() => useModelPanel())

    expect(result.current.validationState).not.toBeNull()
    expect(result.current.validationState?.isValid).toBe(true)
    expect(result.current.validationState?.issues).toEqual([])
  })
})
