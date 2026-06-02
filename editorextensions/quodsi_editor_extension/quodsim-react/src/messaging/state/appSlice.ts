/**
 * App State Slice
 * Manages the application initialization, panel type, and pending requests
 */

import { PendingRequests } from './types';

// State shape
export interface AppState {
  initialized: boolean;
  panelType?: 'auth' | 'model' | 'results' | 'studio-embed-spike';
  pendingRequests: PendingRequests;
}

// Initial state
export const initialAppState: AppState = {
  initialized: false,
  panelType: undefined,
  pendingRequests: {},
};

// Action types
export type AppAction =
  | { type: 'APP_INITIALIZE'; panelType: 'auth' | 'model' | 'results' | 'studio-embed-spike' }
  | { type: 'ADD_PENDING_REQUEST'; id: string; requestType: string }
  | { type: 'REMOVE_PENDING_REQUEST'; id: string }
  | { type: 'MODEL_CONVERSION_SUCCESS'; success: boolean }
  | { type: 'MODEL_REMOVAL_SUCCESS'; success: boolean };

// Reducer
export function appReducer(state: AppState = initialAppState, action: AppAction): AppState {
  switch (action.type) {
    case 'APP_INITIALIZE':
      return {
        ...state,
        initialized: true,
        panelType: action.panelType as AppState['panelType'],
      };
    case 'ADD_PENDING_REQUEST':
      return {
        ...state,
        pendingRequests: {
          ...state.pendingRequests,
          [action.id]: {
            requestType: action.requestType,
            timestamp: Date.now(),
          },
        },
      };
    case 'REMOVE_PENDING_REQUEST': {
      const { [action.id]: removed, ...remaining } = state.pendingRequests;
      return {
        ...state,
        pendingRequests: remaining,
      };
    }
    case 'MODEL_CONVERSION_SUCCESS':
      // For now, just return the current state but this triggers a re-render
      // which should help the UI transition properly after conversion
      return {
        ...state,
        // Could add a conversion success flag here if needed
      };
    case 'MODEL_REMOVAL_SUCCESS':
      // For now, just return the current state but this triggers a re-render
      // which should help the UI transition properly after removal
      return {
        ...state,
        // Could add a removal success flag here if needed
      };
    default:
      return state;
  }
}
