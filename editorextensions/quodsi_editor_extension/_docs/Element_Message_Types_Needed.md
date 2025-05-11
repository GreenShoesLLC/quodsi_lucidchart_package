# Element-Level Message Types Needed

This document outlines the missing message types for element-level operations in the new messaging system that are needed to restore the save functionality for element editors.

## Current Issue

The new messaging system properly handles page-level operations (converting a page to a model, removing model data from a page) but lacks message types for element-level operations. Specifically, we're missing equivalents for:

1. `ActionType.UPDATE_ELEMENT_DATA` - Used to update properties of an element (Activity, Resource, etc.)
2. `ActionType.CONVERT_ELEMENT` - Used to change the type of an element (convert Activity to Generator, etc.)

This gap explains why users can see and edit element properties in the UI, but changes don't persist when the "Save" button is clicked.

## Required Additions

### 1. Add New Message Types in EnvelopeMessageType

The following message types should be added to the `EnvelopeMessageType` enum in `shared/src/quodsi-messaging/envelope/message-types.ts`:

```typescript
export enum EnvelopeMessageType {
  // Existing message types...
  
  // Element Operations (Add these)
  ELEMENT_UPDATE = "ELEMENT_UPDATE",            // For updating element properties
  ELEMENT_UPDATE_RESULT = "ELEMENT_UPDATE_RESULT", // Response to update request
  ELEMENT_CONVERT = "ELEMENT_CONVERT",          // For converting element type
  ELEMENT_CONVERT_RESULT = "ELEMENT_CONVERT_RESULT" // Response to conversion request
}
```

### 2. Define Message Payload Interfaces

Create corresponding payload interfaces in the shared library:

```typescript
// Element Update
export interface ElementUpdatePayload {
  elementId: string;
  type: string;  // SimulationObjectType as string
  data: JsonObject;
}

export interface ElementUpdateResultPayload {
  success: boolean;
  elementId: string;
  errorMessage?: string;
}

// Element Conversion
export interface ElementConvertPayload {
  elementId: string;
  newType: string;  // SimulationObjectType to convert to
}

export interface ElementConvertResultPayload {
  success: boolean;
  elementId: string;
  errorMessage?: string;
}
```

### 3. Update Message Handlers in Extension

Implement handlers for these new message types in the extension's message router system:

1. Create an `ElementOpsHandler` in the extension that:
   - Processes `ELEMENT_UPDATE` messages
   - Processes `ELEMENT_CONVERT` messages
   - Reuses logic from the deprecated `ModelPanel.handleUpdateElementData` and `ModelPanel.handleConvertElement` methods

2. Update the message router to route these new message types to the appropriate handler.

### 4. Update React Application

Update the React application to send the correct message types when users interact with element editors:

1. Modify the save flow in editors to send `ELEMENT_UPDATE` messages instead of `MODEL_CONVERT`
2. Update the element type conversion to send `ELEMENT_CONVERT` messages when needed
3. Add handlers for the result messages (`ELEMENT_UPDATE_RESULT`, `ELEMENT_CONVERT_RESULT`)

## Implementation Strategy

1. **First Phase**: Add the message types and interfaces to the shared library
2. **Second Phase**: Implement handlers in the extension
3. **Third Phase**: Update the React application to use the new message types
4. **Testing Phase**: Verify that element editors can save changes

## Example Implementation Flow

### 1. When User Clicks Save in an Editor

```typescript
// React side - When user clicks save in ActivityEditor
const handleSave = (updatedActivity: Activity) => {
  // Send ELEMENT_UPDATE message
  sendMessage(EnvelopeMessageType.ELEMENT_UPDATE, {
    elementId: updatedActivity.id,
    type: SimulationObjectType.Activity,
    data: {
      ...updatedActivity,
      id: updatedActivity.id,
    }
  });
};
```

### 2. Extension Processing

```typescript
// Extension side - ElementOpsHandler
public handleElementUpdate(msg: EnvelopeBase): void {
  const payload = msg.data as ElementUpdatePayload;
  
  try {
    // Get the element
    const viewport = new Viewport(this.client);
    const element = this.findElementById(viewport, payload.elementId);
    
    if (!element) {
      this.sendResponse(EnvelopeMessageType.ELEMENT_UPDATE_RESULT, {
        success: false,
        elementId: payload.elementId,
        errorMessage: `Element not found: ${payload.elementId}`
      });
      return;
    }
    
    // Convert string type to SimulationObjectType
    const elementType = this.getElementType(payload.type);
    
    // Use ModelManager to save element data
    await this.modelManager.saveElementData(
      element,
      payload.data,
      elementType,
      viewport.getCurrentPage()
    );
    
    // Send success response
    this.sendResponse(EnvelopeMessageType.ELEMENT_UPDATE_RESULT, {
      success: true,
      elementId: payload.elementId
    });
    
    // Update validation state
    await this.modelManager.validateModel();
    
  } catch (error) {
    // Handle errors
    this.sendResponse(EnvelopeMessageType.ELEMENT_UPDATE_RESULT, {
      success: false,
      elementId: payload.elementId,
      errorMessage: `Error updating element: ${error.message}`
    });
  }
}
```

By implementing these missing message types and handlers, the save functionality for element editors will be restored in the new architecture.
