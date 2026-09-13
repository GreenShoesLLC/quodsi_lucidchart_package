import { describe, it, expect } from 'vitest'
import { ValidationSeverity as LucidValidationSeverity } from '@quodsi/lucid-shared'
import type { ValidationResult as LucidValidationResult } from '@quodsi/lucid-shared'
import { ValidationSeverity } from '@quodsi/shared'
import { toSharedValidationResult } from '../toSharedValidationResult'

describe('toSharedValidationResult (spec 2026-09-13 §1)', () => {
  it("is safe only because lucid-shared's severity enum carries @quodsi/shared's exact values", () => {
    expect(Object.entries(LucidValidationSeverity)).toEqual(Object.entries(ValidationSeverity))
  })

  it('hands the same result object through, and null through as null', () => {
    const result: LucidValidationResult = {
      isValid: false,
      issues: [{ id: 'i1', severity: LucidValidationSeverity.ERROR, code: 'c', message: 'm' }],
      summary: { errorCount: 1, warningCount: 0, infoCount: 0 },
    }

    expect(toSharedValidationResult(result)).toBe(result)
    expect(toSharedValidationResult(null)).toBeNull()
  })
})
