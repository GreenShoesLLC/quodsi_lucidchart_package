/**
 * Root Reducer
 * Combines all state slices into the main messaging reducer
 */

import { MessagingAction } from './types';
import { AppState, initialAppState, appReducer, AppAction } from './appSlice';
import { SelectionState, initialSelectionState, selectionReducer, SelectionAction } from './selectionSlice';
import { SimulationState, initialSimulationState, simulationReducer, SimulationAction } from './simulationSlice';
import { ValidationState, initialValidationState, validationReducer, ValidationAction } from './validationSlice';
import { ElementOpsState, initialElementOpsState, elementOpsReducer, ElementOpsAction } from './elementOpsSlice';
import { ScenarioState, initialScenarioState, scenarioReducer, ScenarioAction } from './scenarioSlice';
import { ConversionPreviewState, initialConversionPreviewState, conversionPreviewReducer, ConversionPreviewAction } from './conversionPreviewSlice';

// Combined state type
export interface MessagingState {
  app: AppState;
  selection: SelectionState;
  simulation: SimulationState;
  validation: ValidationState;
  elementOps: ElementOpsState;
  scenarios: ScenarioState;
  conversionPreview: ConversionPreviewState;
}

// Export RootState as an alias for MessagingState (common Redux pattern)
export type RootState = MessagingState;

// Initial state
export const initialState: MessagingState = {
  app: initialAppState,
  selection: initialSelectionState,
  simulation: initialSimulationState,
  validation: initialValidationState,
  elementOps: initialElementOpsState,
  scenarios: initialScenarioState,
  conversionPreview: initialConversionPreviewState,
};

/**
 * Main messaging reducer function
 * Routes actions to the appropriate slice reducer
 */
export function messagingReducer(state: MessagingState = initialState, action: MessagingAction): MessagingState {
  return {
    app: appReducer(state.app, action as AppAction),
    selection: selectionReducer(state.selection, action as SelectionAction),
    simulation: simulationReducer(state.simulation, action as SimulationAction),
    validation: validationReducer(state.validation, action as ValidationAction),
    elementOps: elementOpsReducer(state.elementOps, action as ElementOpsAction),
    scenarios: scenarioReducer(state.scenarios, action as ScenarioAction),
    conversionPreview: conversionPreviewReducer(state.conversionPreview, action as ConversionPreviewAction),
  };
}
