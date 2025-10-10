# Messaging System Architecture

Documentation for the Quodsi messaging protocol that enables communication between the LucidChart extension and React panels.

## Overview

The messaging system uses a **postMessage-based protocol** with typed envelopes to facilitate bidirectional communication between:
- **Extension Host** (TypeScript/Lucid SDK)
- **React Panels** (iframe-embedded React apps)

## Core Concepts

### Message Protocol
- [01_message_protocol.md](./01_message_protocol.md) - Envelope structure, message IDs, routing
- [02_message_lifecycle.md](./02_message_lifecycle.md) - How messages flow through the system
- [03_mapper_system.md](./03_mapper_system.md) - React mapper functions and reducer actions

### Key Components

**Extension Side:**
- `MessageRouter` - Central singleton for routing messages
- `ChannelManager` - Manages panel channels and message queuing
- Message Handlers - Process incoming messages from React

**React Side:**
- `MessageProvider` - Context provider for messaging state
- Mappers - Convert messages to reducer actions (`mapAuth`, `mapSelection`, etc.)
- `useSendMessage` - Hook for sending messages to extension

## Message Categories

### [Framework & Lifecycle](./framework/)
Core system messages for initialization and error handling.

| Message | Direction | Purpose |
|---------|-----------|---------|
| REACT_APP_READY | React → Extension | Initial handshake, panel ready |
| ERROR_LOGGING | React → Extension | Error reporting |

### [Authentication](./auth/)
User authentication and session management.

| Message | Direction | Purpose |
|---------|-----------|---------|
| AUTH_STATUS | Extension → React | Auth state synchronization |
| AUTH_LOGIN_SUCCESS/LOGOUT | React → Extension | Login/logout actions |
| AUTH_REQUIRED | Extension → React | Operation requires authentication |

### [Selection & Context](./selection/)
Element selection and document context.

| Message | Direction | Purpose |
|---------|-----------|---------|
| SELECTION_CHANGED | Extension → React | User selected element(s) |
| MODEL_CONTEXT | Extension → React | Document/page context |

### [Element Operations](./element-ops/)
Operations on individual simulation objects.

| Message | Direction | Purpose |
|---------|-----------|---------|
| ELEMENT_UPDATE | React → Extension | Update element properties |
| ELEMENT_UPDATE_RESULT | Extension → React | Update result feedback |
| ELEMENT_CONVERT | React → Extension | Convert element type |
| ELEMENT_CONVERT_RESULT | Extension → React | Conversion result |

### [Model Operations](./model-ops/)
Operations on the entire model.

| Message | Direction | Purpose |
|---------|-----------|---------|
| MODEL_VALIDATE | React → Extension | Validate entire model |
| VALIDATION_RESULT | Extension → React | Validation feedback |
| MODEL_CONVERT | React → Extension | Convert page to model |
| MODEL_REMOVE | React → Extension | Remove model from page |
| RESULTS_PAGE_CREATE | React → Extension | Create results dashboard |

### [Simulation](./simulation/)
Simulation execution and status.

| Message | Direction | Purpose |
|---------|-----------|---------|
| MODEL_RUN_REQUEST | React → Extension | Start simulation |
| MODEL_RUN_ACK | Extension → React | Simulation started |
| MODEL_RUN_STATUS | Extension → React | Status updates during run |

## Message Flow Patterns

### Request/Response
Many operations use request/response pairs:
```
React: ELEMENT_UPDATE →
    Extension: (processes)
← Extension: ELEMENT_UPDATE_RESULT
```

### Broadcast
Some messages go to all panels:
```
Extension: AUTH_STATUS → auth panel
                       → model panel
```

### Status Updates
Long-running operations send periodic updates:
```
MODEL_RUN_REQUEST →
← MODEL_RUN_ACK
← MODEL_RUN_STATUS (multiple)
← RESULTS_PAGE_CREATE
```

## Quick Reference

### Common Workflows

**Panel Initialization:**
1. User clicks panel icon
2. React app loads and initializes
3. `REACT_APP_READY` → Extension
4. Extension responds with `AUTH_STATUS`, `SUBSCRIPTION_STATUS`

**Element Editing:**
1. User selects element
2. Extension sends `SELECTION_CHANGED`
3. User edits in React UI
4. `ELEMENT_UPDATE` → Extension
5. Extension responds with `ELEMENT_UPDATE_RESULT`

**Running Simulation:**
1. `MODEL_VALIDATE` → Extension (verify model)
2. `MODEL_RUN_REQUEST` → Extension
3. Extension sends `MODEL_RUN_ACK`
4. Extension sends periodic `MODEL_RUN_STATUS`
5. `RESULTS_PAGE_CREATE` when complete

### Debugging

Enable message logging:
```typescript
// Extension console
MessageRouter.getInstance().setLogging(true);

// React console
window.__quodsiDebug.enableLogging();
```

View message log:
```typescript
// Extension
window.__msgLog // Last 100 messages

// React
window.__quodsiDebug.getAllLogs()
```

## Adding New Messages

1. Define message type in `@quodsi/shared/src/quodsi-messaging/envelope/envelopeMessageTypes.ts`
2. Create TypeScript interfaces for payload
3. Implement sender (React or Extension)
4. Implement handler (Extension or React)
5. Add mapper case (if React receiver)
6. Document in appropriate category folder
7. Update this README

## Related Documentation

- [Bootstrap Process](../bootstrap/) - How messaging system initializes
- [Panel Architecture](../panels/) - Panel lifecycle and communication *(coming soon)*
- Message Protocol Details - See individual message docs

---

For questions or issues with the messaging system, refer to individual message documentation or check the troubleshooting section in bootstrap docs.
