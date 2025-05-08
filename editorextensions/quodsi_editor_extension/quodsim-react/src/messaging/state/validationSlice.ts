/**
 * Validation State Slice
 * Manages model validation state and errors
 */

// State shape
export interface ValidationError {
  id: string;
  elementId?: string;
  type: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface ValidationState {
  isValid: boolean;
  errors: ValidationError[];
  lastUpdated?: number;
}

// Initial state
export const initialValidationState: ValidationState = {
  isValid: true,
  errors: [],
  lastUpdated: undefined,
};

// Action types
export type ValidationAction = 
  | { type: 'VALIDATION_RESULT'; isValid: boolean; errors: ValidationError[] }
  | { type: 'VALIDATION_RESET' };

// Reducer
export function validationReducer(state: ValidationState = initialValidationState, action: ValidationAction): ValidationState {
  switch (action.type) {
    case 'VALIDATION_RESULT':
      return {
        ...state,
        isValid: action.isValid,
        errors: action.errors,
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
