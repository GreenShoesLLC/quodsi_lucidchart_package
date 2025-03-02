# Quodsi Serialization System

The serialization module provides a robust, versioned system for converting `ModelDefinition` objects to JSON format for storage, transmission, and exchange. This document provides an overview of the system architecture, usage patterns, and extension mechanisms.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Versioning](#versioning)
- [Usage](#usage)
- [Error Handling](#error-handling)
- [Interfaces](#interfaces)
- [Extending the System](#extending-the-system)
- [Validation](#validation)
- [Examples](#examples)

## Overview

The serialization system is designed to:

1. Convert in-memory model definitions to standardized JSON format
2. Support versioned schemas to ensure backward compatibility
3. Validate models during serialization to ensure data integrity
4. Provide clear error messages for debugging and troubleshooting
5. Allow for extension with new schema versions in the future

## Architecture

The system follows a factory pattern with abstract base classes and interfaces:

```
serialization/
├── interfaces/          # Core interfaces for serialization
├── errors/              # Error hierarchy
├── utilities/           # Utility classes (EnumMapper, etc.)
├── v1/                  # Version 1.0 implementation
│   ├── interfaces/      # Version-specific interfaces
│   └── ModelDefinitionSerializerV1.ts
├── BaseModelDefinitionSerializer.ts  # Common serialization logic
├── ModelSerializerFactory.ts         # Factory for version selection
└── index.ts                          # Public exports
```

### Core Components

- **ModelSerializerFactory**: Creates the appropriate serializer for a given version
- **BaseModelDefinitionSerializer**: Abstract base class with common serialization logic
- **ModelDefinitionSerializerV1**: Concrete implementation for v1.0 schema
- **Interfaces**: Define the structure of serialized objects and the serializer contract
- **Error Handling**: Specialized error classes for different failure scenarios

## Versioning

The serialization system uses semantic versioning with major.minor version numbers:

- **Major Version**: Incompatible schema changes
- **Minor Version**: Backward-compatible schema enhancements

Each serializer implementation corresponds to a specific schema version, and the factory selects the appropriate serializer based on the requested version.

### Current Versions

- **1.0**: Initial release version

## Usage

Basic usage example:

```typescript
import { ModelSerializerFactory } from 'shared/src/serialization';

// Using the latest version (recommended)
const serializer = ModelSerializerFactory.create(modelDefinition);
const serializedModel = serializer.serialize(modelDefinition);

// Using a specific version
const version = { major: 1, minor: 0 };
const specificSerializer = ModelSerializerFactory.create(modelDefinition, version);
const serializedModel = specificSerializer.serialize(modelDefinition);

// Export as JSON string with formatting
const jsonString = JSON.stringify(serializedModel, null, 2);
```

### Integration with ModelPanel

The serialization system is integrated with ModelPanel for validation and export:

```typescript
// In ModelPanel.handleValidateModel():
if (validationResult.isValid) {
    try {
        const modelDefinition = await this.modelManager.getModelDefinition();
        if (modelDefinition) {
            const serializer = ModelSerializerFactory.create(modelDefinition);
            const serializedModel = serializer.serialize(modelDefinition);
            
            // Handle the serialized model (e.g., send to server, save to file)
            // ...
        }
    } catch (error) {
        // Handle errors
    }
}
```

## Error Handling

The system provides a rich error hierarchy for precise error handling:

- **SerializerError**: Base class for all serialization errors
- **UnsupportedVersionError**: Thrown when an unsupported version is requested
- **InvalidModelError**: Thrown when model validation fails
- **SerializationError**: Thrown during serialization process failures

Errors include detailed information about the component that failed and the reason for failure:

```typescript
try {
    const serializedModel = serializer.serialize(modelDefinition);
} catch (error) {
    if (error instanceof UnsupportedVersionError) {
        console.error('Version not supported:', error.message);
    } else if (error instanceof InvalidModelError) {
        console.error('Model validation failed:', error.message);
    } else if (error instanceof SerializationError) {
        console.error(`Failed to serialize ${error.component}:`, error.message);
    }
}
```

## Interfaces

The system defines interfaces for all serialized components, ensuring type safety:

- **ISerializedModel**: Root interface for the serialized model
- **ISerializedActivity**, **ISerializedEntity**, etc.: Component-specific interfaces
- **IModelDefinitionSerializer**: Interface for serializer implementations
- **ISchemaVersion**: Interface for version information

These interfaces are used both for type checking during development and for ensuring consistent structure in the output JSON.

## Extending the System

To add support for a new schema version:

1. Create a new version directory (e.g., `v2/`)
2. Define version-specific interfaces
3. Implement a new serializer class extending `BaseModelDefinitionSerializer`
4. Update `ModelSerializerFactory` to recognize and create the new version

Example for adding v2.0:

```typescript
// In v2/ModelDefinitionSerializerV2.ts
export class ModelDefinitionSerializerV2 extends BaseModelDefinitionSerializer {
    getVersion(): ISchemaVersion {
        return { major: 2, minor: 0, toString() { return '2.0'; } };
    }
    
    serialize(modelDefinition: ModelDefinition): ISerializedModelV2 {
        // V2-specific serialization logic
    }
}

// Update ModelSerializerFactory
private static readonly SUPPORTED_VERSIONS: SchemaVersion[] = [
    new SchemaVersion(1, 0),
    new SchemaVersion(2, 0)  // Add new version
];

// Add to create method
if (version.major === 2 && version.minor === 0) {
    return new ModelDefinitionSerializerV2();
}
```

## Validation

The serialization process includes validation to ensure data integrity:

1. **Base Validation**: Common validation rules in `BaseModelDefinitionSerializer`
2. **Version-Specific Validation**: Additional rules in version implementations
3. **Component Validation**: Each component is validated before serialization

Validation rules include:
- Required fields (id, name, etc.)
- Relationship integrity
- Value constraints
- Schema compliance

## Examples

### Basic Serialization

```typescript
import { ModelSerializerFactory } from 'shared/src/serialization';

// Get model definition from model manager
const modelDefinition = await modelManager.getModelDefinition();

// Create serializer and serialize
const serializer = ModelSerializerFactory.create(modelDefinition);
const serializedModel = serializer.serialize(modelDefinition);

// Convert to formatted JSON string
const jsonString = JSON.stringify(serializedModel, null, 2);

// Use the serialized model (e.g., download as file)
downloadJson(jsonString, 'model-definition.json');
```

### File Download Implementation

```typescript
function downloadJson(jsonString: string, filename: string): void {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
}
```

### Error Handling Example

```typescript
try {
    const serializer = ModelSerializerFactory.create(modelDefinition);
    const serializedModel = serializer.serialize(modelDefinition);
    console.log('Serialization successful', serializedModel);
} catch (error) {
    if (error instanceof UnsupportedVersionError) {
        console.error('Version not supported:', error.message);
        // Suggest using a supported version
    } else if (error instanceof InvalidModelError) {
        console.error('Model validation failed:', error.message);
        // Show validation error to user
    } else if (error instanceof SerializationError) {
        console.error(`Failed to serialize ${error.component}:`, error.message);
        // Log detailed error information
    } else {
        console.error('Unknown error during serialization:', error);
    }
}
```


### Testing
The serialization system includes comprehensive test cases to ensure reliability and correctness. These tests can be found in:
Copyshared/tests/serialization/
#### Test Categories
The test suite covers several aspects of the serialization system:

Unit Tests: Test individual components of the serialization system in isolation
Integration Tests: Test the interaction between multiple components
Validation Tests: Verify that invalid models are correctly identified and rejected
Version Tests: Ensure version selection and compatibility work as expected
Error Handling Tests: Verify that appropriate errors are thrown in failure scenarios

#### Running Tests
Tests can be run using the standard test runner:
bashCopynpm test -- --testPathPattern=serialization
To run specific test files:
bashCopynpm test -- shared/tests/serialization/ModelSerializerFactory.test.ts
#### Test Examples
The tests demonstrate various usage patterns and edge cases:

- Serializing minimal valid models
- Handling complex nested structures
- Testing boundary conditions
- Validating error cases
- Version compatibility checks

Developers can refer to these tests for usage examples and to understand expected behavior when extending the system.
#### Test Fixtures
Common test fixtures and helper functions are provided in:
Copyshared/tests/serialization/fixtures/
These fixtures include sample model definitions at various levels of complexity that can be used for testing or as reference implementations.



## Conclusion

The Quodsi serialization system provides a robust, extensible framework for model serialization with strong typing, validation, and versioning support. By following the patterns and examples provided in this document, developers can effectively utilize the system for model persistence and exchange.
