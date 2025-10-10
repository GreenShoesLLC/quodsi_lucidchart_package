# Framework & Lifecycle Messages

Core system messages for panel initialization and error handling.

## Messages

### [REACT_APP_READY](./react-app-ready.md)
**Direction:** React → Extension
**Purpose:** Initial handshake when React panel is ready to receive messages

**Key Features:**
- Multiple send mechanisms (normal + emergency timer)
- Triggers channel readiness
- Flushes queued messages
- Includes auth state in payload

### [ERROR_LOGGING](./error-logging.md)
**Direction:** React → Extension
**Purpose:** Report errors from React app to extension for debugging

**Key Features:**
- Stack traces included
- Component information
- User action context

## Common Patterns

**Panel Initialization:**
```
User clicks panel → iframe loads → React initializes →
REACT_APP_READY → Extension marks ready → Flushes queue
```

## Integration

These messages are handled by:
- **Extension:** `MessageRouter.handleReactAppReady()`
- **React:** `useReactAppReadyEffect`, `useEmergencyReactAppReadyEffect`

See: [Bootstrap Process](../../bootstrap/) for detailed initialization sequence.
