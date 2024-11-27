# LucidChart Custom Data Storage Strategy

## Overview
The project implements a strategic mapping between LucidChart's diagram elements and Quodsi's simulation model components. This mapping leverages LucidChart's native shape data storage capabilities to create and maintain a persistent, valid simulation model.

## Model Mapping Architecture

### Conceptual Mapping
```
LucidChart                 Quodsi
---------                 -------
Page         ------>      ModelDefinition
Shapes       ------>      Activities, Resources, Entities, Generators
Lines        ------>      Connectors
```

## Core Storage Components

### 1. Shape Data Attributes
Two primary custom attributes are used:
```typescript
static readonly OBJECT_TYPE_KEY = 'q_objecttype';  // Stores the simulation object type
static readonly DATA_KEY = 'q_data';               // Stores the serialized object data
```

### 2. Storage Locations

#### Page Level
- Stores model-wide configuration
- Contains simulation status information
- Maintains page-level metadata
```typescript
// Example: Storing model data on a page
activePage.shapeData.set('q_data', JSON.stringify(modelData));
activePage.shapeData.set('q_objecttype', SimulationObjectType.Model);
```

#### Block Level (Shapes)
- Stores activity definitions
- Contains resource configurations
- Holds entity definitions
- Maintains generator settings
```typescript
// Example: Storing activity data on a block
block.shapeData.set('q_data', JSON.stringify(activityData));
block.shapeData.set('q_objecttype', SimulationObjectType.Activity);
```

#### Line Level (Connectors)
- Stores routing probabilities
- Contains transition rules
- Maintains flow configurations
```typescript
// Example: Storing connector data on a line
line.shapeData.set('q_data', JSON.stringify(connectorData));
line.shapeData.set('q_objecttype', SimulationObjectType.Connector);
```

## Model Validation Requirements

### Valid Model Definition
A valid Quodsi simulation model must meet these minimum requirements:
1. At least one valid Activity
2. At least one valid Generator
3. Valid Connector(s) between Activities

```typescript
// Example validation check
function isValidModel(page: PageProxy): boolean {
    const activities = getValidActivities(page);
    const generators = getValidGenerators(page);
    const connectors = getValidConnectors(page);

    return (
        activities.length > 0 &&
        generators.length > 0 &&
        connectors.length > 0 &&
        areGeneratorsValid(generators, activities) &&
        areConnectorsValid(connectors, activities)
    );
}
```

### Generator Validation Rules
Each Generator must reference a valid Activity:
- Must have a valid `activityKeyId`
- Referenced activity must exist in the model
- Referenced activity must be properly mapped and configured

```typescript
function isValidGenerator(generator: Generator, activities: Activity[]): boolean {
    // Generator must have an activityKeyId
    if (!generator.activityKeyId) {
        return false;
    }

    // ActivityKeyId must reference an existing activity
    return activities.some(activity => activity.name === generator.activityKeyId);
}
```

### Connector Validation Rules
Each Connector must:
- Be mapped to a Line in the diagram
- Have valid source and destination Activities
- Source and destination must be properly mapped Activities

```typescript
function isValidConnector(
    connector: Connector, 
    line: LineProxy, 
    activities: Activity[]
): boolean {
    const sourceShape = line.getEndpoint1().connection;
    const destShape = line.getEndpoint2().connection;

    if (!sourceShape || !destShape) {
        return false;
    }

    // Verify both shapes are mapped to valid activities
    return (
        isShapeMappedToActivity(sourceShape) &&
        isShapeMappedToActivity(destShape)
    );
}
```

## Implementation

### QuodsiShapeData Class
Central class managing data storage operations:
```typescript
class QuodsiShapeData {
    constructor(private element: ElementProxy) {}

    setObjectTypeAndData<T extends SimulationObject>(
        objectType: SimulationObjectType, 
        data: T
    ): void {
        this.element.shapeData.set(OBJECT_TYPE_KEY, objectType);
        this.element.shapeData.set(DATA_KEY, JSON.stringify(data));
    }

    getTypedData(): SimulationObject | null {
        const objectType = this.getObjectType();
        const dataValue = this.element.shapeData.get(DATA_KEY);
        // Type-safe data retrieval...
    }
}
```

### Implementation Patterns

#### Activity Mapping
```typescript
function mapShapeToActivity(shape: BlockProxy): void {
    const shapeData = new QuodsiShapeData(shape);
    const activity = {
        id: shape.id,
        name: shape.getTextContent() || 'Unnamed Activity',
        type: SimulationObjectType.Activity,
        // ... other activity properties
    };
    shapeData.setObjectTypeAndData(SimulationObjectType.Activity, activity);
}
```

#### Generator Mapping
```typescript
function mapShapeToGenerator(shape: BlockProxy, targetActivity: BlockProxy): void {
    const shapeData = new QuodsiShapeData(shape);
    const generator = {
        id: shape.id,
        activityKeyId: targetActivity.getTextContent(),
        type: SimulationObjectType.Generator,
        // ... other generator properties
    };
    shapeData.setObjectTypeAndData(SimulationObjectType.Generator, generator);
}
```

#### Connector Mapping
```typescript
function mapLineToConnector(line: LineProxy): void {
    const shapeData = new QuodsiShapeData(line);
    const connector = {
        id: line.id,
        type: SimulationObjectType.Connector,
        probability: 1.0, // default probability
        // ... other connector properties
    };
    shapeData.setObjectTypeAndData(SimulationObjectType.Connector, connector);
}
```

### Data Management Patterns

#### 1. Type Safety
```typescript
static isValidData(objectType: SimulationObjectType, data: any): boolean {
    if (!data || typeof data !== 'object') {
        return false;
    }
    return data.type === objectType;
}
```

#### 2. Data Serialization
```typescript
// Storing data
const serializedData = JSON.stringify(simulationObject);
element.shapeData.set('q_data', serializedData);

// Retrieving data
const rawData = element.shapeData.get('q_data');
const simulationObject = JSON.parse(rawData);
```

#### 3. Type Verification
```typescript
getTypedData(): SimulationObject | null {
    const objectType = this.getObjectType();
    switch (objectType) {
        case SimulationObjectType.Model:
            return parsedData as Model;
        case SimulationObjectType.Activity:
            return parsedData as Activity;
        // ... other types
    }
}
```

## Model Operations

### Page to Model Conversion
```typescript
class ConvertPageToModel {
    public convert(page: PageProxy): void {
        // 1. First pass: Map shapes to appropriate simulation objects
        for (const shape of page.allBlocks.values()) {
            this.mapShapeToSimulationObject(shape);
        }

        // 2. Second pass: Map lines to connectors
        for (const line of page.allLines.values()) {
            this.mapLineToConnector(line);
        }

        // 3. Validate the resulting model
        if (!this.validateModel(page)) {
            throw new Error('Invalid model configuration');
        }
    }

    private mapShapeToSimulationObject(shape: BlockProxy): void {
        // Determine appropriate simulation object type based on shape
        // Map shape to Activity, Generator, Resource, or Entity
    }

    private validateModel(page: PageProxy): boolean {
        // Verify model meets all validation requirements
        // Return true if valid, false otherwise
    }
}
```

### Model Removal
```typescript
class RemoveModelFromPage {
    public removeModel(): void {
        // Clean up stored data
        // Remove simulation attributes
        // Reset page state
    }
}
```

## Validation Utilities

### Model Validation
```typescript
class ModelValidator {
    static validateModel(page: PageProxy): ValidationResult {
        const activities = this.getValidActivities(page);
        const generators = this.getValidGenerators(page);
        const connectors = this.getValidConnectors(page);

        const errors: ValidationError[] = [];

        if (activities.length === 0) {
            errors.push({ type: 'NoActivities' });
        }

        if (generators.length === 0) {
            errors.push({ type: 'NoGenerators' });
        }

        this.validateGeneratorReferences(generators, activities, errors);
        this.validateConnectorEndpoints(connectors, activities, errors);

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    private static validateGeneratorReferences(
        generators: Generator[], 
        activities: Activity[], 
        errors: ValidationError[]
    ): void {
        // Validate generator references to activities
    }

    private static validateConnectorEndpoints(
        connectors: Connector[], 
        activities: Activity[], 
        errors: ValidationError[]
    ): void {
        // Validate connector endpoints
    }
}
```

## Key Features

### 1. Persistence
- Data survives document saves/loads
- Maintains simulation state
- Preserves configuration settings

### 2. Integration
- Seamlessly works with LucidChart's native functionality
- Supports undo/redo operations
- Maintains visual-data synchronization

### 3. Type Safety
- Strong typing for stored data
- Validation on read/write
- Error handling for malformed data

### 4. Extensibility
- Easy to add new object types
- Flexible data structure
- Versioning support

## Benefits of This Approach

1. **Native Integration**
   - Uses LucidChart's built-in capabilities
   - No external storage required
   - Automatic persistence

2. **Performance**
   - Minimal overhead
   - Direct access to data
   - Efficient updates

3. **Maintainability**
   - Clear data organization
   - Type-safe operations
   - Centralized management

4. **User Experience**
   - Seamless integration with diagram
   - Natural workflow
   - Immediate feedback

## Best Practices

1. **Data Validation**
   - Always validate data before storage
   - Implement type checking
   - Handle malformed data gracefully

2. **Error Handling**
   - Provide fallbacks for missing data
   - Log storage/retrieval errors
   - Maintain system stability

3. **Performance Considerations**
   - Minimize stored data size
   - Implement efficient serialization
   - Cache frequently accessed data

4. **Maintenance**
   - Document data structures
   - Version control for stored formats
   - Clean up unused data

This storage strategy effectively leverages LucidChart's capabilities to create a robust and maintainable simulation modeling system while maintaining strong typing and data integrity.
