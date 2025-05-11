# Deprecated Element Editor Save Flow

This document outlines how the save functionality worked in the previous (deprecated) implementation of the Quodsi LucidChart extension's Element Editor. Understanding this flow is valuable for implementing the correct save functionality in the new architecture.

## Overview

In the deprecated implementation, when a user modified properties in an editor (Activity, Resource, etc.) and clicked the "Save" button, a series of function calls and messages were exchanged between the React application and the extension host to persist those changes back to the LucidChart document.

## Component Hierarchy and Responsibility Chain

The save flow followed this hierarchy of components and responsibility:

1. **Element-Specific Editors** (ActivityEditor.tsx, ResourceEditor.tsx, etc.)
   - Contained UI components for editing specific element types
   - Passed `onSave` callback to BaseEditor

2. **BaseEditor Component**
   - Provided common UI (Save/Cancel buttons)
   - Called the provided `onSave` callback with updated data

3. **ElementEditor Component**
   - Acted as a dispatcher for different editor types
   - Passed the `onSave` from ModelPanelAccordion to specific editors

4. **ModelPanelAccordion Component**
   - Received element updates via `onElementUpdate` prop
   - Passed element ID and updated data to QuodsiApp_v2

5. **QuodsiApp_v2 Component**
   - Delegated to actionHandlers.handleElementUpdate

6. **ActionHandlers**
   - Prepared and sent the update message to the extension host
   - Used sendActionRequest to send UPDATE_ELEMENT_DATA action

7. **Extension ModelPanel**
   - Received and processed the element update message
   - Called handleUpdateElementData to persist changes to LucidChart

## Detailed Message Flow

### 1. User Interaction in React

When a user clicked the "Save" button in an editor:

```typescript
// Inside BaseEditor.tsx
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  onSave(localData);
};

return (
  <form onSubmit={handleSubmit}>
    {/* Editor UI */}
    <div className="flex justify-end space-x-2 mt-4">
      <button
        type="submit"
        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        Save
      </button>
      {/* Cancel button */}
    </div>
  </form>
);
```

### 2. Propagation Through Components

The save event propagated through components:

```typescript
// ElementEditor.tsx - routing to specific editor
<ActivityEditor
  activity={elementData}
  onSave={onSave}  // This is passed from ModelPanelAccordion
  onCancel={onCancel}
  referenceData={referenceData}
/>

// ModelPanelAccordion.tsx - receiving the save
<ElementEditor
  elementData={currentElement.data}
  elementType={currentElement.metadata.type}
  onSave={(data) => onElementUpdate(currentElement.id, data)}
  onCancel={handleEditorCancel}
  referenceData={referenceData}
  isExpanded={expandedSections.elementEditor}
  onToggle={() => toggleSection("elementEditor")}
/>

// QuodsiApp_v2.tsx - passing to action handlers
<ModelPanelAccordion
  onElementUpdate={actionHandlers.current.handleElementUpdate}
  // Other props...
/>
```

### 3. Action Handler Processing

The action handler prepared and sent the update message:

```typescript
// actionHandlers.ts
public handleElementUpdate = (elementId: string, data: any) => {
  // Get current state
  const state = this.getState();
  
  // Set processing state
  this.setState((prev) => ({ ...prev, isProcessing: true }));

  try {
    // Regular update scenario
    sendActionRequest(this.deps, ActionType.UPDATE_ELEMENT_DATA, {
      elementId,
      type: state.currentElement?.metadata?.type || SimulationObjectType.None,
      data: {
        ...data,
        id: elementId,
      },
    });
  } catch (error) {
    // Error handling
  }
};

// actionRequestHandlers.ts (used by sendActionRequest)
export const sendActionRequest = (
  deps: MessageDependencies,
  actionType: ActionType,
  data?: any
) => {
  deps.sendMessage(MessageTypes.ACTION_REQUEST, {
    actionType,
    data
  });
};
```

### 4. Extension Host Processing

On the extension side, the ModelPanel class handled the UPDATE_ELEMENT_DATA action:

```typescript
// ModelPanel.ts - in setupModelMessageHandlers method
case ActionType.UPDATE_ELEMENT_DATA:
  if (payload.data &&
      typeof payload.data.type === 'string' &&
      payload.data.data) {
      // Properly construct object with validated properties
      this.handleUpdateElementData({
          elementId: payload.data.elementId,
          type: payload.data.type,
          data: payload.data.data
      });
  } else {
      this.logError('Missing required data (type or data) in UPDATE_ELEMENT_DATA action');
      this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
          actionType: ActionType.UPDATE_ELEMENT_DATA,
          success: false,
          data: {
              errorMessage: 'Missing required data (type or data) in UPDATE_ELEMENT_DATA action'
          }
      });
  }
  break;
```

### 5. Persisting Changes to LucidChart

The `handleUpdateElementData` method in ModelPanel saved changes to the LucidChart document:

```typescript
// ModelPanel.ts - handleUpdateElementData method
private async handleUpdateElementData(
  updateData: {
    elementId?: string;
    type: string;
    data: JsonObject;
  }
): Promise<void> {
  try {
    const viewport = new Viewport(this.client);
    const currentPage = viewport.getCurrentPage();
    
    // Get the element from viewport
    const selectedItems = viewport.getSelectedItems();
    const element = selectedItems.find(item => item.id === updateData.elementId);
    
    // Convert string type to SimulationObjectType
    const enumMapper = new EnumMapper(SimulationObjectType);
    let elementType: SimulationObjectType = enumMapper.toEnum(updateData.type);
    
    // Use LucidElementFactory to get platform-specific data
    const storageAdapter = this.modelManager.getStorageAdapter();
    const elementFactory = new LucidElementFactory(storageAdapter);
    
    // Create a platform object with platform-specific data
    const platformObject = elementFactory.createPlatformObject(
      element,
      elementType,
      false  // Not a conversion, just updating
    );
    
    // Save element data using ModelManager with merged data
    await this.modelManager.saveElementData(
      element,
      {
        ...updateData.data,
        x: platformObject.getSimulationObject().x,
        y: platformObject.getSimulationObject().y
      },
      elementType,
      currentPage
    );
    
    // Send success message
    this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
      actionType: ActionType.UPDATE_ELEMENT_DATA,
      success: true,
      data: {
        elementId: updateData.elementId
      }
    });
    
    // Update validation and selection state
    await this.modelManager.validateModel();
    await this.handleSelectionChange(selectedItems);
  } catch (error) {
    // Error handling
  }
}
```

### 6. ModelManager.saveElementData Implementation

The actual persistence to LucidChart's shape data was handled by the ModelManager.saveElementData method:

```typescript
// Core implementation in ModelManager.ts
public async saveElementData<T extends SimulationObject>(
  element: ElementProxy,
  data: JsonObject,
  type: SimulationObjectType,
  page: PageProxy
): Promise<void> {
  // Create element metadata for storage
  const metadata: MetaData = {
    type,
    version: this.versionManager.getLatestVersionForType(type).toString()
  };
  
  // Create combined data with metadata
  const elementData = {
    _quodsi_metadata: metadata,
    ...data
  };
  
  // Store data in LucidChart's shape data
  this.storageAdapter.setElementData(element, elementData);
  
  // Update the model structure
  await this.updateModelStructure(page);
}
```

## Key Differences from Current Implementation

The key differences between the deprecated and current implementation:

1. **Message Type**:
   - Deprecated: Used `MessageTypes.ACTION_REQUEST` with `ActionType.UPDATE_ELEMENT_DATA`
   - Current: Uses `MessageTypes.MODEL_CONVERT`

2. **Handler Location**:
   - Deprecated: `ModelPanel.handleUpdateElementData`
   - Current: Should be in `ModelOpsHandler`

3. **Integration Point**:
   - Deprecated: Direct call to `modelManager.saveElementData`
   - Current: Missing implementation of `setElement` function

## Next Steps for New Implementation

To implement the correct save functionality in the new architecture:

1. Create a proper `setElement` function in `ModelOpsHandler` that:
   - Accepts element ID, type, and data
   - Uses the ModelManager to save element data to LucidChart's shape data

2. Update the React messaging to properly send `MODEL_CONVERT` messages from editors

3. Ensure the message router correctly forwards these messages to the appropriate handler

By following the pattern established in the deprecated implementation but adapting it to the new architecture, the save functionality can be correctly restored.
