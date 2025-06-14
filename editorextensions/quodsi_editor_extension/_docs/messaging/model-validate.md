# Model Validate Exchange

## Overview
Model validation messages check the entire simulation model for consistency, completeness, and correctness, providing detailed feedback about any issues found.

## Message Flow

### MODEL_VALIDATE: React → Extension

**Direction:** React → Extension  
**Purpose:** Request validation of entire simulation model  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  documentId: string
}
```

**Sender:** 
- File: `quodsim-react/src/messaging/senders/modelOpsSender.ts`
- Function: `modelOpsSender.validateModel`

**Handler:**
- File: `src/core/messaging/handlers/modelOpsHandler.ts`
- Function: `ModelOpsHandler.handleModelValidate`

**Response:** `MODEL_VALIDATION_RESULT`

---

### MODEL_VALIDATION_RESULT: Extension → React

**Direction:** Extension → React  
**Purpose:** Return comprehensive validation results  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  isValid: boolean,
  messages: ValidationMessage[],
  errorCount: number,
  warningCount: number
}

// ValidationMessage structure
interface ValidationMessage {
  type: 'error' | 'warning' | 'info';
  category: string;          // "Activity", "Resource", "Connection", etc.
  elementId?: string;        // Affected element
  message: string;          // Human-readable message
  details?: any;            // Additional context
}
```

**Sender:** 
- File: `src/core/messaging/handlers/modelOpsHandler.ts`
- Function: `ModelOpsHandler.handleModelValidate`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/validation.mapper.ts`
- Function: `validation.mapper.mapMessageToAction`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| MODEL_VALIDATE | ✅ modelOpsSender.validateModel | ✅ ModelOpsHandler.handleModelValidate | ➖ N/A | ➖ N/A |
| MODEL_VALIDATION_RESULT | ➖ N/A | ➖ N/A | ✅ ModelOpsHandler.handleModelValidate | ✅ validation.mapper.mapMessageToAction |

## Validation Sequence

1. User clicks "Validate Model" button
2. **MODEL_VALIDATE** sent to extension
3. Extension performs comprehensive validation:
   - Element count checks
   - Individual element validation
   - Connection validation
   - Resource requirement checks
   - Model completeness
4. **MODEL_VALIDATION_RESULT** sent to React
5. React displays validation results:
   - Summary (valid/invalid, counts)
   - Detailed message list
   - Navigation to problem elements

## Validation Rules

### Model-Level Validation
```typescript
// Minimum requirements
- At least one Generator
- At least one Activity
- Valid connections between elements
- No orphaned elements
- No circular dependencies
```

### Element-Level Validation

**Activities:**
- Valid name (non-empty)
- Valid duration (positive)
- Resource requirements satisfied
- Input/output connections valid

**Resources:**
- Valid name (non-empty)
- Positive capacity
- Valid schedule (if specified)

**Generators:**
- Valid arrival pattern
- Positive inter-arrival time
- Valid entity type

**Connectors:**
- Valid source and target
- Compatible element types
- No self-connections

## Implementation Details

### Validation Handler
```typescript
async handleModelValidate(msg: EnvelopeBase): Promise<void> {
    try {
        const { documentId } = msg.data;
        
        // Get current model
        const model = await this.modelManager.getModel(documentId);
        if (!model) {
            throw new Error('Model not found');
        }
        
        // Perform validation using validation service
        const validationService = new ModelValidationService();
        const result = validationService.validateModel(model);
        
        // Send validation results
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.MODEL_VALIDATION_RESULT,
            {
                isValid: result.isValid,
                messages: result.messages,
                errorCount: result.errorCount,
                warningCount: result.warningCount
            }
        );
        
    } catch (error) {
        // Send error as validation failure
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.MODEL_VALIDATION_RESULT,
            {
                isValid: false,
                messages: [{
                    type: 'error',
                    category: 'System',
                    message: `Validation failed: ${error.message}`
                }],
                errorCount: 1,
                warningCount: 0
            }
        );
    }
}
```

### Validation Service Example
```typescript
class ModelValidationService {
    validateModel(model: ModelDefinition): ValidationResult {
        const messages: ValidationMessage[] = [];
        
        // Check element counts
        this.validateElementCounts(model, messages);
        
        // Validate each element type
        model.activities.forEach(a => this.validateActivity(a, messages));
        model.resources.forEach(r => this.validateResource(r, messages));
        model.generators.forEach(g => this.validateGenerator(g, messages));
        model.connectors.forEach(c => this.validateConnector(c, messages));
        
        // Check connections
        this.validateConnections(model, messages);
        
        // Calculate summary
        const errorCount = messages.filter(m => m.type === 'error').length;
        const warningCount = messages.filter(m => m.type === 'warning').length;
        
        return {
            isValid: errorCount === 0,
            messages,
            errorCount,
            warningCount
        };
    }
}
```

## Validation Message Examples

### Error Messages
```typescript
{
  type: 'error',
  category: 'Activity',
  elementId: 'activity-123',
  message: 'Activity "Process Order" has no input connections',
  details: { activityName: 'Process Order' }
}

{
  type: 'error',
  category: 'Model',
  message: 'Model must have at least one Generator',
  details: { generatorCount: 0 }
}
```

### Warning Messages
```typescript
{
  type: 'warning',
  category: 'Resource',
  elementId: 'resource-456',
  message: 'Resource "Worker" has very high utilization (>95%)',
  details: { utilization: 0.98 }
}

{
  type: 'warning',
  category: 'Connection',
  message: 'Multiple paths between Generator and Sink may cause issues',
  details: { pathCount: 3 }
}
```

## UI Integration

### Validation Results Display
```typescript
const ValidationResults = ({ results }) => {
    const { isValid, messages, errorCount, warningCount } = results;
    
    return (
        <div className={`validation-results ${isValid ? 'valid' : 'invalid'}`}>
            <div className="summary">
                <h3>{isValid ? '✓ Model is valid' : '✗ Model has issues'}</h3>
                <p>{errorCount} errors, {warningCount} warnings</p>
            </div>
            
            <div className="messages">
                {messages.map((msg, idx) => (
                    <ValidationMessageItem 
                        key={idx}
                        message={msg}
                        onNavigate={() => navigateToElement(msg.elementId)}
                    />
                ))}
            </div>
        </div>
    );
};
```

### Inline Validation Indicators
```typescript
// Show validation status on elements
const ElementCard = ({ element, validationMessages }) => {
    const hasErrors = validationMessages.some(m => m.type === 'error');
    const hasWarnings = validationMessages.some(m => m.type === 'warning');
    
    return (
        <div className="element-card">
            {hasErrors && <span className="error-badge">!</span>}
            {hasWarnings && <span className="warning-badge">⚠</span>}
            {/* Element content */}
        </div>
    );
};
```

## Validation Triggers

### Automatic Validation
- After element updates
- Before simulation run
- On model load

### Manual Validation
- User clicks validate button
- Developer tools request
- API endpoint call

## Performance Considerations

- Validation can be expensive for large models
- Consider caching validation results
- Incremental validation for element changes
- Batch validation messages for UI updates

## Error Recovery

### Invalid Model Handling
```typescript
if (!validationResult.isValid) {
    // Disable simulation run
    setSimulationEnabled(false);
    
    // Show validation panel
    showValidationPanel(validationResult.messages);
    
    // Highlight problem elements
    highlightElements(
        validationResult.messages
            .filter(m => m.elementId)
            .map(m => m.elementId)
    );
}
```

## Best Practices

1. **Clear Messages**: Provide actionable validation feedback
2. **Element Navigation**: Link messages to specific elements
3. **Progressive Validation**: Check basic issues before complex ones
4. **Helpful Suggestions**: Include how to fix issues
5. **Severity Levels**: Use appropriate error/warning classification

## Related Messages
- **ELEMENT_UPDATE** - Triggers revalidation
- **MODEL_RUN_REQUEST** - Requires valid model
- **SELECTION_CHANGED** - Navigate to problem elements
- **MODEL_CONVERT** - Validates after conversion