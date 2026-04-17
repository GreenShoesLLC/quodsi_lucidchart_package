# Message Handlers

This directory contains specialized handlers for processing different categories of messages in the Quodsi messaging protocol. Each handler is responsible for a specific category of messages and implements the business logic for processing those messages.

## Architecture

The handlers follow a similar pattern:

- Each handler is implemented as a static class with no instance state
- The main entry point is a `handleMessage` method that checks the message type
- Specialized methods handle each specific message type
- Handlers return `true` if they processed the message, `false` otherwise

```
                                    ┌───────────────────────┐
                                    │                       │
                                    │    MessageHandlers    │
                                    │    (Dispatcher)       │
                                    │                       │
                                    └───────────────────────┘
                                               │
                                               ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│               │   │               │   │               │   │               │
│  AuthHandler  │   │ SelectionHandler │ SimulationHandler │ ModelOpsHandler │
│               │   │               │   │               │   │               │
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
```

## Handler Categories

### `authHandler.ts`

Handles user authentication messages:
- `AUTH_LOGIN_SUCCESS`: Processes successful login using `router.updateAuthState()`
- `AUTH_LOGOUT`: Handles user logout using `router.clearAuthState()`
- `AUTH_PASSWORD_RESET`: Processes password reset

### `frameworkHandler.ts`

Processes protocol framework messages:
- `REACT_APP_READY`: Handled directly by the router, not by this handler
- `ERROR`: Processes error messages
- `LOG`: Handles development logging

### `selectionHandler.ts`

Manages diagram selection state:
- `SELECTION_CHANGED`: Updates selected elements
- `MODEL_CONTEXT`: Processes document and page context

### `simulationHandler.ts`

Handles simulation execution:
- `MODEL_RUN_REQUEST`: Processes simulation start requests
- `MODEL_RUN_ACK`: Handles simulation acknowledgment
- `MODEL_RUN_STATUS`: Updates simulation progress

### `modelOpsHandler.ts`

Manages model operations:
- `MODEL_VALIDATE`: Validates model integrity
- `MODEL_CONVERT`: Converts diagram to model
- `MODEL_REMOVE`: Removes model from diagram

### `subscriptionHandler.ts`

Manages subscription state:
- `SUBSCRIPTION_STATUS`: Updates subscription tier and features
- `SUBSCRIPTION_CHANGE_REQUEST`: Handles tier change requests using `router.updateSubscription()`

### `storageHandler.ts`

Handles cloud storage integration:
- `STORAGE_CONNECT_REQUEST`: Processes storage connection
- `STORAGE_DISCONNECT`: Handles storage disconnection
- `STORAGE_STATUS`: Updates storage connection state

## Central Dispatcher (`index.ts`)

The `MessageHandlers` class serves as a central dispatcher that:
1. Receives messages from the router
2. Tries each handler in priority order
3. Returns whether the message was handled by any handler

## Interacting with Router State

Handlers interact with the router through public methods:

- **Auth state**: Use `router.updateAuthState()` and `router.clearAuthState()` to modify auth state
- **Subscription state**: Use `router.updateSubscription()` to modify subscription state
- **Sending messages**: Use `router.send()` to send messages to panels
- **Broadcasting**: Use router's broadcast methods like `router.broadcastAuthStatus()`

This maintains proper encapsulation - handlers never access the router's internal state directly.

## Extending Handlers

To add support for a new message type:

1. Identify the appropriate handler category
2. Add a new case in the handler's `handleMessage` switch
3. Implement a specialized method to process the message
4. Update the message dispatch logic if needed

## Best Practices

- Keep handlers focused on their category
- Separate business logic from message handling
- Return `true` only if the message was fully processed
- Use router's public methods instead of accessing internal state
- Log meaningful information for debugging
- Use consistent error handling patterns
