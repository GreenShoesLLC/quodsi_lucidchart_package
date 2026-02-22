/**
 * Scenario Definition State Slice
 * Manages scenario definitions stored in shapeData (q_scenarios).
 * These are "what-if" parameter sets, separate from simulation run records.
 */

import { ISerializedScenario } from '@quodsi/shared';

// State shape
export interface ScenarioDefinitionState {
  scenarios: ISerializedScenario[];
  loading: boolean;
  error: string | null;
}

// Initial state
export const initialScenarioDefinitionState: ScenarioDefinitionState = {
  scenarios: [],
  loading: false,
  error: null,
};

// Action types
export type ScenarioDefinitionAction =
  | { type: 'SCENARIO_DEFINITIONS_LOADING' }
  | { type: 'SCENARIO_DEFINITIONS_SUCCESS'; scenarios: ISerializedScenario[] }
  | { type: 'SCENARIO_DEFINITIONS_ERROR'; error: string };

// Reducer
export function scenarioDefinitionReducer(
  state: ScenarioDefinitionState = initialScenarioDefinitionState,
  action: ScenarioDefinitionAction
): ScenarioDefinitionState {
  switch (action.type) {
    case 'SCENARIO_DEFINITIONS_LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'SCENARIO_DEFINITIONS_SUCCESS':
      return {
        ...state,
        scenarios: action.scenarios,
        loading: false,
        error: null,
      };

    case 'SCENARIO_DEFINITIONS_ERROR':
      return {
        ...state,
        loading: false,
        error: action.error,
      };

    default:
      return state;
  }
}

// Selectors
export const selectScenarioDefinitions = (state: { scenarioDefinitions: ScenarioDefinitionState }): ISerializedScenario[] =>
  state.scenarioDefinitions.scenarios;

export const selectScenarioDefinitionsLoading = (state: { scenarioDefinitions: ScenarioDefinitionState }): boolean =>
  state.scenarioDefinitions.loading;

export const selectScenarioDefinitionsError = (state: { scenarioDefinitions: ScenarioDefinitionState }): string | null =>
  state.scenarioDefinitions.error;
