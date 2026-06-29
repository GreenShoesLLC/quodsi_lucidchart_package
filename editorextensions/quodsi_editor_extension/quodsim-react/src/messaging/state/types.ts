/**
 * State management types
 * Shared types for the messaging state system
 */

import {
  ElementShape,
  SimulationStatus
} from '@quodsi/lucid-shared';

// Re-export shared types
export type {
  ElementShape
};

// Re-export SimulationStatus enum from shared package
export { SimulationStatus };

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
import { AuthAction } from './authSlice';
import { SelectionAction } from './selectionSlice';
import { SimulationAction } from './simulationSlice';
import { ValidationAction } from './validationSlice';
import { ElementOpsAction } from './elementOpsSlice';
import { EntitlementsAction } from './entitlementsSlice';

// Re-export the action types
export type {
  AppAction,
  AuthAction,
  SelectionAction,
  SimulationAction,
  ValidationAction,
  ElementOpsAction,
  EntitlementsAction,
};

// Union type that encompasses all possible actions
export type MessagingAction =
  | AppAction
  | AuthAction
  | SelectionAction
  | SimulationAction
  | ValidationAction
  | ElementOpsAction
  | EntitlementsAction
;
