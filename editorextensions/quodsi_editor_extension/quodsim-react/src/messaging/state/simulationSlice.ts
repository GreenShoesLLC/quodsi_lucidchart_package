/**
 * Simulation State Slice
 * Manages simulation status, progress, and results
 */

import { SimulationStatus } from './types';

// State shape
export interface SimulationState {
  status: SimulationStatus;
  jobId?: string;
  progress?: number;
  startedAt?: number;
  completedAt?: number;
  results?: any; // Replace with proper types for simulation results
  error?: string;
  lastUpdated?: number;
}

// Initial state
export const initialSimulationState: SimulationState = {
  status: SimulationStatus.IDLE,
  jobId: undefined,
  progress: undefined,
  startedAt: undefined,
  completedAt: undefined,
  results: undefined,
  error: undefined,
  lastUpdated: undefined,
};

// Action types
export type SimulationAction = 
  | { type: 'SIMULATION_START'; jobId: string }
  | { type: 'SIMULATION_PROGRESS'; progress: number }
  | { type: 'SIMULATION_COMPLETE'; results: any }
  | { type: 'SIMULATION_ERROR'; error: string }
  | { type: 'SIMULATION_RESET' };

// Reducer
export function simulationReducer(state: SimulationState = initialSimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'SIMULATION_START':
      return {
        ...state,
        status: SimulationStatus.RUNNING,
        jobId: action.jobId,
        startedAt: Date.now(),
        completedAt: undefined,
        results: undefined,
        error: undefined,
        lastUpdated: Date.now(),
      };
    case 'SIMULATION_PROGRESS':
      return {
        ...state,
        progress: action.progress,
        lastUpdated: Date.now(),
      };
    case 'SIMULATION_COMPLETE':
      return {
        ...state,
        status: SimulationStatus.COMPLETED,
        completedAt: Date.now(),
        results: action.results,
        lastUpdated: Date.now(),
      };
    case 'SIMULATION_ERROR':
      return {
        ...state,
        status: SimulationStatus.ERROR,
        error: action.error,
        lastUpdated: Date.now(),
      };
    case 'SIMULATION_RESET':
      return {
        ...initialSimulationState,
        lastUpdated: Date.now(),
      };
    default:
      return state;
  }
}
