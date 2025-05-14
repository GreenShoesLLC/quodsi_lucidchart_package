# Element Editor Save Flow

This document outlines the current messaging flow when a user modifies and saves changes in an Element Editor (Activity, Resource, Connector, etc.) in the Quodsi LucidChart extension.

## Overview

When a user selects a mapped element in the LucidChart document, the appropriate editor is displayed in the right dock panel. After making changes and clicking the "Save" button, a series of messages are exchanged between the React application and the extension host to persist changes back to the LucidChart document.

## Message Flow Sequence

### 1. Element Selection

When a user selects an element in the LucidChart document:

1. Selection event is captured by the extension host via the Viewport.hookSelection callback
2. SelectionHandler.handleLucidSelectionEvent processes the selection
3. Determines element type (Activity, Resource, etc.) and builds context
4. Sends a SELECTION_CHANGED message to the React application
5. React displays the appropriate editor component based on the element type

```
[EXT][SelectionHandler] Handling selection change { itemCount: 1, items: ['516WmQPd4fw'] }
[REACT][SelectionReducer] Received action: SELECTION_UPDATE { selectedElements: [...], documentContext: {...} }
```

### 2. Editor Rendering

The React application processes the element data:

1. Element metadata is extracted from the SELECTION_CHANGED message
2. useModelPanel hook prepares the data for the editor
3. ModelPanel component renders ElementEditor with the appropriate data
4. ElementEditor determines which specific editor to render (ActivityEditor, ResourceEditor, etc.)

For a Resource:
```
[ElementEditor] Element data: {"id":"516WmQPd4fw","x":386,"y":286,"name":"LATR","capacity":"5"}
[ElementEditor] Rendering ResourceEditor: {elementId: "516WmQPd4fw", resourceDetectionSource: "elementType prop"}
```

For an Activity:
```
[ElementEditor] Element data: {"id":"qyodDym0W8","x":1108,"y":146,"name":"Low Activity",...}
[ElementEditor] Rendering ActivityEditor for type: Activity: {elementId: "qyodDym0W8"}
```

### 3. User Modifications

The user makes changes to the element properties (e.g., changing a Resource's capacity from 3 to 5).

### 4. Save Button Click

When the user clicks the "Save" button:

1. The editor's onSave callback is triggered
2. The callback propagates up through the component hierarchy:
   - BaseEditor → ElementEditor → ModelPanel → useModelPanel
3. useModelPanel calls modelOpsSender.updateElementData()
4. This creates an ELEMENT_UPDATE message with the updated element data
5. The message is sent to the extension host

```
[REACT] modelOpsSender.updateElementData called with: { 
  elementId: "516WmQPd4fw", 
  type: "Resource", 
  data: { id: "516WmQPd4fw", name: "LATR", capacity: "5" } 
}
[EXT][RightDockPanel] Received message from iframe: ELEMENT_UPDATE
[EXT][MessageRouter] Forwarding message to MessageHandlers
```

### 5. Element Update Handling in Extension

The extension processes the save request:

1. The ELEMENT_UPDATE message is received by MessageRouter
2. MessageRouter forwards the message to MessageHandlers
3. MessageHandlers identifies ElementOpsHandler as the appropriate handler
4. ElementOpsHandler.handleMessage starts the async handleElementUpdate process
5. handleElementUpdate:
   - Gets client and ModelManager instances using the singleton pattern
   - Gets the current page from the viewport
   - Finds the element by ID
   - Converts the string type to SimulationObjectType
   - Uses ModelManager.saveElementData to persist changes to LucidChart's shape data
   - Validates the model after the update
   - Refreshes the selection to update the UI
   - Sends an ELEMENT_UPDATE_RESULT message back to React

```
[EXT][ElementOpsHandler] Element update requested { elementId: "516WmQPd4fw", type: "Resource" }
[EXT][ModelManager] saveElementData - Input Parameters: { 
  elementId: "516WmQPd4fw", 
  elementType: "BlockProxy", 
  simulationObjectType: "Resource" 
}
[EXT][ElementOpsHandler] Sending ELEMENT_UPDATE_RESULT { success: true, elementId: "516WmQPd4fw" }
```

### 6. Update Confirmation

The React application receives and processes the confirmation:

1. The ELEMENT_UPDATE_RESULT message is received
2. The elementOps.mapper processes the message
3. If successful, the UI may be updated or a success notification may be shown
4. If there was an error, error handling is triggered

```
[REACT][MessageListenerEffect] Received message: ELEMENT_UPDATE_RESULT
[REACT] Element update result: { success: true, elementId: "516WmQPd4fw" }
```

## Key Components in the Save Flow

### React Application Components

1. **ElementEditor**: Determines which specific editor to render based on element type
2. **Specific Editors** (ActivityEditor, ResourceEditor, etc.): Provide UI for editing element properties
3. **ModelPanel**: Contains the ElementEditor and manages the editor state
4. **useModelPanel Hook**: Connects the UI to the messaging system
5. **modelOpsSender**: Creates and sends the ELEMENT_UPDATE message

### Extension Components

1. **MessageRouter**: Routes messages between React and the extension
2. **MessageHandlers**: Dispatches messages to the appropriate handler
3. **ElementOpsHandler**: Handles element-level operation messages
4. **ModelManager**: Handles persistence of element data to LucidChart
5. **Viewport**: Provides access to the LucidChart document and selection

## Message Types

The save flow primarily uses these message types:

1. **SELECTION_CHANGED**: Sent when an element is selected, contains element data
2. **ELEMENT_UPDATE**: Sent when saving changes, contains updated element data
3. **ELEMENT_UPDATE_RESULT**: Sent after processing save, contains success/error information

## Data Flow Diagram

```
┌─────────────────┐     Selection     ┌────────────────┐
│                 │◄─────Event─────────┤                │
│  LucidChart     │                   │   Extension    │
│  Document       │                   │   Host         │
│                 │     Update        │                │
│                 │◄────Element────────┤                │
└─────────────────┘                   └────────┬───────┘
                                              │
                   SELECTION_CHANGED          │
                           ▼                  │
                  ┌──────────────────┐        │
                  │                  │        │
                  │  React           │        │
                  │  Application     │        │
                  │                  │        │
                  └───────┬──────────┘        │
                          │                   │
                          │ ELEMENT_UPDATE    │
                          └───────────────────►
                                              │
                   ELEMENT_UPDATE_RESULT      │
                           ▲                  │
                           └──────────────────┘
```

## Element Type Conversion

The extension also supports converting elements from one type to another (e.g., Activity to Generator) using a similar flow but with the ELEMENT_CONVERT message type. The implementation follows the same pattern:

1. React sends an ELEMENT_CONVERT message with elementId and newType
2. ElementOpsHandler processes the conversion using ModelManager
3. Extension sends an ELEMENT_CONVERT_RESULT message back to React

## Error Handling

The save flow includes error handling at several levels:

1. **React Application**: Processes error responses and may display notifications
2. **ElementOpsHandler**: Catches exceptions during processing and sends error information in ELEMENT_UPDATE_RESULT
3. **ModelManager**: Validates the model after updates and logs detailed error information

## Next Steps and Improvements

Potential areas for future enhancement:

1. Add more detailed error information in result messages
2. Implement progress indicators for long-running operations
3. Add batch operations for updating multiple elements
4. Enhance type safety and validation in the messaging system
