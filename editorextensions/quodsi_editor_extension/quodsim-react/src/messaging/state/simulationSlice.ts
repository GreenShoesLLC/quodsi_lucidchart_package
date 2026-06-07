/**
 * Simulation State Slice
 * Manages simulation status, progress, and results
 */

import { SimulationStatus } from '@quodsi/lucid-shared';

// State shape
export interface SimulationState {
  isRunning: boolean;
  jobId: string | null;
  documentId: string | null;
  scenarioId: string | null;
  scenarioName: string | null;
  status: SimulationStatus;
  progress: number;
  currentStep: string | null;
  lastChecked: string | null;
  queuedAt: string | null;
  error: string | null;
  resultUrl: string | null;
  startedAt?: number;
  completedAt?: number;
  results?: any; // Replace with proper types for simulation results
  lastUpdated?: number;
}

// Initial state
export const initialSimulationState: SimulationState = {
  isRunning: false,
  jobId: null,
  documentId: null,
  scenarioId: null,
  scenarioName: null,
  status: SimulationStatus.IDLE,
  progress: 0,
  currentStep: null,
  lastChecked: null,
  queuedAt: null,
  error: null,
  resultUrl: null,
  startedAt: undefined,
  completedAt: undefined,
  results: undefined,
  lastUpdated: undefined,
};

// Action types (SIMULATION_START removed, consolidated into SIMULATION_PROGRESS)
export type SimulationAction =
  | {
      type: 'SIMULATION_PROGRESS';
      jobId?: string;
      documentId?: string;
      scenarioId?: string;
      scenarioName?: string;
      status?: SimulationStatus;
      progress?: number;
      currentStep?: string;
      lastChecked?: string;
      queuedAt?: string;
    }
  | {
      type: 'SIMULATION_COMPLETE';
      jobId?: string;
      documentId?: string;
      scenarioId?: string;
      resultUrl?: string;
      results?: any;
    }
  | {
      type: 'SIMULATION_ERROR';
      jobId?: string;
      error: string;
    }
  | { type: 'SIMULATION_RESET' };

// Reducer
export function simulationReducer(state: SimulationState = initialSimulationState, action: SimulationAction): SimulationState {
  switch (action.type) {
    case 'SIMULATION_PROGRESS':
      return {
        ...state,
        isRunning: true,
        jobId: action.jobId ?? state.jobId,
        documentId: action.documentId ?? state.documentId,
        scenarioId: action.scenarioId ?? state.scenarioId,
        scenarioName: action.scenarioName ?? state.scenarioName,
        status: action.status ?? state.status,
        progress: action.progress ?? state.progress,
        currentStep: action.currentStep ?? state.currentStep,
        lastChecked: action.lastChecked ?? state.lastChecked,
        queuedAt: action.queuedAt ?? state.queuedAt,
        startedAt: state.startedAt ?? Date.now(),
        lastUpdated: Date.now(),
      };
    case 'SIMULATION_COMPLETE':
      return {
        ...state,
        isRunning: false,
        status: SimulationStatus.COMPLETED,
        progress: 100,
        jobId: action.jobId ?? state.jobId,
        documentId: action.documentId ?? state.documentId,
        scenarioId: action.scenarioId ?? state.scenarioId,
        resultUrl: action.resultUrl ?? state.resultUrl,
        completedAt: Date.now(),
        results: action.results,
        lastUpdated: Date.now(),
      };
    case 'SIMULATION_ERROR':
      return {
        ...state,
        isRunning: false,
        status: SimulationStatus.ERROR,
        jobId: action.jobId ?? state.jobId,
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
