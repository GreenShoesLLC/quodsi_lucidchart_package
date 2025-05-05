# Quodsi Messaging System

This module implements the host-side messaging infrastructure for the Quodsi LucidChart extension. It manages all communication between the extension host (running in the LucidChart context) and the embedded React panels (auth and model iframes).

## Architecture

The messaging system implements a central router pattern with specialized handlers and is organized into modular components:

```
┌───────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│                   │     │                  │     │                  │
│  LucidChart Host  │     │ MessageRouter    │     │ Message Handlers │
│  (Panels)         │◄───►│ (Central Router) │◄───►│ (By Category)    │
│                   │     │                  │     │                  │
└───────────────────┘     └──────────────────┘     └──────────────────┘
         ▲                        │                        ▲
         │                        ▼                        │
         │                ┌──────────────────┐            │
         │                │                  │            │
         │                │ ChannelManager   │            │
         │                │ RouterState      │            │
         │                │                  │            │
         │                └──────────────────┘            │
         │                                                │
         ▼                                                ▼
┌───────────────────┐                              ┌──────────────────┐
│                   │                              │                  │
│  Panel Iframes    │                              │  Business Logic  │
│  (React Apps)     │                              │  (Model Manager) │
│                   │                              │                  │
└───────────────────┘                              └──────────────────┘
```

## Key Components

### Core Components

#### Router (`RouterCore.ts`)

The `MessageRouter` is implemented as a singleton that:
- Coordinates all message routing between components
- Delegates channel management to the ChannelManager
- Delegates state management to RouterState
- Provides public methods for updating auth and subscription state
- Handles special messages like `REACT_APP_READY`

#### Channel Manager (`ChannelManager.ts`)

Manages communication channels with panels:
- Maintains a registry of panel channels (auth and model)
- Handles panel registration
- Queues messages until panels are ready
- Delivers messages to appropriate panels

#### State Manager (`RouterState.ts`)

Manages application state within the router:
- Maintains authentication state
- Maintains subscription state
- Provides methods for updating state
- Ensures proper encapsulation of state

#### Type Definitions (`RouterTypes.ts`)

Contains all shared type definitions:
- Panel role types
- Channel information interfaces
- State structure interfaces
- Log entry interfaces

### Interface (`RoutablePanel.ts`)

An interface implemented by panel classes (ContentDockPanel and RightDockPanel) that allows them to:
- Register with the router
- Receive messages from the router
- Send messages to their iframes

### Handlers (`handlers/`)

A collection of specialized handlers organized by message category:
- **AuthHandler**: Processes login, logout, and authentication state
- **FrameworkHandler**: Manages basic protocol messages (READY, ERROR, LOG)
- **SubscriptionHandler**: Handles subscription tier and feature flags
- **SelectionHandler**: Processes diagram selection changes
- **SimulationHandler**: Manages simulation run lifecycle
- **ModelOpsHandler**: Handles model validation, conversion, and results
- **StorageHandler**: Manages cloud storage integration

## Usage

### Initialization

```typescript
import { initializeMessaging } from './core/messaging';

// Initialize messaging system with debug logging
initializeMessaging(true);
```

### Panel Integration

Panels must implement the `RoutablePanel` interface:

```typescript
import { EnvelopeBase } from '@quodsi/shared';
import { router, RoutablePanel } from './core/messaging';

export class ContentDockPanel extends Panel implements RoutablePanel {
  // Implementation of RoutablePanel interface
  public relayToIframe(msg: EnvelopeBase): void {
    this.sendMessage(msg);
  }
  
  protected didMount(): void {
    // Register with the router
    router.registerChannel('auth', this);
  }
  
  protected messageFromFrame(message: unknown): void {
    // Validate and forward to router
    if (isEnvelope(message)) {
      const envelope = message as EnvelopeBase;
      envelope.source = 'auth-iframe';
      envelope.target = 'host';
      router.receive(envelope);
    }
  }
}
```

### Message Flow

1. **Incoming Messages (Iframe → Host)**:
   - Panel receives message via `messageFromFrame`
   - Validates envelope format
   - Forwards to router via `router.receive()`
   - Router handles special messages directly (e.g., `REACT_APP_READY`)
   - Router dispatches other messages to appropriate handler via dynamic import
   - Handler processes message and updates state using router's public methods

2. **Outgoing Messages (Host → Iframe)**:
   - Create message envelope with appropriate type
   - Call `router.send(target, message)`
   - ChannelManager enqueues or sends immediately based on panel readiness
   - Message is delivered to panel via `relayToIframe()`
   - Panel forwards to iframe via `sendMessage()`

### State Management

State is managed through public methods that maintain encapsulation:

```typescript
// Auth state management
router.updateAuthState(true, userInfo);
router.clearAuthState();

// Subscription state management
router.updateSubscription(tier, status, expiresAt, featureFlags);
```

## Message Lifecycle Example

Below is an example of the full message lifecycle for authentication:

1. User clicks login button in auth panel iframe
2. Auth panel iframe sends `AUTH_LOGIN_SUCCESS` to host
3. Host router receives message and forwards to `AuthHandler`
4. `AuthHandler` calls `router.updateAuthState()` to update the auth state
5. Router's `updateAuthState()` method updates internal state and broadcasts to all panels
6. Both panels update their state based on new authentication status

## Debugging

The messaging system includes built-in debugging support:

```typescript
// Enable debugging in router
router.setLogging(true);

// Access message log (in development)
console.log(window.__msgLog);
```

## Extension

To add support for new message types:

1. Add new message type and interface to `@quodsi/shared`
2. Add handler method in the appropriate handler class
3. Update the handler's `handleMessage` switch statement
4. Implement any necessary business logic
5. If state management is needed, add appropriate methods to RouterCore

## Best Practices

- Always validate incoming messages using `isEnvelope`
- Use the router to send all messages (don't call `sendMessage` directly)
- Keep handler methods focused on a single responsibility
- Use router's public methods instead of accessing internal state
- Log meaningful diagnostic information at key points
- Follow the modular design pattern - respect each module's responsibilities
