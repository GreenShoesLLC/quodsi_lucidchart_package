# Message Protocol

The envelope-based protocol for extension-React communication.

## Envelope Structure

All messages use a standardized envelope:

```typescript
interface EnvelopeBase {
  id: string;              // Unique message ID
  type: EnvelopeMessageType; // Message type enum
  source: string;          // 'host' | 'auth-iframe' | 'model-iframe'
  target: string;          // 'host' | 'auth-iframe' | 'model-iframe' | 'broadcast'
  version: string;         // Protocol version (currently '1.0')
  data: any;              // Message-specific payload
}
```

## Message ID Generation

**Extension:**
```typescript
// src/core/messaging/MessageRouter.ts:56-58
private generateId(): string {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}
```

**React:**
Similar pattern in `useSendMessage` hook.

## Source/Target Patterns

### Standard Routing

**React → Extension:**
- source: `'auth-iframe'` or `'model-iframe'`
- target: `'host'`

**Extension → React (Direct):**
- source: `'host'`
- target: `'auth-iframe'` or `'model-iframe'`

**Extension → React (Broadcast):**
- source: `'host'`
- target: `'broadcast'`

### Routing Logic

File: `src/core/messaging/MessageRouter.ts:168-196`

**send(target, msg):**
- If `target === 'broadcast'`: Sends to all registered channels
- Otherwise: Sends to specific channel (auth or model)
- Ensures channel has panel before sending
- Uses message queuing if channel not ready

## Message Types

Defined in: `@quodsi/shared/src/quodsi-messaging/envelope/envelopeMessageTypes.ts`

**Enum:** `EnvelopeMessageType`

Categories:
- Framework: `REACT_APP_READY`, `ERROR_LOGGING`
- Auth: `AUTH_STATUS`, `AUTH_LOGIN_SUCCESS`, `AUTH_LOGOUT`, `AUTH_REQUIRED`
- Selection: `SELECTION_CHANGED`, `MODEL_CONTEXT`
- Element Ops: `ELEMENT_UPDATE`, `ELEMENT_UPDATE_RESULT`, `ELEMENT_CONVERT`, etc.
- Model Ops: `MODEL_VALIDATE`, `VALIDATION_RESULT`, `MODEL_CONVERT`, etc.
- Simulation: `MODEL_RUN_REQUEST`, `MODEL_RUN_ACK`, `MODEL_RUN_STATUS`

## Type Guards

**Validation:**
```typescript
import { isEnvelope } from '@quodsi/shared';

if (!isEnvelope(message)) {
  // Invalid message, reject
  return;
}
```

File: `@quodsi/shared/src/quodsi-messaging/envelope/`

## Version Management

Currently at version `'1.0'`.

Future versions can add:
- Payload schema validation
- Backward compatibility checks
- Migration helpers

## Protocol Guarantees

1. **Type Safety**: All messages validated with TypeScript interfaces
2. **Unique IDs**: Every message has unique identifier
3. **Clear Routing**: Explicit source/target prevents misdirection
4. **Envelope Validation**: Type guards ensure message integrity

## Error Handling

Invalid messages are:
- Logged for debugging
- Not processed
- Do not crash the system

See: [error-logging.md](./framework/error-logging.md) for error reporting protocol.
