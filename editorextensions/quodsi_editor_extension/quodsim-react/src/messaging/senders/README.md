# Message Senders

This directory contains specialized hooks for sending messages from the React application to the host. Each hook focuses on a specific category of messages and provides a type-safe API for sending those messages.

## Architecture

The senders are organized by message category with a common foundation:

```
                     ┌─────────────────┐
                     │                 │
                     │    useSender    │
                     │ (Base Function) │
                     │                 │
                     └────────┬────────┘
                              │
            ┌─────────────────┼─────────────────┐
            │                 │                 │
  ┌─────────▼─────────┐ ┌─────▼───────────┐ ┌───▼───────────────┐
  │                   │ │                 │ │                   │
  │   useAuthSender   │ │useSimulationSender│useSubscriptionSender│
  │                   │ │                 │ │                   │
  └───────────────────┘ └─────────────────┘ └───────────────────┘
```

## Key Components

### `useSender.ts`

The foundation hook that:
- Provides the core message sending capability
- Accesses the MessageProvider context
- Handles common functionality for all senders
- Implements debugging and logging

### Category Sender Hooks

Each category sender hook:
- Provides domain-specific sending functions
- Formats message payloads correctly
- Encapsulates message type and structure details
- Provides a clean, type-safe API for components

## Available Sender Hooks

- **useAuthSender**: Authentication operations (login, logout)
- **useSubscriptionSender**: Subscription management
- **useSimulationSender**: Simulation execution and control
- **useModelOpsSender**: Model operations (validate, convert, etc.)
- **useStorageSender**: Cloud storage integration

## Usage

### Basic Sender Usage

```tsx
import { useAuthSender } from '../messaging/senders';

function LoginButton({ user, token }) {
  const { sendLoginSuccess } = useAuthSender();
  
  const handleLogin = () => {
    sendLoginSuccess(token, user, false);
  };
  
  return (
    <button onClick={handleLogin}>
      Complete Login
    </button>
  );
}
```

### Common Pattern

Sender hooks are typically used alongside state hooks to create interactive components:

```tsx
import { useSimulationSender } from '../messaging/senders';
import { useSimulation } from '../messaging';

function SimulationControls() {
  const simulation = useSimulation();
  const { runSimulation, cancelSimulation } = useSimulationSender();
  
  return (
    <div>
      <h2>Simulation Controls</h2>
      <div>Status: {simulation.status}</div>
      <div>Progress: {simulation.progress}%</div>
      
      <button
        onClick={() => runSimulation('doc123', 'Scenario 1')}
        disabled={simulation.status === 'running'}
      >
        Run Simulation
      </button>
      
      <button
        onClick={() => cancelSimulation()}
        disabled={simulation.status !== 'running'}
      >
        Cancel
      </button>
    </div>
  );
}
```

## Implementing a New Sender

To create a new category sender hook:

```typescript
import { EnvelopeMessageType } from '@quodsi/shared';
import { useSender } from './useSender';

export function useFeatureSender() {
  const send = useSender();
  
  // Function to send FEATURE_ACTIVATE message
  const activateFeature = (featureId: string) => {
    send(EnvelopeMessageType.FEATURE_ACTIVATE, {
      featureId,
      timestamp: Date.now()
    });
  };
  
  // Function to send FEATURE_DEACTIVATE message
  const deactivateFeature = (featureId: string) => {
    send(EnvelopeMessageType.FEATURE_DEACTIVATE, {
      featureId,
      timestamp: Date.now()
    });
  };
  
  return {
    activateFeature,
    deactivateFeature
  };
}
```

## Testing Senders

Sender hooks can be tested with React Testing Library and mock functions:

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useAuthSender } from './authSender';
import { MessageProvider } from '../MessageProvider';

// Mock sendMessage function
const mockSendMessage = jest.fn();

// Mock provider wrapper
const wrapper = ({ children }) => (
  <MockMessageProviderContext sendMessage={mockSendMessage}>
    {children}
  </MockMessageProviderContext>
);

test('useAuthSender provides sendLogout function', () => {
  const { result } = renderHook(() => useAuthSender(), { wrapper });
  
  // Call the hook function
  result.current.sendLogout();
  
  // Verify correct message was sent
  expect(mockSendMessage).toHaveBeenCalledWith(
    EnvelopeMessageType.AUTH_LOGOUT,
    {}
  );
});
```

## Best Practices

- Use the base `useSender` hook for all message sending
- Maintain consistent naming patterns across sender hooks
- Document parameters and return values
- Implement proper TypeScript typing
- Keep sender functions focused on message creation and sending
- Consider making complex operations more user-friendly
- Add validation for required parameters
