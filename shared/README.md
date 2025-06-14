# Quodsi Shared Library

## Overview

The Quodsi Shared Library provides core functionality, types, and utilities used across all Quodsi components. This package serves as the foundation for the Quodsi simulation ecosystem, ensuring consistency and interoperability between the LucidChart extension, React UI, and Python simulation engine.

## Key Components

The shared library consists of several key modules:

### 1. Type System (`src/types`)

Contains the core domain model for the Quodsi simulation system, including:

- `elements`: Fundamental simulation building blocks (Activity, Entity, Resource, etc.)
- `validation`: Types for model validation and error handling
- `common`: Shared utility types used throughout the system

[→ Read the Elements Documentation](./src/types/elements/README.md)

### 2. Validation (`src/validation`)

A comprehensive validation system that ensures simulation models are correctly structured:

- Validates model completeness and correctness
- Provides detailed error and warning messages
- Enforces relationships between components

[→ Read the Validation Documentation](./src/validation/README.md)

### 3. Serialization (`src/serialization`)

A versioned serialization system for converting models to/from JSON:

- Supports multiple schema versions
- Ensures backward compatibility
- Handles model serialization for storage and transmission

[→ Read the Serialization Documentation](./src/serialization/README.md)

### 4. Messaging Protocol (`src/quodsi-messaging`)

Defines the standardized communication protocol between components:

- Structured messaging with type safety
- Handles communication between LucidChart extension and React panels
- Manages event handling and state synchronization

[→ Read the Messaging Documentation](./src/quodsi-messaging/README.md)

### 5. Platform Abstraction (`src/platform`)

Provides platform-agnostic interfaces for different diagramming tools:

- Abstracts platform-specific implementations
- Enables support for different diagramming platforms
- Maintains separation between platform and simulation concerns

[→ Read the Platform Documentation](./src/platform/README.md)

## Usage

### Installation

```bash
npm install --save @quodsi/shared
```

### Basic Usage

```typescript
import { 
  ModelDefinition, 
  Activity, 
  Entity, 
  Model, 
  ModelValidationService,
  ModelSerializerFactory 
} from '@quodsi/shared';

// Create a model
const model = Model.createDefault('model-1');
model.name = 'My Simulation Model';

// Initialize model definition
const modelDefinition = new ModelDefinition(model);

// Add simulation components
const entity = new Entity('entity-1', 'Customer');
modelDefinition.entities.add(entity);

const activity = Activity.createDefault('activity-1');
activity.name = 'Service';
modelDefinition.activities.add(activity);

// Validate the model
const validationService = new ModelValidationService();
const validationResult = validationService.validate(modelDefinition);

if (validationResult.isValid) {
  // Serialize the model
  const serializer = ModelSerializerFactory.create(modelDefinition);
  const serializedModel = serializer.serialize(modelDefinition);
  
  // Use the serialized model (e.g., send to simulation engine)
  console.log(JSON.stringify(serializedModel, null, 2));
}
```

## Architecture

The shared library follows a modular architecture with clear separation of concerns:

```
┌────────────────────┐
│  Type System       │
│  (Domain Model)    │
└────────┬───────────┘
         │
         ▼
┌────────────────────┐      ┌────────────────────┐
│                    │      │                    │
│  Validation        │◄────►│  Serialization     │
│                    │      │                    │
└────────┬───────────┘      └────────┬───────────┘
         │                           │
         │                           │
         ▼                           ▼
┌────────────────────┐      ┌────────────────────┐
│                    │      │                    │
│  Messaging         │◄────►│  Platform          │
│  Protocol          │      │  Abstraction       │
│                    │      │                    │
└────────────────────┘      └────────────────────┘
```

## Contributing

When contributing to the shared library, follow these guidelines:

1. **Maintain Backwards Compatibility**: Changes should not break existing code
2. **Versioning**: Update version numbers following semantic versioning
3. **Testing**: Add tests for new functionality and ensure all tests pass
4. **Documentation**: Update relevant documentation when making changes
5. **Code Style**: Follow established TypeScript coding conventions

## Testing

The library includes comprehensive tests for all components:

```bash
# Run all tests
npm test

# Run tests for a specific module
npm test -- --testPathPattern=serialization
```

## Dependencies

The shared library has minimal external dependencies to ensure lightweight integration across different components of the Quodsi ecosystem.

## License

[MIT License](./LICENSE)
