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

**Response:** `MODEL_CONVERSION_RESULT` + `MODEL_CONTEXT` + `SELECTION_CHANGED`

---

### MODEL_CONVERSION_RESULT: Extension → React

**Direction:** Extension → React  
**Purpose:** Report result of page-to-model conversion  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  success: boolean,
  convertedElementIds: string[],
  error?: string
}
```

**Sender:** 
- File: `src/core/messaging/handlers/modelOpsHandler.ts`
- Function: `ModelOpsHandler.handleModelConvert`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/modelOps.mapper.ts`
- Function: `mapModelOps`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| MODEL_CONVERT | ✅ modelOpsSender.convertPage | ✅ ModelOpsHandler.handleConvert | ➖ N/A | ➖ N/A |
| MODEL_CONVERSION_RESULT | ➖ N/A | ➖ N/A | ✅ ModelOpsHandler.handleConvert | ✅ mapModelOps |

## Conversion Sequence

1. User has diagram with Quodsi shapes (not yet a model)
2. User clicks "Initialize Model" button
3. **MODEL_CONVERT** sent to extension
4. Extension performs page conversion:
   - Uses LucidPageConversionService to convert page
   - Creates Model object and initializes ModelManager
   - Converts blocks to simulation elements (Activities, Resources, Generators)
   - Converts lines to Connectors with probability calculations
   - Stores all data via StorageAdapter
5. Extension sends three messages:
   - **MODEL_CONVERSION_RESULT** (success/failure notification)
   - **MODEL_CONTEXT** (document context update)
   - **SELECTION_CHANGED** (triggers UI state refresh)
6. React processes messages:
   - Maps MODEL_CONVERSION_RESULT to MODEL_CONVERSION_SUCCESS action
   - Updates document context with isQuodsiModel: true
   - Refreshes selection state to trigger UI update
7. UI transitions from "Initialize Model" to ModelEditor interface
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
private static async handleConvert(msg: EnvelopeBase): Promise<boolean> {
    try {
        // Get necessary instances
        const client = ModelManager.getClient();
        const modelManager = ModelManager.getInstance();
        
        // Get viewport and current page
        const viewport = new Viewport(client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(client);
        
        if (!currentPage) {
            throw new Error('Current page not available');
        }
        
        // Check if this is a page conversion request (no elementId)
        if (!data.elementId) {
            // Set up required services
            const storageAdapter = new StorageAdapter();
            const lucidElementFactory = new LucidElementFactory(storageAdapter);
            const pageConversionService = new LucidPageConversionService(
                modelManager,
                lucidElementFactory,
                storageAdapter
            );
            
            // Check if page can be converted
            if (!pageConversionService.canConvertPage(currentPage)) {
                throw new Error('Page cannot be converted to a model');
            }
            
            // Convert the page
            const result = await pageConversionService.convertPage(currentPage);
            
            // Send success response
            router.send('model', {
                id: msg.id,
                type: EnvelopeMessageType.MODEL_CONVERSION_RESULT,
                source: 'host',
                target: 'model-iframe',
                version: '1.0',
                data: {
                    success: true,
                    convertedElementIds: []
                }
            });
            
            // Send context refresh messages to update UI
            Promise.resolve().then(() => {
                const documentId = document.id;
                const isQuodsiModel = modelManager.isQuodsiModel(currentPage);
                const title = document.getTitle() || 'Untitled Document';
                
                // Send MODEL_CONTEXT message
                router.send('model', {
                    id: generateId(),
                    type: EnvelopeMessageType.MODEL_CONTEXT,
                    source: 'host',
                    target: 'model-iframe',
                    version: '1.0',
                    data: {
                        documentId,
                        title,
                        pageId: currentPage.id,
                        isQuodsiModel,
                        hasValidModel: isQuodsiModel
                    }
                });
                
                // Send SELECTION_CHANGED message with embedded document context
                router.send('model', {
                    id: generateId(),
                    type: EnvelopeMessageType.SELECTION_CHANGED,
                    source: 'host',
                    target: 'model-iframe',
                    version: '1.0',
                    data: {
                        selectionType: 'page',
                        documentId: documentId,
                        hasModel: true,
                        selectionState: {
                            pageId: currentPage.id,
                            selectedIds: [],
                            selectionType: 'page'
                        },
                        documentContext: {
                            documentId,
                            pageId: currentPage.id,
                            title,
                            isQuodsiModel,
                            metadata: {}
                        }
                    }
                });
            });
            
            return true;
        }
        
    } catch (error) {
        ModelOpsHandler.logger.error('Error in model conversion:', error);
        
        // Send error response
        router.send('model', {
            id: msg.id,
            type: EnvelopeMessageType.MODEL_CONVERSION_RESULT,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: {
                success: false,
                convertedElementIds: [],
                error: error instanceof Error ? error.message : String(error)
            }
        });
        
        return false;
    }
}
```

### Conversion Flow (LucidPageConversionService)
```typescript
export class LucidPageConversionService {
    public async convertPage(page: PageProxy): Promise<ConversionResult> {
        // First, remove any existing model data
        if (this.storageAdapter.isQuodsiModel(page)) {
            this.modelManager.removeModelFromPage(page);
        }
        
        // Create model using LucidElementFactory
        const modelLucid = this.elementFactory.createPlatformObject(
            page,
            SimulationObjectType.Model,
            true // isConversion
        );
        
        // Get the model object and initialize in ModelManager
        const model = modelLucid.getSimulationObject();
        await this.modelManager.initializeModel(model, page);
        
        // Analyze the page to determine element types
        const analysis = this.pageAnalyzer.analyzePage(page);
        
        // Convert blocks and connections
        const convertedBlocks = await this.convertBlocks(page, analysis);
        const convertedConnectors = await this.convertConnections(page, analysis);
        
        // Validate the converted model
        const validationResult = await this.modelManager.validateModel();
        
        return {
            success: true,
            modelId: page.id,
            elementCount: {
                activities: convertedBlocks.activities,
                generators: convertedBlocks.generators,
                resources: convertedBlocks.resources,
                connectors: convertedConnectors
            }
        };
    }
    
    private async convertBlocks(page: PageProxy, analysis: ProcessAnalysisResult) {
        let activities = 0, generators = 0, resources = 0;
        
        for (const [blockId, block] of page.allBlocks) {
            const blockAnalysis = analysis.blockAnalysis.get(blockId);
            if (!blockAnalysis?.elementType) continue;
            
            // Create platform object using factory with conversion flag
            const platformObject = this.elementFactory.createPlatformObject(
                block,
                blockAnalysis.elementType,
                true // isConversion
            );
            
            // Get simulation object and register with model manager
            const element = platformObject.getSimulationObject();
            await this.modelManager.registerElement(element, block);
            
            // Update counts
            switch (blockAnalysis.elementType) {
                case SimulationObjectType.Activity: activities++; break;
                case SimulationObjectType.Generator: generators++; break;
                case SimulationObjectType.Resource: resources++; break;
            }
        }
        
        return { activities, generators, resources };
    }
    
    private async convertConnections(page: PageProxy, analysis: ProcessAnalysisResult) {
        let connectorCount = 0;
        
        // Calculate outgoing connections per block for probability calculation
        const outgoingConnectionCounts = new Map<string, number>();
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            if (endpoint1?.connection) {
                const sourceId = endpoint1.connection.id;
                outgoingConnectionCounts.set(
                    sourceId,
                    (outgoingConnectionCounts.get(sourceId) || 0) + 1
                );
            }
        }
        
        for (const [lineId, line] of page.allLines) {
            const endpoint1 = line.getEndpoint1();
            const endpoint2 = line.getEndpoint2();
            
            if (!endpoint1?.connection || !endpoint2?.connection) continue;
            
            const sourceId = endpoint1.connection.id;
            const outgoingCount = outgoingConnectionCounts.get(sourceId) || 1;
            const probability = 1.0 / outgoingCount;
            
            // Create platform object using factory
            const platformObject = this.elementFactory.createPlatformObject(
                line,
                SimulationObjectType.Connector,
                true // isConversion
            );
            
            // Configure connector properties
            const connector = platformObject.getSimulationObject() as Connector;
            connector.sourceId = sourceId;
            connector.targetId = endpoint2.connection.id;
            connector.probability = probability;
            connector.connectType = ConnectType.Probability;
            
            // Update platform object and register
            platformObject.updateFromPlatform();
            await this.modelManager.registerElement(connector, line);
            connectorCount++;
        }
        
        return connectorCount;
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

## UI State Management

### React Action Flow
After successful conversion, the extension sends three messages to ensure proper UI update:

1. **MODEL_CONVERSION_RESULT** → Maps to `MODEL_CONVERSION_SUCCESS` action in AppSlice
2. **MODEL_CONTEXT** → Maps to `DOCUMENT_CONTEXT_UPDATE` action in SelectionSlice  
3. **SELECTION_CHANGED** → Maps to `SELECTION_UPDATE` action in SelectionSlice with embedded document context

### State Synchronization
```typescript
// modelOps.mapper.ts
case EnvelopeMessageType.MODEL_CONVERSION_RESULT:
    if (conversionData.success) {
        return {
            type: 'MODEL_CONVERSION_SUCCESS',
            success: true
        };
    }

// selection.mapper.ts  
case EnvelopeMessageType.MODEL_CONTEXT:
    return {
        type: 'DOCUMENT_CONTEXT_UPDATE',
        documentId: contextData.documentId,
        pageId: contextData.pageId,
        documentTitle: contextData.title,
        isQuodsiModel: contextData.isQuodsiModel,
        metadata: contextData.metadata
    };

case EnvelopeMessageType.SELECTION_CHANGED:
    return {
        type: 'SELECTION_UPDATE',
        elements: elements,
        totalElements: selectionData.selectionState.selectedIds.length || 0,
        // Include embedded document context for immediate UI refresh
        documentContext: selectionData.documentContext
    };
```

### UI Transition Flow
```
Before Conversion:
- isQuodsiModel: false
- UI shows "Initialize Model" button
- Component: InitializeModelButton

After Conversion:
- MODEL_CONVERSION_SUCCESS triggers re-render
- DOCUMENT_CONTEXT_UPDATE sets isQuodsiModel: true  
- SELECTION_UPDATE refreshes selection state
- UI transitions to ModelEditor interface
- Component: ModelPanel with simulation controls
```

## Debugging Tips

### Common Issues
1. **Warning: "Unhandled action type: MODEL_CONVERSION_SUCCESS"**
   - Fixed: SelectionSlice now ignores non-selection actions
   - SelectionSlice only warns for SELECTION_* and DOCUMENT_CONTEXT_* actions

2. **Error: "crypto.getRandomValues() not supported"**
   - Fixed: Replaced uuid library with simple ID generator
   - Uses `generateId()` function compatible with extension context

3. **UI doesn't refresh after conversion**
   - Ensure all three messages are sent: MODEL_CONVERSION_RESULT, MODEL_CONTEXT, SELECTION_CHANGED
   - Check that document context isQuodsiModel is properly set to true
   - Verify React component has key prop for forced re-renders

### Logging
```typescript
// Extension logging (ModelOpsHandler)
ModelOpsHandler.logger.log('Model conversion successful');
ModelOpsHandler.logger.log('Sending context refresh messages after conversion');

// React logging (mappers)
logger.log('Model conversion successful, dispatching MODEL_CONVERSION_SUCCESS action');
logger.log('DOCUMENT_CONTEXT_UPDATE - Updated state:', { isQuodsiModel: true });
```

## Related Messages
- **MODEL_VALIDATE** - Run after conversion for validation
- **MODEL_REMOVE** - Opposite operation (converts model back to diagram)
- **ELEMENT_CONVERT** - Individual element conversion operations
- **MODEL_CONTEXT** - Document context updates (sent after conversion)
- **SELECTION_CHANGED** - Selection and state updates (sent after conversion)