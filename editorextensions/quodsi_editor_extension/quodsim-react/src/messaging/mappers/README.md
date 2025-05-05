# Message Mappers

This directory contains specialized mapper functions that transform incoming messages from the host into reducer actions for the React application state. Each mapper focuses on a specific message category and handles the transformation logic for its domain.

## Architecture

The mappers implement a chain-of-responsibility pattern:

```
                            ┌──────────────────────┐
                            │                      │
                            │ mapEnvelopeToAction  │
                            │                      │
                            └─────────┬────────────┘
                                      │
                            ┌─────────▼────────────┐
                            │  Try each mapper     │
                            │  in priority order   │
                            └──────────────────────┘
                                      │
         ┌──────────────┬─────────────┼─────────────┬──────────────┐
         │              │             │             │              │
┌────────▼─────┐ ┌──────▼───────┐ ┌───▼────────┐ ┌──▼─────────┐ ┌─▼────────────┐
│              │ │              │ │            │ │            │ │              │
│ Framework    │ │ Auth         │ │ Selection  │ │ Simulation │ │ ModelOps     │
│ Mapper       │ │ Mapper       │ │ Mapper     │ │ Mapper     │ │ Mapper       │
│              │ │              │ │            │ │            │ │              │
└──────────────┘ └──────────────┘ └────────────┘ └────────────┘ └──────────────┘
```

## Key Files

### `mapEnvelopeToAction.ts`

The central dispatcher that:
- Takes an incoming envelope message
- Tries each mapper in sequence until one handles it
- Returns the resulting action or null
- Handles errors in individual mappers

### Category Mappers

Each category mapper follows the pattern:
1. Check if the message belongs to its category
2. Extract and validate message data
3. Transform into the appropriate reducer action
4. Handle special cases or complex transformations

The following mappers are implemented:

- **framework.mapper.ts**: Handles core protocol messages (`REACT_APP_READY`, `ERROR`, `LOG`)
- **auth.mapper.ts**: Processes authentication messages
- **subscription.mapper.ts**: Handles subscription state and changes
- **selection.mapper.ts**: Transforms selection and context updates
- **simulation.mapper.ts**: Manages simulation run status
- **modelOps.mapper.ts**: Processes model operations (validate, convert, etc.)
- **storage.mapper.ts**: Handles cloud storage integration

## Usage Example

```typescript
import { mapEnvelopeToAction } from './mappers';
import { isEnvelope } from '@quodsi/shared';

// In MessageProvider event listener
window.addEventListener('message', (event) => {
  // Validate envelope format
  if (!isEnvelope(event.data)) {
    console.warn('Invalid message format');
    return;
  }
  
  // Map to action
  const action = mapEnvelopeToAction(event.data);
  
  // Dispatch action if valid
  if (action) {
    dispatch(action);
  }
});
```

## Mapper Implementation

Each mapper follows this pattern:

```typescript
import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { MessagingAction } from '../reducer';

export function mapCategory(msg: EnvelopeBase): MessagingAction | null {
  // Quick check if message belongs to this category
  if (
    msg.type !== EnvelopeMessageType.CATEGORY_MESSAGE_ONE &&
    msg.type !== EnvelopeMessageType.CATEGORY_MESSAGE_TWO
  ) {
    return null;
  }

  // Process by message type
  switch (msg.type) {
    case EnvelopeMessageType.CATEGORY_MESSAGE_ONE:
      // Extract data
      const data = msg.data as { /* type definition */ };
      
      // Return appropriate action
      return {
        type: 'ACTION_TYPE',
        // Action payload
      };
      
    case EnvelopeMessageType.CATEGORY_MESSAGE_TWO:
      // Similar handling...
      
    default:
      return null;
  }
}
```

## Adding a New Mapper

To add support for a new message category:

1. Create a new file: `newCategory.mapper.ts`
2. Implement the mapper function
3. Add it to the mappers array in `mapEnvelopeToAction.ts`
4. Export it from `index.ts`

## Testing Mappers

Each mapper can be tested in isolation:

```typescript
// Test a specific mapper
import { mapAuth } from './auth.mapper';

const testMsg = {
  id: 'test-id',
  type: EnvelopeMessageType.AUTH_STATUS,
  source: 'host',
  target: 'auth-iframe',
  version: '1.0',
  data: {
    isAuthenticated: true,
    user: { id: 'user1', email: 'test@example.com' }
  }
};

const action = mapAuth(testMsg);
// Should return AUTH_STATUS_UPDATE action
```

## Best Practices

- Keep mappers focused on transformation, not side effects
- Use TypeScript for proper type checking
- Include validation to handle malformed messages
- Maintain mapper priority in the central dispatcher
- Document special case handling
- Add tests for complex transformations
