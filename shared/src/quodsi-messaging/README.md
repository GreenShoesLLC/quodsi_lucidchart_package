# Quodsi Messaging Protocol

This package defines the standardized messaging protocol for communication between Quodsi editor extension (host) and embedded React panels (iframes). The protocol is designed to be version-controlled separately from the application code, allowing the host and iframe components to evolve independently while maintaining interoperability.

## Overview

The Quodsi Messaging Protocol implements a unified postMessage architecture using a common envelope format with type-safe discriminated unions. It provides strongly-typed definitions for all messages exchanged between the LucidChart extension host and the embedded React panels.

### Key Features

- **Common Envelope Format**: All messages share a standard envelope structure
- **Type Safety**: Full TypeScript support with discriminated unions and type guards
- **Modular Categories**: Messages are organized into functional categories
- **Builder Utilities**: Helper functions to create properly formatted messages
- **Validation Guards**: Type guards for runtime message validation

## Usage

### Importing

```typescript
import { 
  EnvelopeMessageType,
  EnvelopeBase,
  isEnvelope,
  QuodsiMessage,
  createReactAppReadyMessage 
} from '@quodsi/shared';
```

### Sending Messages

Use the builder functions to create properly formatted messages:

```typescript
import { createReactAppReadyMessage } from '@quodsi/shared';

// Create a REACT_APP_READY message from iframe to host
const readyMessage = createReactAppReadyMessage(
  'model',
  false,
  undefined
);

// Send using postMessage
window.parent.postMessage(readyMessage, '*');
```

### Receiving Messages

Use the validation utilities to check incoming messages:

```typescript
import { isEnvelope, EnvelopeMessageType, QuodsiMessage } from '@quodsi/shared';

// Handle incoming message
window.addEventListener('message', (event) => {
  // Validate that it's a proper envelope
  if (!isEnvelope(event.data)) {
    console.error('Received invalid message format:', event.data);
    return;
  }

  const message = event.data as QuodsiMessage;
  
  // Handle based on message type
  switch (message.type) {
    case EnvelopeMessageType.AUTH_STATUS:
      // Handle authentication status update
      updateAuthState(message.data.isAuthenticated, message.data.user);
      break;
    
    case EnvelopeMessageType.SELECTION_CHANGED:
      // Handle selection change
      updateSelection(message.data.selected);
      break;
    
    // Other message types...
  }
});
```

## Message Structure

### Envelope

Every message in the protocol follows this envelope structure:

```typescript
interface EnvelopeBase {
  id: string;                // UUID for correlating request/response
  type: EnvelopeMessageType; // Discriminant for the payload schema
  source: MessageSource;     // Originating context
  target: MessageTarget;     // Intended recipient
  version: '1.0';            // Protocol version
  data: unknown;             // Type-specific payload
}
```

### Message Categories

Messages are organized into the following categories:

1. **Framework & Lifecycle**: Basic protocol management (`REACT_APP_READY`, `ERROR`, `LOG`)
2. **Authentication**: User identity and session management
3. **Subscription & Billing**: Tier management and feature flags
4. **Selection & Context**: Diagram selection and document context
5. **Simulation Run**: Model execution and status reporting
6. **Model Operations**: Validation, conversion, and results management
7. **Cloud Storage**: External storage integration

## Type Safety

The protocol uses TypeScript to enforce type safety:

- Each message type has a corresponding interface extending `EnvelopeBase`
- The `data` field is strongly typed based on the message type
- Type guards ensure runtime validation of message structures
- Union types combine related messages for exhaustive pattern matching

## Development

### Adding New Message Types

1. Add a new constant to `EnvelopeMessageType` enum
2. Create a message interface extending `EnvelopeBase`
3. Add the message to the relevant category union type
4. Add the message to the `QuodsiMessage` union type
5. Create a builder function for the new message type
6. Update the `EnvelopMessagePayloads` mapping

### Version Management

- The envelope `version` field indicates protocol compatibility
- Minor version updates (`1.0` → `1.1`) should maintain backward compatibility
- Major version updates (`1.0` → `2.0`) may introduce breaking changes

## Debugging

The protocol includes built-in support for debugging:

- `LOG` message type for development-only logging
- Type guards provide helpful validations
- Message builders ensure proper message formatting

## Contributing

When contributing to the messaging protocol:

1. Use TypeScript for all definitions
2. Include JSDoc comments to document purpose and fields
3. Add appropriate builder functions for new message types
4. Update unit tests for any protocol changes
5. Document any changes in the protocol version history
