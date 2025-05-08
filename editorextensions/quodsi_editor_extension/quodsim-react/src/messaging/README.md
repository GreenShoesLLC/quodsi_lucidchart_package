# Quodsi React Messaging System

This module implements the client-side messaging infrastructure for the Quodsi React application. It manages communication between the React application running in iframes and the Quodsi LucidChart extension host.

## Architecture

The messaging system follows a modular, React Context-based architecture with state managed through a reducer pattern:

```
┌─────────────────────────────────────────────────────────────┐
│                      MessageProvider                         │
│                                                             │
│  ┌─────────────┐     ┌────────────┐     ┌───────────────┐   │
│  │ Context Provider │   │ State (useReducer) │   │  Effect Orchestration │   │
│  └─────────────┘     └────────────┘     └───────────────┘   │
└─────────┬──────────────────┬───────────────────┬────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────┐  ┌────────────────┐  ┌────────────────┐
│     Hooks       │  │     Effects    │  │    Handlers    │
│                 │  │                │  │                │
│ useAuthState    │  │ authEffects    │  │ messageHandlers│
│ useSendMessage  │  │ appReadyEffects│  │ authHandlers   │
└────────┬────────┘  └───────┬────────┘  └────────┬───────┘
         │                   │                    │
         └───────────────────┼────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────┐
│                                     │
│      React UI Components            │
│                                     │
└─────────────────────────────────────┘
```

## Directory Structure

The messaging system is organized into logical modules:

```
messaging/
├── hooks/               # Reusable hooks for state and actions
│   ├── useAuthState.ts
│   ├── useSendMessage.ts
│   └── index.ts
│
├── effects/             # useEffect implementations
│   ├── authEffects.ts
│   ├── reactAppReadyEffects.ts
│   ├── initializationEffects.ts
│   ├── messageListenerEffect.ts
│   └── index.ts
│
├── handlers/            # Message handling logic
│   ├── messageHandlers.ts
│   ├── authStatusHandler.ts
│   └── index.ts
│
├── senders/             # Message sending hooks
│   ├── authSender.ts
│   ├── simulationSender.ts
│   ├── useSender.ts
│   └── index.ts
│
├── mappers/             # Convert messages to actions
│   ├── auth.mapper.ts
│   ├── framework.mapper.ts
│   └── index.ts
│
├── state/               # State management
│   ├── authSlice.ts
│   ├── index.ts
│   └── types.ts
│
├── utils/               # Utility functions
│   └── debugService.ts
│
├── MessageContext.ts    # Context definitions and hooks
├── MessageProvider.tsx  # Main provider component
└── index.ts             # Main entry point
```

## Key Components

### MessageProvider (`MessageProvider.tsx`)

The core provider component that:
- Orchestrates the effects and hooks
- Establishes React Context for messaging state
- Composes the modular parts of the messaging system
- Provides minimal complexity through composition

### MessageContext (`MessageContext.ts`)

Defines the React Context and basic hooks:
- Creates context for state and dispatch
- Provides useMessaging, useAuth, etc. hooks
- Offers type safety for context consumers

### Hooks (`hooks/`)

Reusable hooks that:
- Encapsulate specific functionality
- Manage state synchronization (useAuthState)
- Handle message sending (useSendMessage)
- Promote separation of concerns

### Effects (`effects/`)

Isolated useEffect implementations:
- Focus on specific side effects
- Handle authentication state changes
- Manage REACT_APP_READY message
- Process message events
- Initialize application state

### Handlers (`handlers/`)

Message processing logic:
- Process incoming messages
- Handle message deduplication
- Manage specialized message types
- Apply business logic to messages

### State Management (`state/`)

Redux-like state management:
- Defines state structure with domain-specific slices
- Implements reducers for each slice
- Processes actions to update state
- Maintains timestamp tracking for updates

### Message Mappers (`mappers/`)

Transform messages to actions:
- Convert incoming messages to reducer actions
- Validate message formats
- Apply transformations based on message type
- Organize handling by domain

### Message Senders (`senders/`)

Type-safe message sending:
- Provide domain-specific sending functions
- Handle envelope creation and formatting
- Implement business logic for outgoing messages
- Abstract away messaging details

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

Use the context hooks to access state:

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

Use sender hooks for outgoing messages:

```tsx
import { useAuthSender, useSimulationSender } from './messaging/senders';

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

### Component-Specific State Hooks

For components with specialized needs, create custom hooks:

```tsx
// In components/auth/useAuthPanelState.ts
import { useMessaging, useMessagingDispatch } from '../../messaging/MessageContext';
import { useSendMessage } from '../../messaging/hooks';
import { AuthStorageService } from '../../services/AuthStorageService';

export const useAuthPanelState = () => {
  const { auth } = useMessaging();
  const dispatch = useMessagingDispatch();
  
  // Extract auth state and add component-specific functions
  const { isAuthenticated, userInfo, isLoading, error } = auth;
  
  const login = useCallback((idToken, user, isNewUser) => {
    // Implementation...
  }, [dispatch]);
  
  const logout = useCallback(() => {
    // Implementation...
  }, [dispatch]);
  
  return {
    isAuthenticated,
    userInfo,
    isLoading,
    error,
    login,
    logout
  };
};
```

## Message Lifecycle

1. **Outgoing Messages (React → Host)**:
   - Component calls a sender hook function
   - Hook creates a properly formatted envelope
   - sendMessage function sends via `postMessage`
   - Host receives and processes the message

2. **Incoming Messages (Host → React)**:
   - Host sends message via `postMessage` 
   - messageListenerEffect captures the message
   - messageHandlers process and deduplicate the message
   - Mapper converts message to an action
   - Reducer updates state based on the action
   - Components re-render with new state

## Debugging

The messaging system includes a debugging service:

```typescript
import { debugService } from './messaging';

// Component-specific logger
const logger = debugService.forComponent('YourComponent');

// Log messages
logger.log('Component initialized');
logger.error('Something went wrong', error);
```

## Extending the System

### Adding New Message Types

1. Define the message type and interface in `@quodsi/shared`
2. Create or update a mapper function in the appropriate mapper file
3. Add sender functions to the relevant sender hook
4. Update the reducer to handle any new actions
5. Create effects for any side effects related to the new message type

### Creating a Custom Component Hook

When a component needs specialized functionality:

```typescript
// components/yourFeature/useFeatureState.ts
import { useMessaging, useMessagingDispatch } from '../../messaging/MessageContext';
import { useSendMessage } from '../../messaging/hooks';

export function useFeatureState() {
  const { feature } = useMessaging();
  const dispatch = useMessagingDispatch();
  const sendMessage = useSendMessage({ app: { panelType: 'model' }}, dispatch);
  
  // Component-specific functions
  const doSomething = useCallback(() => {
    // Implementation using sendMessage and dispatch
  }, [sendMessage, dispatch]);
  
  return {
    ...feature,  // Spread the state
    doSomething  // Add component-specific functions
  };
}
```

## Best Practices

1. **Separation of Concerns**
   - Keep state management logic in reducers
   - Use effects for side effects
   - Use hooks for reusable logic
   - Keep handlers focused on message processing

2. **Component Integration**
   - Create component-specific hooks for specialized needs
   - Use existing hooks for common functionality
   - Compose hooks rather than duplicating logic

3. **State Management**
   - Use the reducer pattern for state updates
   - Keep state normalized and organized by domain
   - Track lastUpdated timestamps for synchronization
   - Avoid direct state mutations

4. **Effect Management**
   - Keep effects focused on a single responsibility
   - Minimize effect dependencies
   - Use cleanup functions for resource management
   - Document effect behavior and dependencies

5. **Debugging**
   - Use the debugService for consistent logging
   - Include relevant context in log messages
   - Add debug logs at critical state transitions
   - Use component-specific loggers
