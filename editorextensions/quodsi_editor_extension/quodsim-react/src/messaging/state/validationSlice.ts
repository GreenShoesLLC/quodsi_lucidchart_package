/**
 * Validation State Slice
 * Manages model validation state and errors
 */

import { ValidationIssue } from '@quodsi/shared';

// State shape
export interface ValidationState {
  isValid: boolean;
  issues: ValidationIssue[];
  summary: {
    errorCount: number;
    warningCount: number;
    infoCount: number;
  };
  lastUpdated?: number;
}

// Initial state
export const initialValidationState: ValidationState = {
  isValid: true,
  issues: [],
  summary: {
    errorCount: 0,
    warningCount: 0,
    infoCount: 0
  },
  lastUpdated: undefined,
};

// Action types
export type ValidationAction =
  | { type: 'VALIDATION_RESULT'; isValid: boolean; issues: ValidationIssue[]; summary: { errorCount: number; warningCount: number; infoCount: number } }
  | { type: 'VALIDATION_RESET' };

// Reducer
export function validationReducer(state: ValidationState = initialValidationState, action: ValidationAction): ValidationState {
  switch (action.type) {
    case 'VALIDATION_RESULT':
      return {
        ...state,
        isValid: action.isValid,
        issues: action.issues,
        summary: action.summary,
        lastUpdated: Date.now(),
      };
    case 'VALIDATION_RESET':
      return {
        ...initialValidationState,
        lastUpdated: Date.now(),
      };
    default:
      return state;
  }
}
