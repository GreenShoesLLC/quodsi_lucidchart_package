# Element Convert Exchange

## Overview
Element convert messages handle the transformation of simulation elements from one type to another (e.g., converting an Activity to a Generator), preserving applicable properties while updating the element's behavior.

## Message Flow

### ELEMENT_CONVERT: React → Extension

**Direction:** React → Extension  
**Purpose:** Request conversion of element to different type  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  elementId: string,
  newType: string,          // Target type: "Activity", "Generator", etc.
  data?: object            // Optional data overrides for conversion
}
```

**Sender:** 
- File: `quodsim-react/src/messaging/senders/modelOpsSender.ts`
- Function: `modelOpsSender.convertElement`

**Handler:**
- File: `src/core/messaging/handlers/elementOpsHandler.ts`
- Function: `ElementOpsHandler.handleElementConvert`

**Response:** `ELEMENT_CONVERT_RESULT`

---

### ELEMENT_CONVERT_RESULT: Extension → React

**Direction:** Extension → React  
**Purpose:** Report result of element conversion operation  
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
- Function: `ElementOpsHandler.handleElementConvert`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/elementOps.mapper.ts`
- Function: `elementOps.mapper.mapMessageToAction`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| ELEMENT_CONVERT | ✅ modelOpsSender.convertElement | ✅ ElementOpsHandler.handleElementConvert | ➖ N/A | ➖ N/A |
| ELEMENT_CONVERT_RESULT | ➖ N/A | ➖ N/A | ✅ ElementOpsHandler.handleElementConvert | ✅ elementOps.mapper.mapMessageToAction |

## Conversion Sequence

1. User selects element in LucidChart
2. React shows current element type and conversion options
3. User selects "Convert to [Type]" from dropdown
4. **ELEMENT_CONVERT** sent to extension
5. Extension performs conversion:
   - Preserves compatible properties
   - Updates shape/visual representation
   - Resets type-specific properties
   - Validates converted element
6. **ELEMENT_CONVERT_RESULT** sent to React
7. React updates UI to show new element type
8. Selection refreshed with converted element

## Conversion Rules

### Property Preservation
Properties that transfer between types:
- **Common**: id, name, description, position
- **Timing**: duration (if applicable to target type)
- **Resources**: resource requirements (Activities ↔ Resources)

### Property Reset
Properties that are type-specific:
- **Activity**: operation steps, resource requests
- **Generator**: arrival pattern, entity type
- **Resource**: capacity, schedules
- **Entity**: attributes, routing

### Visual Updates
- Shape changes to match new type
- Color scheme updates
- Icon/symbol changes
- Connection points may adjust

## Implementation Details

### Conversion Handler
```typescript
async handleElementConvert(msg: EnvelopeBase): Promise<void> {
    try {
        const { elementId, newType, data } = msg.data;
        
        // Get current element
        const element = await this.client.getElementProxy(elementId);
        if (!element) {
            throw new Error(`Element ${elementId} not found`);
        }
        
        // Get current data
        const currentData = element.getData();
        
        // Perform conversion
        const convertedData = this.convertElementData(
            currentData, 
            currentData.type, 
            newType,
            data
        );
        
        // Update element
        await element.setData(convertedData);
        
        // Update visual representation
        await this.updateElementShape(element, newType);
        
        // Validate converted element
        const validation = await this.modelManager.validateElement(elementId);
        
        // Send success response
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.ELEMENT_CONVERT_RESULT,
            {
                success: true,
                elementId: elementId
            }
        );
        
    } catch (error) {
        // Send error response
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.ELEMENT_CONVERT_RESULT,
            {
                success: false,
                elementId: msg.data.elementId,
                errorMessage: error.message
            }
        );
    }
}
```

### Data Conversion Logic
```typescript
private convertElementData(
    currentData: any,
    fromType: string,
    toType: string,
    overrides?: any
): any {
    // Start with base properties
    const converted = {
        id: currentData.id,
        type: toType,
        name: currentData.name || `New ${toType}`,
        description: currentData.description || ''
    };
    
    // Transfer compatible properties
    if (this.isTimingCompatible(fromType, toType)) {
        converted.duration = currentData.duration;
    }
    
    // Add type-specific defaults
    const defaults = this.getTypeDefaults(toType);
    Object.assign(converted, defaults);
    
    // Apply any overrides
    if (overrides) {
        Object.assign(converted, overrides);
    }
    
    return converted;
}
```

## Conversion Examples

### Activity → Generator
```typescript
// Before (Activity)
{
  type: "Activity",
  name: "Process Order",
  duration: { type: "constant", value: 10 },
  resources: [{ type: "Worker", quantity: 1 }]
}

// After (Generator)
{
  type: "Generator",
  name: "Process Order",  // Preserved
  arrivalPattern: { type: "exponential", rate: 6 },  // New
  entityType: "Order",  // New
  // duration removed (not applicable)
  // resources removed (not applicable)
}
```

### Resource → Activity
```typescript
// Before (Resource)
{
  type: "Resource",
  name: "Assembly Station",
  capacity: 3,
  schedule: "24/7"
}

// After (Activity)
{
  type: "Activity",
  name: "Assembly Station",  // Preserved
  duration: { type: "constant", value: 1 },  // Default
  resources: [],  // Empty default
  // capacity removed
  // schedule removed
}
```

## Error Conditions

### Conversion Failures
- Element not found
- Invalid target type
- Incompatible conversion (enforced by UI)
- Validation failures after conversion

### Recovery Options
- Revert to original type
- Retry with different parameters
- Manual property adjustment

## UI Integration

### Conversion UI
```typescript
const ConversionDropdown = ({ element, onConvert }) => {
    const validTargets = getValidConversionTargets(element.type);
    
    return (
        <Select 
            value={element.type}
            onChange={(newType) => onConvert(element.id, newType)}
        >
            {validTargets.map(type => (
                <Option key={type} value={type}>
                    Convert to {type}
                </Option>
            ))}
        </Select>
    );
};
```

### Post-Conversion Updates
```typescript
// After successful conversion
handleConvertResult(result) {
    if (result.success) {
        // Refresh selection to show new type
        this.refreshSelection();
        
        // Show success message
        showNotification('Element converted successfully');
    } else {
        // Show error
        showError(`Conversion failed: ${result.errorMessage}`);
    }
}
```

## Best Practices

1. **Validate Before Convert**: Check if conversion is allowed
2. **Preserve User Data**: Keep as much information as possible
3. **Clear Communication**: Show what will be lost/gained
4. **Undo Support**: Consider implementing conversion history
5. **Batch Operations**: Support converting multiple elements

## Related Messages
- **SELECTION_CHANGED** - Updates after conversion
- **ELEMENT_UPDATE** - Alternative for property changes
- **MODEL_VALIDATE** - Validates after conversion
- **MODEL_CONVERT** - Page-level conversion operation