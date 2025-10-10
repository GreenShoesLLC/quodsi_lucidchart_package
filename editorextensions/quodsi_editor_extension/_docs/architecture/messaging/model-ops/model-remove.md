# Model Remove Exchange

## Overview
Model remove messages handle the removal of Quodsi simulation model data from a LucidChart page, reverting it to a regular diagram while preserving the visual elements.

## Message Flow

### MODEL_REMOVE: React → Extension

**Direction:** React → Extension  
**Purpose:** Remove simulation model data from current page  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  documentId: string
}
```

**Sender:** 
- File: `quodsim-react/src/messaging/senders/modelOpsSender.ts`
- Function: `modelOpsSender.removeModel`

**Handler:**
- File: `src/core/messaging/handlers/modelOpsHandler.ts`
- Function: `ModelOpsHandler.handleModelRemove`

**Response:** `MODEL_REMOVE_RESULT`

---

### MODEL_REMOVE_RESULT: Extension → React

**Direction:** Extension → React  
**Purpose:** Confirm model removal operation result  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  success: boolean,
  documentId: string,
  errorMessage?: string
}
```

**Sender:** 
- File: `src/core/messaging/handlers/modelOpsHandler.ts`
- Function: `ModelOpsHandler.handleModelRemove`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/modelOps.mapper.ts`
- Function: `mapModelOps`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| MODEL_REMOVE | ✅ modelOpsSender.removeModel | ✅ ModelOpsHandler.handleModelRemove | ➖ N/A | ➖ N/A |
| MODEL_REMOVE_RESULT | ➖ N/A | ➖ N/A | ✅ ModelOpsHandler.handleModelRemove | ✅ mapModelOps |

## Removal Sequence

1. User clicks "Remove Model" button
2. Confirmation dialog shown
3. **MODEL_REMOVE** sent to extension
4. Extension performs removal:
   - Clears ModelManager state
   - Removes model data from storage
   - Preserves visual elements
   - Clears simulation-specific properties
5. **MODEL_REMOVE_RESULT** sent to React
6. React updates UI to non-model state
7. Panels show "No model" message

## Implementation Details

### Removal Handler
```typescript
async handleModelRemove(msg: EnvelopeBase): Promise<void> {
    try {
        const { documentId } = msg.data;
        
        // Verify model exists
        const currentModel = this.modelManager.getModel();
        if (!currentModel) {
            throw new Error('No model to remove');
        }
        
        // Clear model from manager
        this.modelManager.clearModel();
        
        // Remove from storage
        await this.storageAdapter.deleteModel(documentId);
        
        // Clean simulation data from elements
        await this.cleanSimulationData(documentId);
        
        // Update document metadata
        await this.updateDocumentMetadata(documentId, {
            isQuodsiModel: false,
            modelVersion: null
        });
        
        // Send success response
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.MODEL_REMOVE_RESULT,
            {
                success: true,
                documentId: documentId
            }
        );
        
        // Broadcast model context update
        this.broadcastModelContextUpdate(documentId, false);
        
    } catch (error) {
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.MODEL_REMOVE_RESULT,
            {
                success: false,
                documentId: msg.data.documentId,
                errorMessage: error.message
            }
        );
    }
}
```

### Data Cleanup
```typescript
private async cleanSimulationData(documentId: string): Promise<void> {
    const page = await this.client.getCurrentPage();
    const elements = await page.getAllElements();
    
    for (const element of elements) {
        const data = element.getData();
        
        if (data && data.quodsiData) {
            // Remove simulation-specific data
            delete data.quodsiData;
            delete data.modelType;
            delete data.validationState;
            
            // Keep visual properties
            await element.setData({
                ...data,
                // Preserve name, position, etc.
            });
        }
    }
}
```

## What Gets Removed

### Model Data
- ModelDefinition from storage
- Simulation properties on elements
- Validation states
- Model metadata

### What Remains
- Visual shapes on canvas
- Shape positions and styling
- Text and labels
- Basic connections

## Confirmation Dialog

```typescript
const RemoveModelDialog = ({ onConfirm, onCancel }) => (
    <Modal title="Remove Simulation Model">
        <p>This will remove all simulation data from the document.</p>
        <p>The diagram shapes will remain, but simulation properties will be lost.</p>
        
        <div className="warning">
            <strong>⚠️ This action cannot be undone.</strong>
        </div>
        
        <div className="actions">
            <Button onClick={onCancel}>Cancel</Button>
            <Button danger onClick={onConfirm}>Remove Model</Button>
        </div>
    </Modal>
);
```

## State Updates

### Before Removal
```typescript
{
  isQuodsiModel: true,
  modelVersion: "1.0",
  hasSimulationData: true,
  elements: [
    { 
      id: "123", 
      type: "Activity",
      quodsiData: { duration: 10, resources: [...] }
    }
  ]
}
```

### After Removal
```typescript
{
  isQuodsiModel: false,
  modelVersion: null,
  hasSimulationData: false,
  elements: [
    { 
      id: "123",
      // Only visual properties remain
    }
  ]
}
```

## UI Changes After Removal

### Panel Updates
```typescript
// Model panel shows empty state
const ModelPanel = ({ hasModel }) => {
    if (!hasModel) {
        return (
            <EmptyState>
                <h3>No Simulation Model</h3>
                <p>Convert your diagram to start simulation modeling</p>
                <Button onClick={convertToModel}>Convert to Model</Button>
            </EmptyState>
        );
    }
    // ... normal model UI
};
```

### Disabled Features
After model removal:
- Simulation run disabled
- Validation unavailable
- Element editors show read-only
- Results viewing disabled

## Error Conditions

### Removal Failures
- No model exists to remove
- Storage access errors
- Network failures
- Permission issues

### Partial Removal
- Some data cleaned, others fail
- Model cleared but storage persists
- Elements partially cleaned

## Recovery Options

### Undo Support
Currently no built-in undo for model removal. Best practices:
1. Export model before removal
2. Save document version
3. Backup simulation data

### Re-conversion
After removal, page can be converted again:
- MODEL_CONVERT creates new model
- Previous simulation data is lost
- New defaults applied

## Related Messages
- **MODEL_CONVERT** - Opposite operation
- **MODEL_CONTEXT** - Updates after removal
- **SELECTION_CHANGED** - Clears selection
- **AUTH_STATUS** - Required for operation