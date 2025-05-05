# Quodsi React Messaging System

This module implements the client-side messaging infrastructure for the Quodsi React application. It manages communication between the React application running in iframes and the Quodsi LucidChart extension host.

## Architecture

The messaging system follows a React Context-based architecture with state managed through a reducer pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                      MessageProvider                         │
│                                                             │
│  ┌─────────────┐     ┌────────────┐     ┌───────────────┐   │
│  │ State (useReducer) │    Mapper   │     │ postMessage API │   │
│  └─────────────┘     └────────────┘     └───────────────┘   │
└────────┬─────────────────┬──────────────────────────────────┘
         │                 │
         ▼                 ▼
┌────────────────┐  ┌─────────────────┐
│                │  │                 │
│  React Hooks   │  │  Sender Hooks   │
│                │  │                 │
└────────────────┘  └─────────────────┘
         │                 │
         ▼                 ▼
┌─────────────────────────────────────┐
│                                     │
│      React UI Components            │
│                                     │
└─────────────────────────────────────┘
```

## Key Components

### MessageProvider (`MessageProvider.tsx`)

The core provider component that:
- Establishes React Context for messaging state
- Manages the message event listener
- Handles message sending and receiving
- Dispatches actions to the reducer
- Provides hooks for accessing state

### State Management (`reducer.ts`)

Implements a Redux-like reducer that:
- Defines the complete application state structure
- Processes actions to update state
- Organizes state into domain slices (auth, subscription, etc.)
- Maintains timestamp tracking for updates

### Message Mappers (`mappers/`)

Specialized functions that:
- Convert incoming messages to reducer actions
- Validate message formats
- Organize handling by message category
- Apply business logic for transformations

### Message Senders (`senders/`)

Custom hooks that:
- Provide type-safe functions for sending messages
- Handle specific categories of messages
- Abstract away envelope creation details
- Implement domain-specific logic

### State Hooks (`hooks/`)

Enhanced hooks that:
- Combine state and actions for specific domains
- Prevent unnecessary re-renders with memoization
- Simplify component integration
- Provide intellisense and type safety

## Usage

### Basic Setup

Wrap your application with the MessageProvider:

```tsx
import { MessageProvider } from './messaging';

function App() {
  return (
    <MessageProvider>
      <YourAppComponents />
    </MessageProvider>
  );
}
```

### Accessing State

Use the provided hooks to access specific state slices:

```tsx
import { useAuth, useSelection } from './messaging';

function UserPanel() {
  const { isAuthenticated, userInfo } = useAuth();
  const { selectedElements } = useSelection();
  
  return (
    <div>
      {isAuthenticated ? (
        <p>Hello, {userInfo?.displayName}</p>
      ) : (
        <p>Please sign in</p>
      )}
      
      <p>Selected elements: {selectedElements.length}</p>
    </div>
  );
}
```

### Sending Messages

Use the sender hooks to send messages to the host:

```tsx
import { useAuthSender, useSimulationSender } from './messaging';

function ActionButtons() {
  const { sendLogout } = useAuthSender();
  const { runSimulation } = useSimulationSender();
  
  return (
    <div>
      <button onClick={() => sendLogout()}>Logout</button>
      <button onClick={() => runSimulation('doc123', 'sim1')}>Run Simulation</button>
    </div>
  );
}
```

### Using Enhanced Hooks

For components that need both state and actions:

```tsx
import { useAuthState, useSimulationState } from './messaging';

function SimulationPanel() {
  const { isAuthenticated, logout } = useAuthState();
  const { status, progress, runSimulation } = useSimulationState();
  
  return (
    <div>
      {isAuthenticated && (
        <>
          <div>Simulation Status: {status} ({progress}%)</div>
          <button onClick={() => runSimulation('doc123', 'sim1')}>Run</button>
          <button onClick={logout}>Logout</button>
        </>
      )}
    </div>
  );
}
```

## Message Lifecycle

1. **Outgoing Messages (React → Host)**:
   - Component calls a sender hook function
   - Sender creates a properly formatted envelope
   - MessageProvider sends via `postMessage`
   - Host receives and processes the message

2. **Incoming Messages (Host → React)**:
   - Host sends message via `postMessage` 
   - MessageProvider's event listener receives the message
   - Mapper converts message to an action
   - Reducer updates state based on the action
   - Components re-render with new state

## Debugging

The messaging system includes a debugging service:

```typescript
import { debugService } from './messaging';

// Enable debug logging
debugService.enableLogging();

// Log debug messages
debugService.debug('Testing message flow');
```

## Extending the System

### Adding New Message Types

1. Define the message type and interface in `@quodsi/shared`
2. Add a mapper function in the appropriate mapper file
3. Add sender functions to the relevant sender hook
4. Update the reducer to handle any new actions
5. Create or update state hooks as needed

### Creating New Domain Hooks

```typescript
import { useMemo } from 'react';
import { useFeatureState } from '../MessageProvider';
import { useFeatureSender } from '../senders/featureSender';

export function useFeatureState() {
  const feature = useFeature();
  const { sendFeatureAction } = useFeatureSender();
  
  return useMemo(() => ({
    // State
    featureEnabled: feature.enabled,
    
    // Actions
    enableFeature: () => sendFeatureAction(true),
    disableFeature: () => sendFeatureAction(false)
  }), [feature.enabled, sendFeatureAction]);
}
```

## Best Practices

- Use the provided hooks rather than accessing context directly
- Memoize computed values and callbacks to prevent unnecessary renders
- Keep UI components focused on presentation, not message handling
- Use the enhanced state hooks when components need both state and actions
- Handle loading and error states appropriately
