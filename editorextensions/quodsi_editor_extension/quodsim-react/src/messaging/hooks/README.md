# Enhanced State Hooks

This directory contains specialized React hooks that combine state and actions for specific domains in the Quodsi application. These hooks build upon the basic context hooks from the MessageProvider and add domain-specific functionality.

## Architecture

The enhanced hooks are organized by domain and combine state and actions:

```
┌────────────────────────┐     ┌───────────────────┐
│                        │     │                   │
│  MessageProvider hooks │     │  Sender hooks     │
│  (useAuth, etc.)       │     │  (useAuthSender)  │
│                        │     │                   │
└───────────┬────────────┘     └────────┬──────────┘
            │                           │
            └─────────────┬─────────────┘
                          │
               ┌──────────▼─────────┐
               │                    │
               │  Enhanced hooks    │
               │  (useAuthState)    │
               │                    │
               └──────────┬─────────┘
                          │
                ┌─────────▼─────────┐
                │                   │
                │  UI Components    │
                │                   │
                └───────────────────┘
```

## Key Components

### `useMessagingState.ts`

The foundation enhanced hook that:
- Combines the complete state and dispatch function
- Provides a unified interface for all messaging state
- Optimizes rendering with useMemo
- Is the basis for other specialized hooks

### Domain-Specific Hooks

Each domain hook:
- Focuses on one functional area (auth, simulation, etc.)
- Combines state values and action functions
- Provides a clean, unified API for components
- Optimizes rendering with useMemo

## Available Hooks

- **useAuthState**: Authentication state and functions
- **useSubscriptionState**: Subscription tier and management
- **useSelectionState**: Diagram selection and context
- **useSimulationState**: Simulation status and control
- **useValidationState**: Model validation results and triggers

## Usage

### Basic Usage Pattern

```tsx
import { useAuthState } from '../messaging/hooks';

function UserProfile() {
  const {
    // State
    isAuthenticated,
    userInfo,
    silentAuthInProgress,
    error,
    
    // Actions
    logout,
    login
  } = useAuthState();
  
  if (silentAuthInProgress) {
    return <div>Loading...</div>;
  }
  
  if (error) {
    return <div>Error: {error}</div>;
  }
  
  return (
    <div>
      {isAuthenticated ? (
        <>
          <h2>Welcome, {userInfo?.displayName || userInfo?.email}</h2>
          <button onClick={logout}>Sign Out</button>
        </>
      ) : (
        <button onClick={() => login(token, user, false)}>Sign In</button>
      )}
    </div>
  );
}
```

### Advanced Integration

These hooks are designed to simplify complex component logic:

```tsx
import { useSimulationState, useSelectionState } from '../messaging/hooks';

function SimulationPanel() {
  const {
    status,
    progress,
    jobId,
    error,
    runSimulation,
    cancelSimulation
  } = useSimulationState();
  
  const {
    documentId,
    pageId,
    isQuodsiModel,
    selectedElements
  } = useSelectionState();
  
  // Can now use both state and actions together
  const handleRunClick = () => {
    if (documentId && isQuodsiModel) {
      runSimulation(documentId, 'My Scenario');
    }
  };
  
  return (
    // Component UI with integrated state and actions
  );
}
```

## Creating New Enhanced Hooks

To implement a new domain-specific hook:

```typescript
import { useMemo } from 'react';
import { useFeature } from '../MessageProvider';
import { useFeatureSender } from '../senders/featureSender';

export function useFeatureState() {
  // Get base state
  const feature = useFeature();
  
  // Get sender functions
  const { activateFeature, deactivateFeature } = useFeatureSender();
  
  // Combine state and actions with memoization
  return useMemo(() => ({
    // State properties
    isEnabled: feature.enabled,
    settings: feature.settings,
    lastUpdate: feature.lastUpdated,
    
    // Computed properties
    isConfigured: Boolean(feature.settings?.configured),
    
    // Action methods
    enable: () => activateFeature(feature.id),
    disable: () => deactivateFeature(feature.id),
    configure: (settings) => configureFeature(feature.id, settings),
    
    // Helper methods
    canEnable: () => feature.status === 'available'
  }), [
    // Dependencies for memoization
    feature.enabled,
    feature.settings,
    feature.lastUpdated,
    feature.id,
    feature.status,
    activateFeature,
    deactivateFeature,
    configureFeature
  ]);
}
```

## Testing Enhanced Hooks

```typescript
import { renderHook, act } from '@testing-library/react-hooks';
import { useAuthState } from './useAuthState';
import { MessageProvider } from '../MessageProvider';

// Mock state and providers
const mockState = {
  auth: {
    isAuthenticated: false,
    silentAuthInProgress: false
  }
};

// Mock wrapper with providers
const wrapper = ({ children }) => (
  <MockProviders initialState={mockState}>
    {children}
  </MockProviders>
);

test('useAuthState combines state and actions', () => {
  const { result } = renderHook(() => useAuthState(), { wrapper });
  
  // Check initial state
  expect(result.current.isAuthenticated).toBe(false);
  expect(result.current.silentAuthInProgress).toBe(false);
  expect(typeof result.current.logout).toBe('function');
  
  // Test action
  act(() => {
    result.current.logout();
  });
  
  // Verify expected behavior
  // ...
});
```

## Best Practices

- Always use `useMemo` to optimize rendering
- Include all dependencies in the dependency array
- Keep hook return values consistent across renders
- Document the expected behavior of each property/method
- Combine related functionality in logical units
- Don't include too many unrelated functions in one hook
- Use TypeScript for better developer experience
- Test both state access and actions
