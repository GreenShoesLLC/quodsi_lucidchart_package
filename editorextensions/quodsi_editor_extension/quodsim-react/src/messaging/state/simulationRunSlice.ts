/**
 * SimulationRun State Slice
 * Manages the list of simulation runs for the current document
 * Provides state for detecting active simulations
 */

import { RunState, SimulationRunInfo } from '@quodsi/lucid-shared';

// Use SimulationRunInfo from shared package and alias as SimulationRun for backward compatibility
export type SimulationRun = SimulationRunInfo;

// State shape
export interface SimulationRunState {
  simulationRuns: SimulationRun[];
  loading: boolean;
  error: string | null;
}

// Initial state
export const initialSimulationRunState: SimulationRunState = {
  simulationRuns: [],
  loading: false,
  error: null,
};

// Action types
export type SimulationRunAction =
  | { type: 'SIMULATION_RUNS_LOADING' }
  | { type: 'SIMULATION_RUNS_SUCCESS'; simulationRuns: SimulationRun[] }
  | { type: 'SIMULATION_RUNS_ERROR'; error: string }
  | { type: 'SIMULATION_RUN_UPDATE_STATUS'; simulationRunId: string; runState: RunState; hasResults?: boolean };

// Reducer
export function simulationRunReducer(
  state: SimulationRunState = initialSimulationRunState,
  action: SimulationRunAction
): SimulationRunState {
  switch (action.type) {
    case 'SIMULATION_RUNS_LOADING':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'SIMULATION_RUNS_SUCCESS':
      return {
        ...state,
        simulationRuns: action.simulationRuns,
        loading: false,
        error: null,
      };

    case 'SIMULATION_RUNS_ERROR':
      return {
        ...state,
        loading: false,
        error: action.error,
      };

    case 'SIMULATION_RUN_UPDATE_STATUS': {
      const simulationRuns = state.simulationRuns.map((simulationRun) =>
        simulationRun.id === action.simulationRunId
          ? {
              ...simulationRun,
              runState: action.runState,
              hasResults: action.hasResults !== undefined ? action.hasResults : simulationRun.hasResults,
            }
          : simulationRun
      );
      return {
        ...state,
        simulationRuns,
      };
    }

    default:
      return state;
  }
}

// Selectors
export const selectSimulationRuns = (state: { simulationRuns: SimulationRunState }): SimulationRun[] =>
  state.simulationRuns.simulationRuns;

export const selectSimulationRunsLoading = (state: { simulationRuns: SimulationRunState }): boolean =>
  state.simulationRuns.loading;

export const selectSimulationRunsError = (state: { simulationRuns: SimulationRunState }): string | null =>
  state.simulationRuns.error;

/**
 * Select whether there are any active simulation jobs
 * Returns true if any simulation run has runState === RunState.Running or RunState.Queued
 * (Both states indicate a job is in progress and should disable "Run Simulation" button)
 */
export const selectHasActiveJobs = (state: { simulationRuns: SimulationRunState }): boolean =>
  state.simulationRuns.simulationRuns.some((simulationRun) =>
    simulationRun.runState === RunState.Running || simulationRun.runState === RunState.Queued
  );
