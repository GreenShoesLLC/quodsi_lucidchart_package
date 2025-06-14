# Element Update Exchange

## Overview
Element update messages handle user modifications to simulation objects (Activities, Resources, etc.) in the React UI, synchronizing changes back to LucidChart elements.

## Message Flow

### ELEMENT_UPDATE: React → Extension

**Direction:** React → Extension  
**Purpose:** Request update of LucidChart element with modified properties  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  elementId: string,
  type: string,        // "Activity", "Resource", etc.
  data: object        // Updated element properties
}
```

**Sender:** 
- File: `quodsim-react/src/messaging/senders/modelOpsSender.ts`
- Function: `modelOpsSender.updateElementData`

**Handler:**
- File: `src/core/messaging/handlers/elementOpsHandler.ts`
- Function: `ElementOpsHandler.handleElementUpdate`

**Response:** `ELEMENT_UPDATE_RESULT`

---

### ELEMENT_UPDATE_RESULT: Extension → React

**Direction:** Extension → React  
**Purpose:** Provide feedback about element update operation result  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  success: boolean,
  elementId: string,
  errorMessage?: string
}
```

**Sender:** 
- File: `src/core/messaging/handlers/elementOpsHandler.ts`
- Function: `ElementOpsHandler.handleElementUpdate`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/elementOps.mapper.ts`
- Function: `elementOps.mapper.mapMessageToAction`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| ELEMENT_UPDATE | ✅ modelOpsSender.updateElementData | ✅ ElementOpsHandler.handleElementUpdate | ➖ N/A | ➖ N/A |
| ELEMENT_UPDATE_RESULT | ➖ N/A | ➖ N/A | ✅ ElementOpsHandler.handleElementUpdate | ✅ elementOps.mapper.mapMessageToAction |

## Typical Sequence

1. User selects element in LucidChart
2. Extension sends **SELECTION_CHANGED** to React
3. React displays appropriate editor for element type
4. User modifies element properties (name, duration, etc.)
5. User clicks "Save" button
6. **ELEMENT_UPDATE** sent to extension
7. Extension updates element data in LucidChart
8. Extension validates updated model
9. **ELEMENT_UPDATE_RESULT** sent to React
10. React shows success/error message
11. React may refresh element display

## Implementation Details

### Extension Handler
```typescript
async handleElementUpdate(msg: EnvelopeBase): Promise<void> {
    try {
        const data = msg.data as ElementUpdatePayload;
        
        // Get the LucidChart element
        const element = await this.client.getElementProxy(data.elementId);
        if (!element) {
            throw new Error(`Element ${data.elementId} not found`);
        }
        
        // Update element data
        await element.setData(data.data);
        
        // Validate model after update
        const validationResult = await this.modelManager.validateModel();
        
        // Send success response
        this.router.sendToChannel(msg.source, EnvelopeMessageType.ELEMENT_UPDATE_RESULT, {
            success: true,
            elementId: data.elementId
        });
        
    } catch (error) {
        // Send error response
        this.router.sendToChannel(msg.source, EnvelopeMessageType.ELEMENT_UPDATE_RESULT, {
            success: false,
            elementId: data.elementId,
            errorMessage: error.message
        });
    }
}
```

### React Sender Usage
```typescript
const updateElement = async (elementData: any) => {
    try {
        await modelOpsSender.updateElementData({
            elementId: selectedElement.id,
            type: selectedElement.type,
            data: elementData
        });
        
        // Result handled by elementOps.mapper
        
    } catch (error) {
        console.error('Failed to send element update:', error);
    }
};
```

## Error Handling

### Extension Side
- Catches LucidChart API errors
- Validates element exists before update
- Returns structured error in `ELEMENT_UPDATE_RESULT`
- Logs errors for debugging

### React Side
- Displays error messages to user
- Provides error details when available
- Maintains UI state consistency
- Allows retry attempts

## Validation Integration

The element update process triggers model validation:
1. Element data updated in LucidChart
2. ModelManager validates entire model
3. Validation results available for display
4. Invalid models prevent simulation execution

## Common Update Types

1. **Basic Properties**: Name, description, color
2. **Timing Properties**: Duration, distribution parameters
3. **Resource Requirements**: Required resources, quantities
4. **Operation Steps**: Activity workflow steps
5. **Connection Properties**: Input/output connections

## Performance Considerations

- Updates are atomic operations
- Large models may have validation overhead
- Debouncing prevents excessive update messages
- Batch updates for multiple property changes

## Related Messages
- **SELECTION_CHANGED** - Triggers element editing UI
- **MODEL_VALIDATION_RESULT** - May follow element updates
- **ELEMENT_CONVERT** - Alternative operation for type changes