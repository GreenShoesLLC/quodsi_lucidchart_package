/**
 * Scenario State Slice
 * Manages the list of scenarios for the current document
 * Provides state for detecting active simulations
 */

import { RunState } from '@quodsi/shared';

// Scenario interface matching data from ListScenarios action
export interface Scenario {
  id: string;
  name: string;
  runState: RunState;
  reps: number;
  runClockPeriod: number;
  runClockPeriodUnit: string;
  simulationTimeType: string;
  completedAt?: string;
  hasResults: boolean;
  downloadInfo?: {
    zipUrl: string;
    fileSizeBytes: number;
    fileSizeMB: string;
    expiresAt: string;
  };
}

// State shape
export interface ScenarioState {
  scenarios: Scenario[];
  loading: boolean;
  error: string | null;
}

// Initial state
export const initialScenarioState: ScenarioState = {
  scenarios: [],
  loading: false,
  error: null,
};

// Action types
export type ScenarioAction =
  | { type: 'SCENARIOS_LOADING' }
  | { type: 'SCENARIOS_SUCCESS'; scenarios: Scenario[] }
  | { type: 'SCENARIOS_ERROR'; error: string }
  | { type: 'SCENARIO_UPDATE_STATUS'; scenarioId: string; runState: RunState; hasResults?: boolean };

// Reducer
export function scenarioReducer(
  state: ScenarioState = initialScenarioState,
  action: ScenarioAction
): ScenarioState {
  switch (action.type) {
    case 'SCENARIOS_LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'SCENARIOS_SUCCESS':
      return {
        ...state,
        scenarios: action.scenarios,
        loading: false,
        error: null,
      };

    case 'SCENARIOS_ERROR':
      return {
        ...state,
        loading: false,
        error: action.error,
      };

    case 'SCENARIO_UPDATE_STATUS': {
      const scenarios = state.scenarios.map((scenario) =>
        scenario.id === action.scenarioId
          ? {
              ...scenario,
              runState: action.runState,
              hasResults: action.hasResults !== undefined ? action.hasResults : scenario.hasResults,
            }
          : scenario
      );
      return {
        ...state,
        scenarios,
      };
    }

    default:
      return state;
  }
}

// Selectors
export const selectScenarios = (state: { scenarios: ScenarioState }): Scenario[] =>
  state.scenarios.scenarios;

export const selectScenariosLoading = (state: { scenarios: ScenarioState }): boolean =>
  state.scenarios.loading;

export const selectScenariosError = (state: { scenarios: ScenarioState }): string | null =>
  state.scenarios.error;

/**
 * Select whether there are any active simulation jobs
 * Returns true if any scenario has runState === RunState.Running
 */
export const selectHasActiveJobs = (state: { scenarios: ScenarioState }): boolean =>
  state.scenarios.scenarios.some((scenario) => scenario.runState === RunState.Running);
