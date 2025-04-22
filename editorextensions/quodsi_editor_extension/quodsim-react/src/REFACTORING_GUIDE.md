# QuodsiApp Refactoring Guide

## Overview

This document outlines the implementation of the QuodsiApp.tsx refactoring. The refactoring is being done in phases to minimize disruption to the existing codebase.

## Phase 1: Context Providers and Hooks

Phase 1 focused on creating the context providers and custom hooks without modifying the existing QuodsiApp.tsx file.

## What's Implemented in Phase 1

### Context Providers

1. **UIContext** - Manages UI-related state:
   - Loading/processing indicators
   - Error messages
   - Panel types (auth/model)
   - Visible sections
   - UI preferences

2. **ModelContext** - Manages model-related state:
   - Model structure
   - Current element
   - Tree nodes
   - Validation state
   - Reference data

3. **SimulationContext** - Manages simulation-related state:
   - Simulation status
   - Results availability
   - Document ID

### Custom Hooks

1. **useMessaging** - Handles communication with LucidChart:
   - Sends typed messages
   - Registers message handlers
   - Processes incoming messages

2. **useModelOperations** - Provides model-related operations:
   - Element selection
   - Element updates
   - Tree node toggles
   - Model validation
   - Type conversions

3. **useSimulationOperations** - Provides simulation operations:
   - Starting simulations
   - Viewing results

### Message Handlers

**appMessageHandlers.ts** - Contains handlers for different message types that update the contexts when used.

## How to Use These Components

The components in Phase 1 are designed to be used alongside the existing QuodsiApp.tsx without modifying it. Here's how you can start using them:

1. In your `index.tsx` file, wrap your `App` component with the context providers:

```tsx
// index.tsx
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { UIProvider, ModelProvider, SimulationProvider } from './contexts';

ReactDOM.render(
  <React.StrictMode>
    <UIProvider>
      <ModelProvider>
        <SimulationProvider>
          <App />
        </SimulationProvider>
      </ModelProvider>
    </UIProvider>
  </React.StrictMode>,
  document.getElementById('root')
);
```

2. Test the hooks in a small component to ensure they're working correctly:

```tsx
import React from 'react';
import { useModelOperations } from './hooks';

const TestComponent: React.FC = () => {
  const { validateModel } = useModelOperations();
  
  return (
    <button onClick={validateModel}>
      Test Validate Model
    </button>
  );
};
```

## Phase 2: Component Hierarchy

Phase 2 involved creating the new component hierarchy that uses the contexts and hooks from Phase 1.

### What's Implemented in Phase 2

1. **AuthenticationWrapper** - Handles auth flow and conditional rendering
2. **ModelPanel** - Main component when authenticated that uses the contexts for state management
3. **RefactoredApp** - A parallel implementation of QuodsiApp using the new architecture
4. **TestHarness** - A component for testing the refactored components in isolation
5. **ContextDemo** - A demonstration component showing how to use the contexts and hooks

### Test Components

To facilitate testing without modifying the existing application, we've created:

1. **TestRefactoredApp.tsx** - Entry point for testing the refactored components with proper context providers
2. **App.tsx.new** - An alternative App.tsx that can toggle between original and refactored versions
3. **TestHarness.tsx** - A component for testing individual refactored components

### How to Test Phase 2 Components

See the **REFACTORING_PHASE2_README.md** file for detailed instructions on how to test the refactored components.

## Next Steps: Phase 3

Phase 3 will involve:

1. Creating a final version of QuodsiApp.tsx using the new architecture
2. Implementing additional tests
3. Refining the message handlers to ensure complete compatibility
4. Developing a migration plan for switching to the new implementation

## Testing During Refactoring

Throughout the refactoring process, you can test the new architecture without affecting the existing application by:

1. Using the context hooks in small test components
2. Adding the context providers to the application and inspecting state with React DevTools
3. Creating isolated test cases for the new components

## Potential Issues to Watch For

1. **Context Performance** - Watch for unnecessary re-renders
2. **State Duplication** - Ensure state isn't duplicated between contexts and QuodsiApp.tsx
3. **Message Handling** - Make sure message handlers don't conflict

## Final Notes

The Phase 1 implementation provides the foundation for the refactoring without disrupting the existing application. The contexts and hooks can be gradually integrated into the codebase as you become comfortable with the new architecture.
