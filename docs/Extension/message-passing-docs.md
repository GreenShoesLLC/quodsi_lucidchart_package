# Message Passing in Lucidchart Simulation Extension

## Overview

The extension implements a bidirectional message passing system between the Lucidchart extension and React components through two main channels:

1. Extension-to-React communication
2. React-to-Extension communication

## Message Flow Architecture

```
Lucidchart Extension <-> PostMessage API <-> React Components
      ^                                           ^
      |                                           |
   Extension                                   React App
   Classes                                   Components
```

## Message Types

### Core Message Interface
```typescript
interface LucidChartMessage {
    messagetype: string;
    simtype?: string;
    version: string;
    instancedata: string;
    documentId: string;
    lucidId: string;
}
```

### Primary Message Types

1. **Component Communication**
   - `reactAppReady`: React app initialization complete
   - `lucidchartdata`: Data transfer from extension to React
   - `componentTypeChanged`: Component type updates
   - `componentTypeUpdateComplete`: Update confirmation

2. **Model Operations**
   - `modelSaved`: Model data persistence
   - `ConvertPageToModel`: Page conversion request
   - `ValidateModel`: Model validation request
   - `RemoveModel`: Model deletion request
   - `SimulateModel`: Simulation execution request

3. **Editor Operations**
   - `activitySaved`: Activity data updates
   - `resourceSaved`: Resource data updates
   - `entitySaved`: Entity data updates
   - `connectorSaved`: Connector data updates
   - `generatorSaved`: Generator data updates

4. **Status Updates**
   - `updatePageStatus`: Page status changes
   - `statusUpdateComplete`: Status update confirmation

## Implementation Details

### Extension Side (TypeScript)

1. **Panel Classes**
```typescript
class RightPanel extends Panel {
    protected messageFromFrame(message: any): void {
        // Handle incoming messages
    }

    public sendMessageToReact(): void {
        // Send messages to React
    }
}
```

2. **Message Handling**
```typescript
// Example from RightPanel
if (message.messagetype === 'componentTypeChanged') {
    this.handleComponentTypeChange(message);
} else if (message.messagetype === 'updatePageStatus') {
    this.updatePageStatus(message.data);
}
```

### React Side (TypeScript/React)

1. **Message Reception**
```typescript
useEffect(() => {
    const eventListener = (event: MessageEvent) => {
        handleMessage(event.data as LucidChartMessage);
    };

    window.addEventListener("message", eventListener);
    return () => window.removeEventListener("message", eventListener);
}, []);
```

2. **Message Sending**
```typescript
window.parent.postMessage({
    messagetype: 'activitySaved',
    data: savedActivity
}, '*');
```

## Key Implementation Patterns

1. **Initialization Handshake**
```typescript
// React side
window.parent.postMessage({
    messagetype: 'reactAppReady'
}, '*');

// Extension side
if (message.messagetype === 'reactAppReady') {
    this.reactAppReady = true;
    this.sendInitialData();
}
```

2. **Data Synchronization**
```typescript
// Extension -> React
sendMessageToReact(): void {
    const message = LucidChartMessageClass.createMessage(
        'lucidchartdata',
        instancedata,
        documentId,
        lucidId,
        objectType,
        "1"
    );
    this.sendMessage(message.toObject());
}

// React -> Extension
const handleSave = () => {
    window.parent.postMessage({
        messagetype: 'activitySaved',
        data: localActivity
    }, '*');
};
```

3. **Status Management**
```typescript
private updatePageStatus(newStatus: PageStatus): void {
    try {
        // Update status in shape data
        activePage.shapeData.set(
            RightPanel.CURRENT_STATUS_KEY,
            JSON.stringify(newStatus)
        );

        // Confirm update to React
        this.sendMessage({
            messagetype: 'statusUpdateComplete',
            success: true
        });
    } catch (error) {
        this.sendMessage({
            messagetype: 'statusUpdateComplete',
            success: false,
            error: 'Failed to update page status'
        });
    }
}
```

## Error Handling

1. **Type Safety**
```typescript
protected messageFromFrame(message: any): void {
    try {
        if (!message || !message.messagetype) {
            throw new Error('Invalid message format');
        }
        // Process message
    } catch (error) {
        console.error('Error processing message:', error);
    }
}
```

2. **State Validation**
```typescript
public sendMessageToReact(): void {
    if (!this.reactAppReady) {
        console.log("React app not ready yet, waiting...");
        return;
    }
    // Send message
}
```

## Best Practices

1. **Message Logging**
- All message operations are logged for debugging
- Include timestamps and relevant context
- Log both success and failure cases

2. **State Management**
- Track application readiness state
- Maintain message queue if needed
- Handle component lifecycle appropriately

3. **Error Recovery**
- Implement timeout mechanisms
- Provide fallback behaviors
- Clean up resources properly

4. **Type Safety**
- Use TypeScript interfaces for message types
- Validate message structure
- Handle edge cases and null values

## Common Pitfalls to Avoid

1. **Timing Issues**
- Don't assume immediate React app readiness
- Handle race conditions in message processing
- Implement proper initialization sequence

2. **Memory Management**
- Clean up event listeners
- Handle component unmounting
- Prevent message leaks

3. **State Synchronization**
- Maintain consistent state between extension and React
- Handle concurrent updates
- Implement proper locking mechanisms if needed
