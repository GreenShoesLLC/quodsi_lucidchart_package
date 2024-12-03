# ModelManager Specification Document

## 1. Overview

The ModelManager is a core component responsible for:
1. Managing a single Model instance containing all simulation components
2. Handling platform storage integration
3. Validating model structure and components
4. Facilitating model serialization for QuodSim
5. Managing component lifecycle and relationships

## 2. Core Architecture

### 2.1 Model Structure
```typescript
class Model implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Model;
    
    // Model Configuration
    id: string;
    name: string;
    reps: number;
    forecastDays: number;
    seed?: number;
    oneClockUnit?: PeriodUnit;
    simulationTimeType?: SimulationTimeType;
    
    // Time Configuration
    warmupClockPeriod?: number;
    warmupClockPeriodUnit?: PeriodUnit;
    runClockPeriod?: number;
    runClockPeriodUnit?: PeriodUnit;
    warmupDateTime: Date | null;
    startDateTime: Date | null;
    finishDateTime: Date | null;

    // Component Collections
    entities: Map<string, Entity> = new Map();
    resources: Map<string, Resource> = new Map();
    activities: Map<string, Activity> = new Map();
    generators: Map<string, Generator> = new Map();
}
```

### 2.2 Component Types
```typescript
interface SimulationObject {
    id: string;
    name: string;
}

enum SimulationObjectType {
    Entity = "Entity",
    Activity = "Activity",
    Connector = "Connector",
    Generator = "Generator",
    Resource = "Resource",
    Model = "Model"
}

class Activity implements SimulationObject {
    type: SimulationObjectType = SimulationObjectType.Activity;
    id: string;
    name: string;
    capacity: number;
    inputBufferCapacity: number;
    outputBufferCapacity: number;
    operationSteps: OperationStep[] = [];
    connectors: Connector[] = [];  // Outgoing connections
}
```

## 3. Component Operations

### 3.1 Registration and Updates
```typescript
class ModelManager {
    private model: Model;
    private eventEmitter: EventEmitter;
    private storageAdapter: PlatformStorageAdapter;

    registerComponent(component: SimulationObject): void {
        switch(component.type) {
            case SimulationObjectType.Activity:
                this.model.activities.set(component.id, component as Activity);
                break;
            // ... other types
        }
        this.eventEmitter.emit(ModelManagerEvent.ComponentAdded, component);
    }

    updateComponent(component: SimulationObject): void {
        switch(component.type) {
            case SimulationObjectType.Activity:
                this.model.activities.set(component.id, component as Activity);
                break;
            // ... other types
        }
        this.eventEmitter.emit(ModelManagerEvent.ComponentUpdated, component);
    }

    removeComponent(componentId: string, type: SimulationObjectType): void {
        switch(type) {
            case SimulationObjectType.Activity:
                this.model.activities.delete(componentId);
                // Clean up related connectors
                this.cleanupActivityConnections(componentId);
                break;
            // ... other types
        }
        this.eventEmitter.emit(ModelManagerEvent.ComponentRemoved, { id: componentId, type });
    }
}
```

### 3.2 Component Retrieval
```typescript
class ModelManager {
    getComponentById<T extends SimulationObject>(id: string): T | undefined {
        // Search appropriate map in model based on type
        if (this.model.activities.has(id)) return this.model.activities.get(id) as T;
        if (this.model.resources.has(id)) return this.model.resources.get(id) as T;
        // ... check other maps
        return undefined;
    }

    getComponentsByType<T extends SimulationObject>(type: SimulationObjectType): T[] {
        switch(type) {
            case SimulationObjectType.Activity:
                return Array.from(this.model.activities.values()) as T[];
            // ... other types
        }
    }
}
```

## 4. Platform Integration

### 4.1 Storage Adapter Interface
```typescript
interface PlatformStorageAdapter {
    // Core storage operations
    setComponentData<T extends SimulationObject>(
        platformItem: PlatformItem, 
        component: T
    ): void;
    
    getComponentData<T extends SimulationObject>(
        platformItem: PlatformItem
    ): T | null;
    
    // Model operations
    setModelData(page: DiagramPage, model: Model): void;
    getModelData(page: DiagramPage): Model | null;
    isQuodsiModel(page: DiagramPage): boolean;
}
```

### 4.2 Platform-Specific Implementations
```typescript
class LucidChartAdapter implements PlatformStorageAdapter {
    private static readonly MODEL_KEY = 'quodsi_model';
    private static readonly COMPONENT_KEY = 'quodsi_component';

    setComponentData<T extends SimulationObject>(
        item: BlockProxy | LineProxy, 
        component: T
    ): void {
        item.shapeData.set(
            LucidChartAdapter.COMPONENT_KEY, 
            JSON.stringify(component)
        );
    }
    
    // ... other implementation details
}
```

## 5. Events and Messaging

### 5.1 Event Types
```typescript
enum ModelManagerEvent {
    ComponentAdded = 'componentAdded',
    ComponentUpdated = 'componentUpdated',
    ComponentRemoved = 'componentRemoved',
    ModelValidated = 'modelValidated',
    StorageUpdated = 'storageUpdated'
}

interface ComponentEvent {
    component: SimulationObject;
    type: SimulationObjectType;
}
```

### 5.2 Event Handling
```typescript
class ModelManager {
    on(event: ModelManagerEvent, handler: (data: any) => void): void;
    off(event: ModelManagerEvent, handler: (data: any) => void): void;
    emit(event: ModelManagerEvent, data: any): void;
}
```

## 6. Model Versioning

### 6.1 Version Control
```typescript
interface ModelVersion {
    version: string;
    minComponentVersion: string;
    features: ModelFeatures;
}

interface ModelFeatures {
    supportsMultiPage: boolean;
    supportsSubmodels: boolean;
    supportedComponentTypes: SimulationObjectType[];
}

class ModelVersionManager {
    validateVersion(model: Model): boolean;
    upgradeModel(model: Model, targetVersion: string): Model;
    getFeatures(version: string): ModelFeatures;
}
```

## 7. Validation

### 7.1 Validation Types
```typescript
interface ValidationResult {
    isValid: boolean;
    messages: ValidationMessage[];
}

interface ValidationMessage {
    type: 'error' | 'warning' | 'info';
    message: string;
    componentId?: string;
}
```

### 7.2 Validation Implementation
```typescript
class ModelValidator {
    validateModel(model: Model): ValidationResult;
    validateComponent(component: SimulationObject): ValidationMessage[];
    validateRelationships(): ValidationMessage[];
}
```

## 8. Error Handling

### 8.1 Error Types
```typescript
enum ModelManagerError {
    INVALID_COMPONENT = 'invalid_component',
    STORAGE_ERROR = 'storage_error',
    VALIDATION_ERROR = 'validation_error',
    PLATFORM_ERROR = 'platform_error',
    SERIALIZATION_ERROR = 'serialization_error'
}

interface ErrorDetails {
    code: ModelManagerError;
    message: string;
    componentId?: string;
    details?: any;
}
```

## 9. QuodSim Integration

### 9.1 Model Serialization
```typescript
interface QuodSimModel {
    // Model configuration
    reps: number;
    seed: number;
    one_clock_unit: number;
    simulation_time_type: number;
    
    // Components
    entities: EntityDefinition[];
    resources: ResourceDefinition[];
    activities: ActivityDefinition[];
    generators: GeneratorDefinition[];
}

class ModelSerializer {
    toQuodSimModel(model: Model): QuodSimModel;
    fromQuodSimModel(quodSimModel: QuodSimModel): Model;
}
```

## 10. Future Considerations

### 10.1 Platform Support
- MIRO integration
- Canva integration
- Common abstraction layer
- Platform-specific optimizations

### 10.2 Feature Roadmap
- Multi-page models
- Component versioning
- Enhanced validation rules
- Real-time collaboration
- Advanced simulation capabilities
