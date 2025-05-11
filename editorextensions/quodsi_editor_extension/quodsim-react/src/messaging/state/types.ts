/**
 * State management types
 * Shared types for the messaging state system
 */

import { 
  QuodsiUserInfo, 
  ElementShape, 
  SimulationStatus as SharedSimulationStatus
} from '@quodsi/shared';

// Re-export shared types
export type { 
  QuodsiUserInfo, 
  ElementShape 
};

// Define enums locally to ensure they work as both types and values
export enum SubscriptionTier {
  FREE = 'free',
  BASIC = 'basic',
  PRO = 'pro',
  ENTERPRISE = 'enterprise'
}

export enum SubscriptionStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING = 'pending',
  CANCELLED = 'cancelled',
  ERROR = 'error'
}

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
import { AuthAction } from './authSlice';
import { SelectionAction } from './selectionSlice';
import { SubscriptionAction } from './subscriptionSlice';
import { SimulationAction } from './simulationSlice';
import { ValidationAction } from './validationSlice';

// Re-export the action types
export type { 
  AppAction,
  AuthAction,
  SelectionAction,
  SubscriptionAction,
  SimulationAction,
  ValidationAction 
};

// Union type that encompasses all possible actions
export type MessagingAction = 
  | AppAction
  | AuthAction
  | SelectionAction
  | SubscriptionAction
  | SimulationAction
  | ValidationAction;
