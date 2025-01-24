# LucidChart Custom Data Storage Strategy

## Overview
The project implements a clever strategy of utilizing LucidChart's native shape data storage capabilities to create a persistent simulation model. This approach leverages LucidChart's built-in `shapeData` API to store custom simulation data within the diagram elements themselves.

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

## Data Operations

### Model Conversion
```typescript
class ConvertPageToModel {
    public convert(page: PageProxy): void {
        // Analyze page structure
        // Create appropriate simulation objects
        // Store data in relevant shapes
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
