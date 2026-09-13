// A clean model must read as "reads ready", never "pending" (final-fix brief
// 2026-09-13, Fix 1). `lastUpdated` is the "has a result arrived" signal the
// rest of the pipeline (useModelPanel, the shared Model editor) keys off of:
// VALIDATION_RESULT must set it even with zero issues, and VALIDATION_RESET
// must clear it back to `undefined` so a reset reads as pending again.

import { validationReducer, initialValidationState } from './validationSlice';

describe('validationReducer', () => {
  test('VALIDATION_RESULT with no issues still sets lastUpdated', () => {
    const s = validationReducer(initialValidationState, {
      type: 'VALIDATION_RESULT',
      isValid: true,
      issues: [],
      summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
    });

    expect(s.lastUpdated).not.toBeUndefined();
    expect(s.isValid).toBe(true);
    expect(s.issues).toEqual([]);
  });

  test('VALIDATION_RESET returns lastUpdated undefined (reads as pending again)', () => {
    const afterResult = validationReducer(initialValidationState, {
      type: 'VALIDATION_RESULT',
      isValid: true,
      issues: [],
      summary: { errorCount: 0, warningCount: 0, infoCount: 0 },
    });

    const afterReset = validationReducer(afterResult, { type: 'VALIDATION_RESET' });

    expect(afterReset.lastUpdated).toBeUndefined();
    expect(afterReset).toEqual(initialValidationState);
  });
});
