# Message Passing in Lucidchart Simulation Extension

## Overview

The extension implements a bidirectional message passing system between the Lucidchart extension and React components using a strongly-typed TypeScript messaging architecture. The system provides type safety, payload validation, and clear message categorization.

## Message Architecture

```
Lucidchart Extension <-> PostMessage API <-> React Components
      ^                                           ^
      |                                           |
   Extension                                   React App
   Classes                                   Components
```

## Core Message Structure

### Base Message Format
Messages follow a simple, consistent structure:
```typescript
{
    messagetype: MessageTypes;  // Enum value defining the message type
    data: PayloadType<T> | null;  // Strongly typed payload data
}
```

### Type-Safe Message System
```typescript
// Message type enumeration
enum MessageTypes {
    REACT_APP_READY = 'reactAppReady',
    INITIAL_STATE = 'initialState',
    // ... other message types
}

// Payload type definitions
interface MessagePayloads {
    [MessageTypes.REACT_APP_READY]: undefined;
    [MessageTypes.INITIAL_STATE]: {
        isModel: boolean;
        pageId: string;
        documentId: string;
        canConvert: boolean;
        modelData: any | null;
        selectionState: SelectionState;
    };
    // ... other payload definitions
}
```

## Message Categories

### 1. React App Lifecycle
- `REACT_APP_READY`: React application initialization
- `INITIAL_STATE`: Initial state transfer
- `ERROR`: Error notification

### 2. Selection Management
- `SELECTION_CHANGED`: User selection updates
```typescript
{
    selectionState: SelectionState;
    elementData?: any[];
}
```

### 3. Model Conversion
- `CONVERT_PAGE`: Start conversion
- `CONVERSION_STARTED`: Conversion initiated
- `CONVERSION_COMPLETE`: Conversion finished
- `CONVERSION_ERROR`: Conversion failed
```typescript
// Conversion complete payload
{
    success: boolean;
    modelId: string;
    elementCount: {
        activities: number;
        generators: number;
        resources: number;
        connectors: number;
    };
}
```

### 4. Element Data Operations
- `GET_ELEMENT_DATA`: Request element data
- `ELEMENT_DATA`: Element data response
- `UPDATE_ELEMENT_DATA`: Update request
- `UPDATE_SUCCESS`: Update confirmation
```typescript
// Element data payload
{
    id: string;
    data: any;
    metadata: any;
    referenceData: EditorReferenceData;
}
```

### 5. Model Operations
- `MODEL_SAVED`: Model persistence
- `MODEL_LOADED`: Model loading
- `REMOVE_MODEL`: Model deletion request
- `MODEL_REMOVED`: Deletion confirmation
- `SIMULATE_MODEL`: Simulation execution

### 6. Component Operations
- `ACTIVITY_SAVED`: Activity updates
- `CONNECTOR_SAVED`: Connector updates
- `ENTITY_SAVED`: Entity updates
- `GENERATOR_SAVED`: Generator updates
- `RESOURCE_SAVED`: Resource updates
```typescript
// Component save payload
{
    elementId: string;
    data: any;
}
```

## Implementation Utilities

### Message Creation
```typescript
function createSerializableMessage<T extends MessageTypes>(
    type: T,
    payload?: MessagePayloads[T]
): { [key: string]: any } {
    return {
        messagetype: type,
        data: payload ?? null
    };
}
```

### Message Validation
```typescript
function isValidMessage(
    message: any
): message is { messagetype: MessageTypes; data: any } {
    return message
        && typeof message === 'object'
        && 'messagetype' in message
        && Object.values(MessageTypes).includes(message.messagetype);
}
```

### Type Helpers
```typescript
type PayloadType<T extends MessageTypes> = MessagePayloads[T];
```

## Usage Examples

### 1. Sending Messages
```typescript
// React to Extension
window.parent.postMessage(
    createSerializableMessage(MessageTypes.REACT_APP_READY),
    '*'
);

// With payload
window.parent.postMessage(
    createSerializableMessage(MessageTypes.UPDATE_ELEMENT_DATA, {
        elementId: 'activity1',
        data: activityData,
        type: SimulationObjectType.ACTIVITY
    }),
    '*'
);
```

### 2. Receiving Messages
```typescript
window.addEventListener('message', (event) => {
    if (!isValidMessage(event.data)) {
        return;
    }

    switch (event.data.messagetype) {
        case MessageTypes.INITIAL_STATE:
            const { isModel, pageId, modelData } = event.data.data;
            // Handle initial state
            break;
            
        case MessageTypes.VALIDATION_RESULT:
            const validationResult = event.data.data;
            // Handle validation result
            break;
    }
});
```

## Best Practices

1. **Type Safety**
   - Always use `createSerializableMessage` for message creation
   - Validate incoming messages with `isValidMessage`
   - Use type assertions sparingly

2. **Message Handling**
   - Implement proper error handling
   - Handle all relevant message types
   - Validate message payloads

3. **State Management**
   - Maintain consistent state between components
   - Handle race conditions
   - Implement proper error recovery

4. **Performance**
   - Keep payloads minimal
   - Batch updates when possible
   - Avoid unnecessary messages

## Common Pitfalls

1. **Type Issues**
   - Not using type-safe message creators
   - Missing type guards
   - Incorrect payload types

2. **State Management**
   - Race conditions
   - Missing error states
   - Inconsistent state updates

3. **Error Handling**
   - Unhandled message types
   - Missing validation
   - Incomplete error reporting