import { describe, it, expect } from 'vitest'
import { toSharedEntitlements } from '../lucidEntitlementsSource'

describe('toSharedEntitlements (spec 2026-09-13 §1)', () => {
  it('maps the messaging replications limit onto the shared snake_case field', () => {
    expect(toSharedEntitlements(5)).toEqual({ replications_per_scenario_limit: 5 })
  })

  it('has no entitlements when the limit is null or unknown', () => {
    expect(toSharedEntitlements(null)).toBeUndefined()
    expect(toSharedEntitlements(undefined)).toBeUndefined()
  })
})
