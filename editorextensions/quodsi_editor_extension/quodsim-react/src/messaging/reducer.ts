/**
 * LEGACY REDUCER FILE
 * This file is being replaced by the modular state management system in the ./state directory.
 * It now exports the types and functions from that system to maintain backward compatibility.
 * 
 * @deprecated Use imports from './state' instead.
 */

// Import and re-export values
import {
  // Root reducer and initial state
  messagingReducer,
  initialState,

  // Enum values
  SimulationStatus,
} from './state';

// Re-export values
export {
  // Root reducer and initial state
  messagingReducer,
  initialState,

  // Enum values
  SimulationStatus,
};

// Import and re-export types
import type {
  // State interfaces
  MessagingState,
  AppState,
  SelectionState,
  SimulationState,
  ValidationState,

  // Action types
  MessagingAction,
  AppAction,
  SelectionAction,
  SimulationAction,
  ValidationAction,

  // Shared types
  ElementShape,
  PendingRequest,
  PendingRequests,
} from './state';

// Re-export types
export type {
  // State interfaces
  MessagingState,
  AppState,
  SelectionState,
  SimulationState,
  ValidationState,

  // Action types
  MessagingAction,
  AppAction,
  SelectionAction,
  SimulationAction,
  ValidationAction,

  // Shared types
  ElementShape,
  PendingRequest,
  PendingRequests,
};
