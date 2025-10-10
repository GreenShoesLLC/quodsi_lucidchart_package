# Mapper System

How React converts incoming messages to reducer actions.

## Overview

React uses **mapper functions** to convert envelope messages into reducer actions that update application state.

## Mapper Architecture

**File:** `quodsim-react/src/messaging/mappers/`

Each mapper handles specific message categories:
- `mapAuth()` - Authentication messages
- `mapSelection()` - Selection and context
- `mapElementOps()` - Element operations
- `mapModelOps()` - Model operations
- `mapSimulation()` - Simulation messages
- `mapFramework()` - Framework messages
- `mapSubscription()` - Subscription status
- `mapStorage()` - Storage operations

## Mapper Function Signature

```typescript
export function mapXXX(msg: EnvelopeBase): MessagingAction | null {
  // Return null if message not handled
  if (msg.type !== EnvelopeMessageType.RELEVANT_TYPE) {
    return null;
  }

  // Extract payload
  const data = msg.data as SpecificPayloadType;

  // Return reducer action
  return {
    type: 'ACTION_TYPE',
    payload: data
  };
}
```

## Master Mapper

**File:** `quodsim-react/src/messaging/mappers/mapEnvelopeToAction.ts:37`

Routes messages to appropriate category mapper:

```typescript
export function mapEnvelopeToAction(msg: EnvelopeBase): MessagingAction | null {
  // Try each mapper in sequence
  return (
    mapFramework(msg) ||
    mapAuth(msg) ||
    mapSubscription(msg) ||
    mapSelection(msg) ||
    mapElementOps(msg) ||
    mapModelOps(msg) ||
    mapSimulation(msg) ||
    mapStorage(msg) ||
    null // Not handled by any mapper
  );
}
```

## Example: Auth Mapper

**File:** `quodsim-react/src/messaging/mappers/auth.mapper.ts:72`

```typescript
export function mapAuth(msg: EnvelopeBase): MessagingAction | null {
  switch (msg.type) {
    case EnvelopeMessageType.AUTH_STATUS:
      const data = msg.data as { isAuthenticated: boolean; userInfo?: UserInfo };
      return {
        type: 'AUTH_STATUS_UPDATE',
        isAuthenticated: data.isAuthenticated,
        userInfo: data.userInfo
      };

    case EnvelopeMessageType.AUTH_REQUIRED:
      return {
        type: 'AUTH_REQUIRED',
        requestedOperation: msg.data.requestedOperation
      };

    default:
      return null; // Not an auth message
  }
}
```

## Example: Selection Mapper

**File:** `quodsim-react/src/messaging/mappers/selection.mapper.ts:15`

```typescript
export function mapSelection(msg: EnvelopeBase): MessagingAction | null {
  switch (msg.type) {
    case EnvelopeMessageType.SELECTION_CHANGED:
      return {
        type: 'SELECTION_UPDATE',
        payload: {
          selectedType: msg.data.selectionType,
          selectedIds: msg.data.selectionState.selectedIds,
          elementData: msg.data.modelItemData,
          context: msg.data.documentContext
        }
      };

    case EnvelopeMessageType.MODEL_CONTEXT:
      return {
        type: 'DOCUMENT_CONTEXT_UPDATE',
        documentId: msg.data.documentId,
        pageId: msg.data.pageId,
        documentTitle: msg.data.title,
        isQuodsiModel: msg.data.isQuodsiModel
      };

    default:
      return null;
  }
}
```

## Reducer Integration

Mapper actions are dispatched to messaging reducer:

**File:** `quodsim-react/src/messaging/effects/messageListenerEffect.ts`

```typescript
const action = mapEnvelopeToAction(msg);

if (action) {
  dispatch(action); // Update state
} else {
  logger.warn('Message not handled by any mapper:', msg.type);
}
```

## Reducer Handles Actions

**File:** `quodsim-react/src/messaging/state/`

Specialized slice reducers handle actions:
- `authSlice.ts` - AUTH_STATUS_UPDATE, AUTH_REQUIRED
- `selectionSlice.ts` - SELECTION_UPDATE, DOCUMENT_CONTEXT_UPDATE
- `simulationSlice.ts` - SIMULATION_STATUS_UPDATE
- `validationSlice.ts` - VALIDATION_RESULT_UPDATE

## Adding a New Mapper

### 1. Create Mapper File

```typescript
// quodsim-react/src/messaging/mappers/newCategory.mapper.ts
import { EnvelopeBase, EnvelopeMessageType } from '@quodsi/shared';
import { MessagingAction } from '../state/types';

export function mapNewCategory(msg: EnvelopeBase): MessagingAction | null {
  if (msg.type !== EnvelopeMessageType.NEW_MESSAGE_TYPE) {
    return null;
  }

  return {
    type: 'NEW_ACTION_TYPE',
    payload: msg.data
  };
}
```

### 2. Add to Master Mapper

```typescript
// In mapEnvelopeToAction.ts
import { mapNewCategory } from './newCategory.mapper';

export function mapEnvelopeToAction(msg: EnvelopeBase): MessagingAction | null {
  return (
    // ... existing mappers ...
    mapNewCategory(msg) ||
    null
  );
}
```

### 3. Handle in Reducer

```typescript
// Add action type to state/types.ts
type MessagingAction =
  | { type: 'NEW_ACTION_TYPE'; payload: any }
  | ...existing types...;

// Handle in appropriate slice reducer
case 'NEW_ACTION_TYPE':
  return {
    ...state,
    newField: action.payload
  };
```

## Debugging Mappers

**Enable logging:**
```typescript
// In browser console
window.__quodsiDebug.enableComponent('SelectionMapper');
```

**Check if message handled:**
```typescript
const testMsg = {
  id: 'test',
  type: 'SELECTION_CHANGED',
  source: 'host',
  target: 'model-iframe',
  version: '1.0',
  data: { ... }
};

const action = mapEnvelopeToAction(testMsg);
console.log('Mapped action:', action);
```

## Mapper Patterns

### Null Return Pattern
Mappers return `null` for messages they don't handle, allowing the master mapper to try other mappers.

### Type Safety
TypeScript ensures payload types match expected reducer action types.

### Single Responsibility
Each mapper handles one message category, keeping code organized.

### Logging
Mappers use `debugService` for conditional logging.

## Related Documentation

- [Message Protocol](./01_message_protocol.md) - Envelope structure
- [Message Lifecycle](./02_message_lifecycle.md) - How messages flow
- Individual message docs - Specific mapper implementations
