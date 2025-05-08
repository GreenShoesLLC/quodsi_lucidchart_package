/**
 * Root Reducer
 * Combines all state slices into the main messaging reducer
 */

import { MessagingAction } from './types';
import { AppState, initialAppState, appReducer, AppAction } from './appSlice';
import { AuthState, initialAuthState, authReducer, AuthAction } from './authSlice';
import { SelectionState, initialSelectionState, selectionReducer, SelectionAction } from './selectionSlice';
import { SubscriptionState, initialSubscriptionState, subscriptionReducer, SubscriptionAction } from './subscriptionSlice';
import { SimulationState, initialSimulationState, simulationReducer, SimulationAction } from './simulationSlice';
import { ValidationState, initialValidationState, validationReducer, ValidationAction } from './validationSlice';

// Combined state type
export interface MessagingState {
  app: AppState;
  auth: AuthState;
  selection: SelectionState;
  subscription: SubscriptionState;
  simulation: SimulationState;
  validation: ValidationState;
}

// Initial state
export const initialState: MessagingState = {
  app: initialAppState,
  auth: initialAuthState,
  selection: initialSelectionState,
  subscription: initialSubscriptionState,
  simulation: initialSimulationState,
  validation: initialValidationState,
};

/**
 * Main messaging reducer function
 * Routes actions to the appropriate slice reducer
 */
export function messagingReducer(state: MessagingState = initialState, action: MessagingAction): MessagingState {
  return {
    app: appReducer(state.app, action as AppAction),
    auth: authReducer(state.auth, action as AuthAction),
    selection: selectionReducer(state.selection, action as SelectionAction),
    subscription: subscriptionReducer(state.subscription, action as SubscriptionAction),
    simulation: simulationReducer(state.simulation, action as SimulationAction),
    validation: validationReducer(state.validation, action as ValidationAction),
  };
}
