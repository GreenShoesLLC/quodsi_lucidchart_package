/**
 * App State Slice
 * Manages the application initialization, panel type, and pending requests
 */

import { PendingRequests } from './types';

// State shape
export interface AppState {
  initialized: boolean;
  panelType?: 'auth' | 'model';
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
  | { type: 'APP_INITIALIZE'; panelType: 'auth' | 'model' }
  | { type: 'ADD_PENDING_REQUEST'; id: string; requestType: string }
  | { type: 'REMOVE_PENDING_REQUEST'; id: string };

// Reducer
export function appReducer(state: AppState = initialAppState, action: AppAction): AppState {
  switch (action.type) {
    case 'APP_INITIALIZE':
      return {
        ...state,
        initialized: true,
        panelType: action.panelType,
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
    default:
      return state;
  }
}
