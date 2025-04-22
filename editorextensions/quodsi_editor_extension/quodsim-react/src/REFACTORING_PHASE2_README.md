# QuodsiApp Refactoring - Phase 2

This document outlines how to use the components created in Phase 2 of the QuodsiApp refactoring.

## Components Created in Phase 2

1. **AuthenticationWrapper** - Handles authentication flow and conditional rendering
2. **ModelPanel** - Main authenticated component that uses contexts for state management
3. **RefactoredApp** - A parallel implementation of QuodsiApp using the new context-based architecture
4. **TestRefactoredApp** - Entry point for testing the refactored components with proper context providers

## How to Test the Refactored Components

### Option 1: Use the Provided Test Component

You can import and use the `TestRefactoredApp` component in any React component to see the refactored app in action. This component is fully self-contained with all required context providers.

```tsx
import TestRefactoredApp from './TestRefactoredApp';

// Use it in your component
<TestRefactoredApp />
```

### Option 2: Toggle Between Original and Refactored Versions

An App.tsx.new file has been provided which adds a toggle to switch between the original and refactored versions. To use this:

1. Set up environment variables in your `.env` file:
   ```
   REACT_APP_SHOW_REFACTORED_APP=false
   REACT_APP_SHOW_APP_TOGGLE=true
   ```

2. Rename App.tsx.new to App.tsx when you're ready to test the toggle functionality:
   ```
   mv src/App.tsx src/App.tsx.backup
   mv src/App.tsx.new src/App.tsx
   ```

### Option 3: Use Components Individually

You can also use the individual components in your existing code for incremental adoption:

```tsx
// Import the specific components
import { AuthenticationWrapper } from './components/AuthWrapper';
import { ModelPanel } from './components/ModelPanel';

// Use them in your component
<AuthenticationWrapper>
  <ModelPanel />
</AuthenticationWrapper>
```

## Important Notes

1. The refactored components use the context system created in Phase 1. Make sure the appropriate context providers are wrapping any component that uses them.

2. This implementation doesn't modify the existing QuodsiApp.tsx file but exists alongside it, allowing for parallel testing and development.

3. The toggle functionality in App.tsx.new is optional and should only be used during development/testing.

## Next Steps

Phase 3 will involve:
1. Creating a final version of QuodsiApp.tsx using the new architecture
2. Implementing additional tests
3. Removing the original implementation once the refactored version is stable

## Troubleshooting

If you encounter issues with the refactored components:

1. Check the console for any errors related to context providers.
2. Ensure the component hierarchy is correct with all required providers.
3. Make sure message handlers are properly registered.
4. Compare the behavior with the original implementation to identify differences.
