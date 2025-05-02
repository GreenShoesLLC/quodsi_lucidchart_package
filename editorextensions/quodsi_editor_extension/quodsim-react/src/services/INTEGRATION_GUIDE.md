# Integration Guide for Message Service and Action Handlers

This guide provides step-by-step instructions for integrating the new Message Service and Action Handlers into your QuodsiApp.tsx file.

## Step 1: Add Imports

Add the following imports to your QuodsiApp.tsx file:

```typescript
import { getMessageService } from "./services/messaging/messageService";
import { createActionHandlers } from "./services/actions/actionHandlers";
```

## Step 2: Initialize State Ref

Add a ref to track the current state for the action handlers:

```typescript
// Add a ref to get current state value for action handlers
const stateRef = useRef<AppState>(state);
  
// Update the ref when state changes
useEffect(() => {
  stateRef.current = state;
}, [state]);

// Function to get current state for action handlers
const getState = useCallback(() => stateRef.current, []);
```

## Step 3: Initialize Services

Initialize the message service and action handlers with useRef to maintain stable references:

```typescript
// Get message service instance
const messageService = useRef(getMessageService());
  
// Initialize action handlers
const actionHandlers = useRef(createActionHandlers(setState, getState));

// Create a type-safe message sender function (for dependencies)
const sendMessage = useCallback(
  <T extends MessageTypes>(type: T, payload?: any) => {
    messageService.current.sendMessage(type, payload, setState);
  },
  []
);
```

## Step 4: Update Message Handling Effect

Replace your current message handling effect with the following:

```typescript
// Set up message handling
useEffect(() => {
  console.log("[QuodsiApp] Setting up ExtensionMessaging");

  // Create the dependencies object for message handlers
  const messageDeps = {
    setState,
    setError: (error: string | null) => setState((prev) => ({ ...prev, error })),
    sendMessage,
  };

  // Initialize message handling with dependencies
  const cleanup = messageService.current.initMessageHandling(messageDeps);

  // Create the authentication data to include with REACT_APP_READY
  const authData = {
    panelType: state.panelType || undefined,
    isAuthenticated: isAuthenticated,
    userInfo: userInfo || undefined,
  };

  // Send the REACT_APP_READY message with auth data
  messageService.current.sendAppReadyMessage(authData);

  // Set up action handlers with refreshed dependencies
  actionHandlers.current = createActionHandlers(setState, getState);

  // Return cleanup function
  return cleanup;
}, [sendMessage, isAuthenticated, userInfo, state.panelType, getState]);
```

## Step 5: Replace Event Handlers

Replace your current action handler functions with references to the action handlers service:

1. Replace `handleElementTypeChange` with `actionHandlers.current.handleElementTypeChange`
2. Replace `handleValidate` with `actionHandlers.current.handleValidate`
3. Replace `handleElementUpdate` with `actionHandlers.current.handleElementUpdate`
4. Replace `handleSimulate` with `actionHandlers.current.handleSimulate`
5. Replace `handleRemoveModel` with `actionHandlers.current.handleRemoveModel`
6. Replace `handleConvertPage` with `actionHandlers.current.handleConvertPage`
7. Replace `handleRedirectToAuthPanel` with `actionHandlers.current.handleRedirectToAuthPanel`

For the view results handler, create a wrapper function:

```typescript
// Create a wrapper for handleViewResults that includes acknowledgeResults
const handleViewResults = useCallback(() => {
  actionHandlers.current.handleViewResults(acknowledgeResults);
}, [acknowledgeResults]);
```

## Step 6: Update UI Component Props

Update your ModelPanelAccordion component props to use the new handlers:

```tsx
<ModelPanelAccordion
  // ...other props
  onValidate={actionHandlers.current.handleValidate}
  onElementUpdate={actionHandlers.current.handleElementUpdate}
  onSimulate={actionHandlers.current.handleSimulate}
  onRemoveModel={actionHandlers.current.handleRemoveModel}
  onConvertPage={actionHandlers.current.handleConvertPage}
  onElementTypeChange={actionHandlers.current.handleElementTypeChange}
  onViewResults={handleViewResults}
  // ...other props
/>
```

## Testing Your Changes

After making these changes:

1. Verify that the application initializes correctly
2. Test basic functionality (selection, validation, etc.)
3. Check that message communication works as expected
4. Verify that all action handlers work correctly

If you encounter any issues, you can temporarily revert to the original code by commenting out the changes.

## Troubleshooting

Common issues and solutions:

1. **Message handlers not registering**: Make sure the action handlers are properly imported in the MessageService
2. **State updates not reflected**: Check that the stateRef is properly updated in the effect
3. **Action handlers not working**: Verify that the dependencies object is correctly passed to sendActionRequest

For more detailed troubleshooting, enable logging in both services:

```typescript
messageService.current.setLogging(true);
actionHandlers.current.setLogging(true);
```