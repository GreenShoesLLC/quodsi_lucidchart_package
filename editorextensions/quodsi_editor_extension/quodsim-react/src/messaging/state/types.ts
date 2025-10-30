/**
 * State management types
 * Shared types for the messaging state system
 */

import {
  ElementShape,
  SimulationStatus as SharedSimulationStatus
} from '@quodsi/shared';

// Re-export shared types
export type {
  ElementShape
};

// Re-export SimulationStatus as both type and value
export enum SimulationStatus {
  IDLE = 'idle',
  QUEUED = 'queued',
  VALIDATING = 'validating',
  RUNNING = 'running',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

// Pending request tracking
export interface PendingRequest {
  requestType: string;
  timestamp: number;
}

export interface PendingRequests {
  [key: string]: PendingRequest;
}

// Import action types from the slices once they're created
import { AppAction } from './appSlice';
import { SelectionAction } from './selectionSlice';
import { SimulationAction } from './simulationSlice';
import { ValidationAction } from './validationSlice';

// Re-export the action types
export type {
  AppAction,
  SelectionAction,
  SimulationAction,
  ValidationAction
};

// Union type that encompasses all possible actions
export type MessagingAction =
  | AppAction
  | SelectionAction
  | SimulationAction
  | ValidationAction;
