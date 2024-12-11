# Extension Messaging Service Design

## Current State

ModelPanel currently handles all messaging between the extension and React app. It includes:

### 1. Message Creation
```typescript
function createSerializableMessage<T extends MessageTypes>(
    type: T,
    data?: any
): { [key: string]: any } {
    return {
        messagetype: type,
        data: data ?? null
    };
}
```

### 2. Message Sending
```typescript
private sendTypedMessage<T extends MessageTypes>(
    type: T,
    payload?: MessagePayloads[T]
): void {
    this.sendMessage(createSerializableMessage(type, payload));
}
```

### 3. Message Receiving/Handling
```typescript
protected messageFromFrame(message: any): void {
    if (!isValidMessage(message)) {
        this.sendTypedMessage(MessageTypes.ERROR, {
            error: 'Invalid message format'
        });
        return;
    }

    switch (message.messagetype) {
        case MessageTypes.REACT_APP_READY:
            this.handleReactReady();
            break;
        case MessageTypes.VALIDATE_MODEL:
            this.handleValidateModel();
            break;
        // ... many more cases
    }
}
```

## Issues with Current Approach

1. Tight Coupling: ModelPanel handles both UI panel management AND messaging
2. Limited Reusability: Other components can't easily use the messaging functionality
3. Complex Message Handling: Large switch statement in messageFromFrame
4. No Centralized Message Management: Each component needs its own messaging implementation
5. Validation and Selection Updates: Currently mixed with panel logic

## Proposed ExtensionMessaging Service

The ExtensionMessaging service would provide:

### 1. Message Bus Interface
```typescript
export interface IMessageHandler {
    handleMessage(message: any): void;
}
```

### 2. Message Registration and Handling
```typescript
private handlers: Map<MessageTypes, Set<(payload: any) => void>> = new Map();

onMessage<T extends MessageTypes>(
    type: T,
    handler: (payload: MessagePayloads[T]) => void
): () => void
```

### 3. Type-safe Message Sending
```typescript
sendMessage<T extends MessageTypes>(
    type: T,
    payload?: MessagePayloads[T]
): void
```

## Benefits

### 1. Separation of Concerns
- Messaging logic isolated from panel management
- Each component focuses on its primary responsibility
- Cleaner, more maintainable code structure

### 2. Reusability
- Any component can use messaging service
- Consistent messaging pattern across extension
- Share message handlers between components

### 3. Type Safety
- Type-checked message payloads
- Compile-time message type validation
- Reduced runtime errors

### 4. Testability
- Easy to mock messaging service
- Isolated testing of message handling
- Better test coverage

### 5. Event-Based Architecture
- Subscribe/unsubscribe to message types
- Decoupled event handling
- More flexible component communication

## Specific Impact on Selection Handling

### Current:
```typescript
viewport.hookSelection((items) => {
    modelPanel.handleSelectionChange(items);
});
```

### Proposed:
```typescript
// In extension setup
viewport.hookSelection((items) => {
    messaging.sendMessage(MessageTypes.EDITOR_SELECTION_CHANGED, { items });
});

// In components
messaging.onMessage(MessageTypes.EDITOR_SELECTION_CHANGED, ({ items }) => {
    // Handle selection change
});
```

### Key Improvements
1. Selection changes become standard messages
2. Multiple components can react to selection changes
3. Consistent handling with other events
4. Clear separation between selection event and handling
5. Easier to modify selection behavior

## Additional Benefits
1. Better validation flow integration
2. Simplified ModelPanel implementation
3. Clearer component responsibilities
4. Easier to add new message types
5. Better error handling and logging
6. More maintainable codebase

This service would form the foundation for all extension-React communication, including the validation functionality that prompted this discussion.
