# Selection Changed Exchange

## Overview
Selection messages inform the React UI when users select elements in the LucidChart canvas, enabling context-sensitive editing interfaces.

## Message Flow

### SELECTION_CHANGED: Extension → React

**Direction:** Extension → React  
**Purpose:** Notify React app of element selection in LucidChart  
**Auth Required:** No  

**Payload:**
```typescript
{
  selectionType: string,              // "Activity", "Resource", "None", etc.
  selectionState: {
    pageId: string,
    selectedIds: string[]
  },
  modelItemData?: object,             // Element's simulation data
  documentContext: object             // Document metadata
}
```

**Sender:** 
- File: `src/core/messaging/handlers/selection/SelectionHandler.ts`
- Function: `SelectionHandler.sendSelectionChangedMessage`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/selection.mapper.ts`
- Function: `selection.mapper.mapMessageToAction`

**Response:** None (informational update)

---

### MODEL_CONTEXT: Extension → React

**Direction:** Extension → React  
**Purpose:** Provide document and page context information  
**Auth Required:** No  

**Payload:**
```typescript
{
  documentId: string,
  pageId: string,
  title: string,
  isQuodsiModel: boolean,
  metadata?: object
}
```

**Sender:** 
- File: `src/core/messaging/handlers/selection/state/DocumentContext.ts`
- Function: `DocumentContext.sendContextUpdate`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/selection.mapper.ts`
- Function: `selection.mapper.mapMessageToAction`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| SELECTION_CHANGED | ➖ N/A | ➖ N/A | ✅ SelectionHandler.sendSelectionChangedMessage | ✅ selection.mapper.mapSelection |
| MODEL_CONTEXT | ➖ N/A | ➖ N/A | ✅ DocumentContext.sendContextUpdate | ✅ selection.mapper.mapSelection |

## Selection Flow Sequence

1. User clicks on element in LucidChart canvas
2. Viewport selection hook triggered in extension
3. `SelectionHandler.handleLucidSelectionEvent` called
4. Handler analyzes selected items:
   - Determines element type (Activity, Resource, etc.)
   - Extracts simulation data from element
   - Builds selection context
5. **SELECTION_CHANGED** sent to React panels
6. React updates UI:
   - Shows appropriate editor for element type
   - Populates form fields with element data
   - Enables relevant actions

## Selection Types

### Single Element Selection
- **Activity**: Shows duration, resource requirements, operation steps
- **Resource**: Shows capacity, schedules, availability
- **Entity**: Shows attributes, routing logic
- **Generator**: Shows arrival patterns, quantities
- **Connector**: Shows flow properties, constraints

### Multiple Selection
- **Same Type**: Shows bulk edit interface
- **Mixed Types**: Shows general properties only
- **Empty Selection**: Shows model overview

### No Selection
- **selectionType**: "None"
- **modelItemData**: undefined
- **UI**: Shows model summary or instructions

## Implementation Details

### Selection Handler
```typescript
static handleLucidSelectionEvent(client: EditorClient, selectedItems: ItemProxy[]): void {
    try {
        // Determine selection type and extract data
        const selectionData = this.analyzeSelection(selectedItems);
        
        // Build message payload
        const payload = {
            selectionType: selectionData.type,
            selectionState: {
                pageId: client.getCurrentPage().id,
                selectedIds: selectedItems.map(item => item.id)
            },
            modelItemData: selectionData.modelData,
            documentContext: this.buildDocumentContext(client)
        };
        
        // Send to all panels
        this.router.broadcastToAllChannels(
            EnvelopeMessageType.SELECTION_CHANGED, 
            payload
        );
        
    } catch (error) {
        console.error('[SelectionHandler] Error processing selection:', error);
    }
}
```

### React Selection Handling
```typescript
// In selection.mapper.ts
const handleSelectionChanged = (payload: SelectionChangedPayload) => {
    return {
        type: 'SELECTION_UPDATE',
        payload: {
            selectedType: payload.selectionType,
            selectedIds: payload.selectionState.selectedIds,
            elementData: payload.modelItemData,
            context: payload.documentContext
        }
    };
};
```

## Data Extraction

The SelectionHandler extracts simulation-specific data from LucidChart elements:

### Element Data Structure
```typescript
interface ModelItemData {
    id: string;
    type: string;           // Simulation object type
    name: string;
    properties: {
        // Type-specific properties
        duration?: Duration;
        resources?: ResourceRequirement[];
        capacity?: number;
        // ... other properties
    };
    validation?: {
        isValid: boolean;
        messages: ValidationMessage[];
    };
}
```

## Error Handling

### Missing Element Data
- If `modelItemData` is missing, React shows empty selection state
- Handles gracefully by showing element as "not converted"
- Provides option to convert element to simulation object

### Type Inconsistencies
- Derives type from multiple sources (shape, data, metadata)
- Falls back to generic element editor if type unclear
- Logs inconsistencies for debugging

### Selection State Sync
- Ensures React selection state matches LucidChart
- Handles rapid selection changes
- Debounces selection events to prevent UI thrashing

## Integration with Editors

Selection drives the editor interface:

1. **Element Editors**: Activity, Resource, Entity, Generator editors
2. **Property Panels**: Show type-specific properties
3. **Validation Display**: Show element-specific validation messages
4. **Action Buttons**: Enable save, convert, delete operations

## Performance Considerations

- **Debouncing**: Prevents excessive messages during drag operations
- **Data Caching**: Reuses element data when possible
- **Selective Updates**: Only sends changed selection data
- **Lazy Loading**: Fetches additional data only when needed

## Related Messages
- **ELEMENT_UPDATE** - Triggered after editing selected element
- **ELEMENT_CONVERT** - Convert selected element type
- **MODEL_VALIDATE** - Validate model including selected elements