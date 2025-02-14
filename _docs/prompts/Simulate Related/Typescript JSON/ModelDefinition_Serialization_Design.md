# ModelDefinition Serialization Design Document

## Overview
This document outlines the design for implementing JSON serialization of the ModelDefinition class for use with the Discrete Event Simulation (DES) engine. The serialization process transforms ModelDefinition instances from the LucidChart extension into a structured JSON format that the Python-based DES engine can process.

## Background
- The system comprises a LucidChart extension written in TypeScript and a Python DES engine
- ModelDefinition represents a complex model with multiple interconnected components
- Current implementation requires transformation of ModelDefinition into a specific JSON structure
- The system is expected to evolve, requiring versioned serialization support

## Key Design Decisions

### 1. Architectural Approach
- Implement a dedicated serialization layer separate from model classes
- Use a factory pattern for managing serializer versions
- Decouple validation from serialization
- Maintain serialization interfaces for type safety and documentation

### 2. JSON Structure
- Root level contains metadata and model components
- ModelDefinition serves as the root container
- Metadata includes version and timestamp
- Connectors remain nested within activities for logical grouping
- Use camelCase for property naming convention

### 3. Versioning Strategy
- Implement semantic versioning (MAJOR.MINOR)
  - MAJOR: Breaking changes requiring DES engine updates
  - MINOR: Backward-compatible additions
- Version information stored in metadata
- Factory class manages version selection
- Each version implements its own serializer interface

### 4. Data Type Handling
- Enums: Serialize as strings for readability
- Implement EnumMapper utility for consistent enum serialization
- Dates: Use ISO string format
- Null values: Use standard JSON null

### 5. Error Handling
- Custom error hierarchy for specific error types
- Validation checking before serialization
- Version support validation
- Comprehensive error messages
- Factory-level error management

## Core Components

### Interfaces
```typescript
interface IModelDefinitionSerializerV1 {
    serialize(): IModelDefinitionV1;
}

interface ISerializedModelDefinitionV1 {
    metadata: {
        version: string;
        timestamp: string;
    };
    model: ISerializedModelV1;
    entities: ISerializedEntityV1[];
    activities: ISerializedActivityV1[];
    resources: ISerializedResourceV1[];
    generators: ISerializedGeneratorV1[];
    resourceRequirements: ISerializedResourceRequirementV1[];
}
```

### Factory
```typescript
class ModelSerializerFactory {
    static create(
        modelDefinition: ModelDefinition, 
        version?: ISchemaVersion
    ): IModelDefinitionSerializer;
    
    static getCurrentVersion(): ISchemaVersion;
    static isVersionSupported(version: ISchemaVersion): boolean;
    static getSupportedVersions(): ISchemaVersion[];
}
```

### Error Handling
```typescript
class SerializerError extends Error {}
class UnsupportedVersionError extends SerializerError {}
class InvalidModelError extends SerializerError {}
```

## Implementation Considerations

### Validation
- Rely on ModelDefinition's validateModel() for model validation
- Serializer assumes valid model state
- Throw InvalidModelError if attempting to serialize invalid model
- No additional validation during serialization process

### Version Management
- Factory maintains list of supported versions
- Each version has dedicated serializer implementation
- Clear upgrade path for version migrations
- Version compatibility checking before serialization

### Performance
- Typical model sizes are manageable:
  - 1-3 entities
  - 3-50 activities
  - 0-3 resources
  - 1-5 generators
  - 1-3 connectors between activities

## Project Structure and File Locations

### Core TypeScript Projects
1. quodsi_editor_extension (LucidChart Extension)
   - Path: `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension`
   - Key Files:
     - `src/panels/ModelPanel.ts` - Handles validation requests
     - `src/core/ModelManager.ts` - Contains ModelManager implementation

2. quodsi_shared (Shared Types and Models)
   - Path: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared`
   - Key Files:
     - `src/types/elements/`
       - `ModelDefinition.ts` - Core model definition class
       - `Model.ts` - Contains simulation configuration
       - `Activity.ts` - Activity definition
       - `Connector.ts` - Connector definition
       - `Entity.ts` - Entity definition
       - `Generator.ts` - Generator definition
       - `Resource.ts` - Resource definition
       - `ResourceRequirement.ts` - Resource requirement definition
       - `SimulationTimeType.ts` - Time type enums
       - Other supporting type definitions

### Python DES Engine
- Path: `C:\_source\Greenshoes\quodsim\quodsim`
- Example JSON: `C:\_source\Greenshoes\quodsim\tests\simulation_tests\files\model_testpageId_testUserId.json`

### Proposed New Files
The new serialization layer should be added to the shared project:

```
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\serialization\
├── interfaces/
│   ├── IModelDefinitionSerializer.ts
│   ├── ISerializedModel.ts
│   └── ISchemaVersion.ts
├── errors/
│   ├── SerializerError.ts
│   ├── UnsupportedVersionError.ts
│   └── InvalidModelError.ts
├── utilities/
│   └── EnumMapper.ts
├── v1/
│   ├── ModelDefinitionSerializerV1.ts
│   └── interfaces/
│       ├── ISerializedModelV1.ts
│       ├── ISerializedActivityV1.ts
│       └── [other v1 interfaces]
└── ModelSerializerFactory.ts
```

### Integration Points
1. Editor Extension Integration:
   ```typescript
   // ModelPanel.ts
   async handleValidateRequest(): Promise<void> {
       const validationResult = await this.modelManager.validateModel();
       if (validationResult.isValid) {
           const serializer = ModelSerializerFactory.create(this.modelManager.modelDefinition);
           const serializedModel = serializer.serialize();
           // Use serialized model in API call
       }
       this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
   }
   ```

2. DES Engine Integration:
   - The serialized JSON will be sent to the Python DES engine
   - Location of deserializer implementation to be determined in Python codebase

## Next Steps
1. Implement core interfaces
2. Develop EnumMapper utility
3. Create base serializer implementation
4. Implement error handling
5. Add factory with version 1.0 support
6. Develop comprehensive tests