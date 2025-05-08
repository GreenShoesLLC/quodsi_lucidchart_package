# Messaging State Management

This directory contains the state management system for the Quodsi LucidChart extension, built around a custom React reducer pattern.

## Directory Structure

```
state/
├── appSlice.ts           // Application initialization and pending requests
├── authSlice.ts          // Authentication state
├── index.ts              // Entry point that re-exports everything
├── rootReducer.ts        // Combines all slice reducers
├── selectionSlice.ts     // Element selection and document context
├── simulationSlice.ts    // Simulation status and results
├── subscriptionSlice.ts  // Subscription tier and status
├── types.ts              // Shared types
├── validationSlice.ts    // Model validation
└── README.md             // This file
```

## Usage

Import the state management system from the `state` directory:

```typescript
import { 
  // Root reducer and initial state
  messagingReducer, 
  initialState,
  
  // Types
  MessagingState,
  MessagingAction
} from './state';
```

### Slice Structure

Each state slice follows a consistent pattern:

1. **State Interface**: Defines the shape of the slice's state
2. **Initial State**: Provides default values
3. **Action Types**: Union type of all actions that can be dispatched to this slice
4. **Reducer Function**: Pure function that handles state transitions

Example:

```typescript
// State shape
export interface AuthState {
  isAuthenticated: boolean;
  userInfo?: QuodsiUserInfo;
  isLoading: boolean;
  lastUpdated?: number;
  error?: string;
}

// Initial state
export const initialAuthState: AuthState = {
  isAuthenticated: false,
  userInfo: undefined,
  isLoading: false,
  lastUpdated: undefined,
  error: undefined,
};

// Action types
export type AuthAction = 
  | { type: 'AUTH_STATUS_UPDATE'; isAuthenticated: boolean; userInfo?: QuodsiUserInfo }
  | { type: 'AUTH_LOADING'; isLoading: boolean }
  | { type: 'AUTH_ERROR'; error: string };

// Reducer
export function authReducer(state: AuthState = initialAuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_STATUS_UPDATE':
      return {
        ...state,
        isAuthenticated: action.isAuthenticated,
        userInfo: action.userInfo,
        lastUpdated: Date.now(),
      };
    // ...other cases
    default:
      return state;
  }
}
```

## Adding New State or Actions

1. Create or modify the appropriate slice file
2. Update the combined action type in `types.ts` if needed
3. Import and use the new state or actions

## Messaging Flow

The state management system integrates with the message passing protocol between the React application and the LucidChart extension host:

1. Messages from the host are mapped to actions (see `mappers.ts`)
2. Actions update the state through the reducers
3. Components access state through context hooks (`useAuth`, `useSelection`, etc.)
4. State changes trigger UI updates

## Migration from Old Structure

The old `reducer.ts` file has been replaced with this modular structure, but it still exists as a re-export module for backward compatibility. New code should import directly from the `state` directory.
