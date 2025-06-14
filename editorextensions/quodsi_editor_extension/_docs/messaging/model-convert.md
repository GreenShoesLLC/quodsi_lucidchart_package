# Model Convert Exchange

## Overview
Model convert messages handle the transformation of a regular LucidChart page into a Quodsi simulation model, analyzing shapes and connections to create simulation elements.

## Message Flow

### MODEL_CONVERT: React → Extension

**Direction:** React → Extension  
**Purpose:** Convert current page to Quodsi simulation model  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  documentId?: string,      // Optional, uses current if not provided
  elementId?: string,       // Optional, specific element to convert
  targetType?: string       // Optional, hint for conversion type
}
```

**Sender:** 
- File: `quodsim-react/src/messaging/senders/modelOpsSender.ts`
- Function: `modelOpsSender.convertPage`

**Handler:**
- File: `src/core/messaging/handlers/modelOpsHandler.ts`
- Function: `ModelOpsHandler.handleModelConvert`

**Response:** `MODEL_CONVERSION_RESULT`

---

### MODEL_CONVERSION_RESULT: Extension → React

**Direction:** Extension → React  
**Purpose:** Report result of page-to-model conversion  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  success: boolean,
  documentId: string,
  errorMessage?: string,
  warnings?: string[],
  statistics?: {
    shapesAnalyzed: number,
    elementsCreated: number,
    connectionsCreated: number,
    unconvertedShapes: number
  }
}
```

**Sender:** 
- File: `src/core/messaging/handlers/modelOpsHandler.ts`
- Function: `ModelOpsHandler.handleModelConvert`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/modelOps.mapper.ts`
- Function: `modelOps.mapper.mapMessageToAction`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| MODEL_CONVERT | ✅ modelOpsSender.convertPage | ✅ ModelOpsHandler.handleModelConvert | ➖ N/A | ➖ N/A |
| MODEL_CONVERSION_RESULT | ➖ N/A | ➖ N/A | ✅ ModelOpsHandler.handleModelConvert | ✅ modelOps.mapper.mapMessageToAction |

## Conversion Sequence

1. User has diagram with Quodsi shapes (not yet a model)
2. User clicks "Convert to Model" button
3. **MODEL_CONVERT** sent to extension
4. Extension analyzes page:
   - Identifies Quodsi shape library shapes
   - Extracts shape properties
   - Analyzes connections
   - Creates model structure
5. Extension initializes ModelManager with converted data
6. **MODEL_CONVERSION_RESULT** sent to React
7. React shows conversion summary
8. Page now functions as simulation model

## Conversion Process

### Shape Recognition
```typescript
// Shapes identified by:
- Shape library ID (Quodsi shapes)
- Custom data tags
- Shape names/patterns
- Visual properties
```

### Element Mapping
| LucidChart Shape | Simulation Element |
|-----------------|-------------------|
| Activity shape | Activity object |
| Resource shape | Resource object |
| Generator shape | Generator object |
| Entity shape | Entity object |
| Arrow/Line | Connector object |

### Property Extraction
```typescript
// For each shape:
{
  // From shape properties
  id: shape.id,
  name: shape.text || 'Unnamed',
  position: { x: shape.x, y: shape.y },
  
  // From custom data
  ...shape.customData,
  
  // Type-specific defaults
  ...getDefaultsForType(shapeType)
}
```

## Implementation Details

### Conversion Handler
```typescript
async handleModelConvert(msg: EnvelopeBase): Promise<void> {
    try {
        const { documentId } = msg.data;
        
        // Get current page
        const page = await this.client.getCurrentPage();
        const shapes = await page.getAllShapes();
        
        // Initialize conversion service
        const converter = new PageToModelConverter(this.client);
        const conversionResult = await converter.convertPage(page, shapes);
        
        if (conversionResult.elements.length === 0) {
            throw new Error('No convertible shapes found on page');
        }
        
        // Create model from conversion
        const model = new ModelDefinition();
        model.loadFromConversion(conversionResult);
        
        // Initialize ModelManager with new model
        this.modelManager.setModel(model);
        
        // Store model data
        await this.storageAdapter.saveModel(model);
        
        // Send success response
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.MODEL_CONVERSION_RESULT,
            {
                success: true,
                documentId: documentId,
                warnings: conversionResult.warnings,
                statistics: {
                    shapesAnalyzed: shapes.length,
                    elementsCreated: conversionResult.elements.length,
                    connectionsCreated: conversionResult.connections.length,
                    unconvertedShapes: conversionResult.skippedShapes.length
                }
            }
        );
        
    } catch (error) {
        this.router.sendToChannel(
            msg.source,
            EnvelopeMessageType.MODEL_CONVERSION_RESULT,
            {
                success: false,
                documentId: msg.data.documentId,
                errorMessage: error.message
            }
        );
    }
}
```

### Conversion Algorithm
```typescript
class PageToModelConverter {
    async convertPage(page: PageProxy, shapes: ShapeProxy[]): Promise<ConversionResult> {
        const result = {
            elements: [],
            connections: [],
            warnings: [],
            skippedShapes: []
        };
        
        // Phase 1: Convert shapes to elements
        for (const shape of shapes) {
            const element = await this.convertShape(shape);
            if (element) {
                result.elements.push(element);
            } else {
                result.skippedShapes.push(shape.id);
                result.warnings.push(`Shape "${shape.text}" could not be converted`);
            }
        }
        
        // Phase 2: Convert lines to connections
        const lines = await page.getAllLines();
        for (const line of lines) {
            const connection = await this.convertLine(line, result.elements);
            if (connection) {
                result.connections.push(connection);
            }
        }
        
        // Phase 3: Validate conversion
        this.validateConversion(result);
        
        return result;
    }
    
    private async convertShape(shape: ShapeProxy): Promise<SimulationElement | null> {
        // Check if shape is from Quodsi library
        if (!this.isQuodsiShape(shape)) {
            return null;
        }
        
        // Extract type from shape
        const type = this.getShapeType(shape);
        
        // Create appropriate element
        switch (type) {
            case 'Activity':
                return this.createActivity(shape);
            case 'Resource':
                return this.createResource(shape);
            case 'Generator':
                return this.createGenerator(shape);
            // ... other types
            default:
                return null;
        }
    }
}
```

## Conversion Rules

### Automatic Conversions
1. **Shape Names** → Element names
2. **Shape Positions** → Element layout
3. **Shape Colors** → Visual properties
4. **Connections** → Flow relationships

### Default Values
Elements created with sensible defaults:
- Activities: 1 minute duration
- Resources: Capacity of 1
- Generators: Exponential arrival (rate=1)

### Warning Conditions
- Unrecognized shapes on page
- Shapes without connections
- Ambiguous connection patterns
- Missing required properties

## UI Feedback

### Pre-Conversion Check
```typescript
const ConvertButton = ({ onConvert }) => {
    const checkConvertibility = async () => {
        const stats = await analyzer.analyzePageForConversion();
        
        if (stats.convertibleShapes === 0) {
            showWarning('No Quodsi shapes found. Add shapes from Quodsi library first.');
            return false;
        }
        
        return confirm(`Convert ${stats.convertibleShapes} shapes to simulation model?`);
    };
    
    return (
        <Button onClick={async () => {
            if (await checkConvertibility()) {
                onConvert();
            }
        }}>
            Convert to Model
        </Button>
    );
};
```

### Post-Conversion Summary
```typescript
const ConversionSummary = ({ result }) => (
    <div className="conversion-summary">
        <h3>Conversion Complete</h3>
        <ul>
            <li>✓ {result.statistics.elementsCreated} elements created</li>
            <li>✓ {result.statistics.connectionsCreated} connections created</li>
            {result.statistics.unconvertedShapes > 0 && (
                <li>⚠ {result.statistics.unconvertedShapes} shapes skipped</li>
            )}
        </ul>
        {result.warnings.length > 0 && (
            <div className="warnings">
                <h4>Warnings:</h4>
                {result.warnings.map(w => <p key={w}>{w}</p>)}
            </div>
        )}
    </div>
);
```

## Best Practices

1. **Shape Library Usage**: Use official Quodsi shapes for best results
2. **Clear Naming**: Name shapes before conversion
3. **Complete Connections**: Connect all elements before converting
4. **Review Warnings**: Address warnings for better models
5. **Validation**: Run validation after conversion

## Error Recovery

### Conversion Failures
- No convertible shapes found
- Invalid page structure
- Permissions issues
- Storage failures

### Partial Conversions
- Some shapes converted successfully
- Warnings indicate skipped elements
- Model may be incomplete but usable

## Related Messages
- **MODEL_VALIDATE** - Run after conversion
- **MODEL_REMOVE** - Opposite operation
- **ELEMENT_CONVERT** - Individual element conversion
- **SELECTION_CHANGED** - Updates after conversion