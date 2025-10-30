/**
 * Element Operations State Slice
 * Manages save state, errors, and optimistic updates for element editing
 */

// State shape
export interface ElementOpsState {
  // Set of element IDs currently being saved
  savingElements: Set<string>;

  // Map of element ID to error message for failed saves
  saveErrors: Record<string, string>;

  // Map of element ID to timestamp of last successful save
  lastSaveTimestamp: Record<string, number>;

  // Optimistic data for elements being saved
  optimisticData: Record<string, any>;

  lastUpdated?: number;
}

// Initial state
export const initialElementOpsState: ElementOpsState = {
  savingElements: new Set<string>(),
  saveErrors: {},
  lastSaveTimestamp: {},
  optimisticData: {},
  lastUpdated: undefined,
};

// Action types
export type ElementOpsAction =
  | { type: 'ELEMENT_SAVE_START'; elementId: string; optimisticData?: any }
  | { type: 'ELEMENT_SAVE_SUCCESS'; elementId: string }
  | { type: 'ELEMENT_SAVE_ERROR'; elementId: string; errorMessage: string }
  | { type: 'ELEMENT_SAVE_CLEAR'; elementId: string }
  | { type: 'ELEMENT_OPS_RESET' };

// Reducer
export function elementOpsReducer(state: ElementOpsState = initialElementOpsState, action: ElementOpsAction): ElementOpsState {
  switch (action.type) {
    case 'ELEMENT_SAVE_START': {
      const newSavingElements = new Set(state.savingElements);
      newSavingElements.add(action.elementId);

      const newOptimisticData = { ...state.optimisticData };
      if (action.optimisticData) {
        newOptimisticData[action.elementId] = action.optimisticData;
      }

      const newSaveErrors = { ...state.saveErrors };
      delete newSaveErrors[action.elementId]; // Clear any previous errors

      return {
        ...state,
        savingElements: newSavingElements,
        saveErrors: newSaveErrors,
        optimisticData: newOptimisticData,
        lastUpdated: Date.now(),
      };
    }

    case 'ELEMENT_SAVE_SUCCESS': {
      const newSavingElements = new Set(state.savingElements);
      newSavingElements.delete(action.elementId);

      const newOptimisticData = { ...state.optimisticData };
      delete newOptimisticData[action.elementId]; // Clear optimistic data

      return {
        ...state,
        savingElements: newSavingElements,
        optimisticData: newOptimisticData,
        lastSaveTimestamp: {
          ...state.lastSaveTimestamp,
          [action.elementId]: Date.now(),
        },
        lastUpdated: Date.now(),
      };
    }

    case 'ELEMENT_SAVE_ERROR': {
      const newSavingElements = new Set(state.savingElements);
      newSavingElements.delete(action.elementId);

      const newOptimisticData = { ...state.optimisticData };
      delete newOptimisticData[action.elementId]; // Clear optimistic data

      return {
        ...state,
        savingElements: newSavingElements,
        optimisticData: newOptimisticData,
        saveErrors: {
          ...state.saveErrors,
          [action.elementId]: action.errorMessage,
        },
        lastUpdated: Date.now(),
      };
    }

    case 'ELEMENT_SAVE_CLEAR': {
      const newSavingElements = new Set(state.savingElements);
      newSavingElements.delete(action.elementId);

      const newSaveErrors = { ...state.saveErrors };
      delete newSaveErrors[action.elementId];

      const newOptimisticData = { ...state.optimisticData };
      delete newOptimisticData[action.elementId];

      return {
        ...state,
        savingElements: newSavingElements,
        saveErrors: newSaveErrors,
        optimisticData: newOptimisticData,
        lastUpdated: Date.now(),
      };
    }

    case 'ELEMENT_OPS_RESET':
      return {
        ...initialElementOpsState,
        lastUpdated: Date.now(),
      };

    default:
      return state;
  }
}
