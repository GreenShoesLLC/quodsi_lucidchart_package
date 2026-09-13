// quodsim-react/src/adapters/toSharedValidationResult.ts
//
// The extension's validation result (typed with @quodsi/lucid-shared) handed
// to the shared Model editor (typed with @quodsi/shared). The two packages
// declare separate ValidationSeverity enums with identical string values, and
// TypeScript enums are nominal, so the types do not assign even though the
// objects are the same shape. The test pins the value equality that makes this
// identity conversion safe.

import type { ValidationResult as LucidValidationResult } from '@quodsi/lucid-shared'
import type { ValidationResult } from '@quodsi/shared'

export function toSharedValidationResult(result: LucidValidationResult | null): ValidationResult | null {
  return result as unknown as ValidationResult | null
}
