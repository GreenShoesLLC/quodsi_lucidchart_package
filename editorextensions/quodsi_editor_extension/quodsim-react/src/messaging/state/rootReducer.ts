/**
 * Root Reducer
 * Combines all state slices into the main messaging reducer
 */

import { MessagingAction } from './types';
import { AppState, initialAppState, appReducer, AppAction } from './appSlice';
import { AuthState, initialAuthState, authReducer, AuthAction } from './authSlice';
import { SelectionState, initialSelectionState, selectionReducer, SelectionAction } from './selectionSlice';
import { SimulationState, initialSimulationState, simulationReducer, SimulationAction } from './simulationSlice';
import { ValidationState, initialValidationState, validationReducer, ValidationAction } from './validationSlice';
import { ElementOpsState, initialElementOpsState, elementOpsReducer, ElementOpsAction } from './elementOpsSlice';
import { SimulationRunState, initialSimulationRunState, simulationRunReducer, SimulationRunAction } from './simulationRunSlice';
import { ConversionPreviewState, initialConversionPreviewState, conversionPreviewReducer, ConversionPreviewAction } from './conversionPreviewSlice';
import { ScenarioDefinitionState, initialScenarioDefinitionState, scenarioDefinitionReducer, ScenarioDefinitionAction } from './scenarioDefinitionSlice';
import { EntitlementsState, initialEntitlementsState, entitlementsReducer, EntitlementsAction } from './entitlementsSlice';
import { SyncState, initialSyncState, syncReducer, SyncAction } from './syncSlice';

// Combined state type
export interface MessagingState {
  app: AppState;
  auth: AuthState;
  selection: SelectionState;
  simulation: SimulationState;
  validation: ValidationState;
  elementOps: ElementOpsState;
  simulationRuns: SimulationRunState;
  conversionPreview: ConversionPreviewState;
  scenarioDefinitions: ScenarioDefinitionState;
  entitlements: EntitlementsState;
  sync: SyncState;
}

// Export RootState as an alias for MessagingState (common Redux pattern)
export type RootState = MessagingState;

// Initial state
export const initialState: MessagingState = {
  app: initialAppState,
  auth: initialAuthState,
  selection: initialSelectionState,
  simulation: initialSimulationState,
  validation: initialValidationState,
  elementOps: initialElementOpsState,
  simulationRuns: initialSimulationRunState,
  conversionPreview: initialConversionPreviewState,
  scenarioDefinitions: initialScenarioDefinitionState,
  entitlements: initialEntitlementsState,
  sync: initialSyncState,
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
    simulation: simulationReducer(state.simulation, action as SimulationAction),
    validation: validationReducer(state.validation, action as ValidationAction),
    elementOps: elementOpsReducer(state.elementOps, action as ElementOpsAction),
    simulationRuns: simulationRunReducer(state.simulationRuns, action as SimulationRunAction),
    conversionPreview: conversionPreviewReducer(state.conversionPreview, action as ConversionPreviewAction),
    scenarioDefinitions: scenarioDefinitionReducer(state.scenarioDefinitions, action as ScenarioDefinitionAction),
    entitlements: entitlementsReducer(state.entitlements, action as EntitlementsAction),
    sync: syncReducer(state.sync, action as SyncAction),
  };
}
