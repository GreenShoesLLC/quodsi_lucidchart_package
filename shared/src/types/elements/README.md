# Quodsi Model Elements

This directory contains the core domain model for the Quodsi simulation system. These elements represent the fundamental building blocks that make up a simulation model.

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [ModelDefinition](#modeldefinition)
- [Element Types](#element-types)
- [List Managers](#list-managers)
- [Enumerations](#enumerations)
- [Integration with LucidChart](#integration-with-lucidchart)
- [Validation](#validation)
- [Usage Examples](#usage-examples)

## Overview

The elements directory defines the type system for Quodsi simulation models. These types are platform-agnostic and can be used in various contexts, including the LucidChart extension, simulation engine, and API integrations.

The core of the system is the `ModelDefinition` class, which serves as the container for all simulation elements and their relationships.

## Core Components

The main components of the model system are:

- **ModelDefinition**: Container for all simulation objects
- **Model**: Core simulation settings and properties
- **Activities**: Operations that process entities
- **Entities**: Objects that flow through the system
- **Resources**: Items required by activities
- **Generators**: Create entities in the simulation
- **Connectors**: Define relationships between objects

## ModelDefinition

`ModelDefinition` is the central class that manages all simulation components. It maintains collections of simulation objects and provides methods for accessing and manipulating them.

```typescript
class ModelDefinition {
    public readonly activities: ActivityListManager;
    public readonly connectors: ConnectorListManager;
    public readonly resources: ResourceListManager;
    public readonly generators: GeneratorListManager;
    public readonly entities: EntityListManager;
    public readonly resourceRequirements: ResourceRequirementListManager;

    constructor(public readonly model: Model) {
        // Initialize list managers
        // Add default entities
    }
}
```

The `ModelDefinition` serves as the root object for serialization, validation, and simulation execution.

## Element Types

### Model

`Model` contains global simulation settings:

- Simulation duration and time settings
- Warmup period configuration
- Random seed settings
- Run configuration

### Activities

`Activity` represents a process or operation in the simulation:

- Capacity settings
- Buffer configurations
- Operation steps
- Resource requirements

Activities process entities and may require resources to operate.

### Entities

`Entity` represents objects that flow through the simulation:

- Basic properties
- Type information
- Tracking data

Entities are created by generators and processed by activities.

### Resources

`Resource` represents items required by activities:

- Capacity settings
- Availability configuration
- Usage statistics

Resources can be allocated to activities through resource requirements.

### Generators

`Generator` controls the creation of entities:

- Entity creation pattern
- Timing configuration
- Maximum entity limits
- Distribution settings

### Connectors

`Connector` defines relationships between simulation objects:

- Source and target objects
- Connection type
- Probability settings
- Operation steps

### Resource Requirements

`ResourceRequirement` defines resource needs for activities:

- Required resources
- Request priority
- Resource allocation rules
- Complex requirement structures using clauses

## List Managers

Each element type has a corresponding list manager that provides:

- Type-safe collection management
- CRUD operations
- Search and filter capabilities
- List integrity enforcement

Example:
```typescript
class ActivityListManager extends ComponentListManager<Activity> {
    // Specialized methods for activity management
}
```

## Enumerations

The system includes several enumerations to ensure type safety:

- **SimulationObjectType**: Defines the types of simulation objects
- **DurationType**: Specifies types of duration calculations
- **PeriodUnit**: Defines time units for durations
- **Distribution**: Specifies statistical distributions
- **ConnectType**: Defines types of connections between objects
- **RequirementMode**: Specifies modes for resource requirements
- **SimulationTimeType**: Defines simulation time modes

## Integration with LucidChart

While these elements are platform-agnostic, they integrate with LucidChart through:

- `ModelDefinitionPageBuilder`: Constructs a ModelDefinition from LucidChart elements
- `LucidElementFactory`: Creates platform-specific implementations of elements

For more details on LucidChart integration, see:
- `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\types\README.md`
- `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\platform\README.md`

## Validation

Model validation is handled by `ModelValidationService`, which:

- Validates the entire ModelDefinition
- Checks individual elements for correctness
- Enforces relationships between elements
- Provides detailed validation results

The validation rules can be found in:
`C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\validation\rules`

## Usage Examples

### Creating a Basic Model

```typescript
import { Model, ModelDefinition, Activity, Entity, Generator } from 'shared/src/types/elements';

// Create a model
const model = new Model('model-1', 'My Simulation Model');
const modelDefinition = new ModelDefinition(model);

// Add an entity
const customEntity = new Entity('entity-1', 'Customer');
modelDefinition.entities.add(customEntity);

// Add an activity
const activity = new Activity('activity-1', 'Process Order');
activity.inputBufferCapacity = 10;
activity.capacity = 5;
modelDefinition.activities.add(activity);

// Add a generator
const generator = new Generator('generator-1', 'Customer Arrivals');
generator.entityId = customEntity.id;
generator.entitiesPerCreation = 1;
modelDefinition.generators.add(generator);

// Add a connector
const connector = new Connector('connector-1', '');
connector.sourceId = generator.id;
connector.targetId = activity.id;
modelDefinition.connectors.add(connector);
```

### Accessing Elements

```typescript
// Find an activity by ID
const activity = modelDefinition.activities.get('activity-1');

// Get all resources
const allResources = modelDefinition.resources.getAll();

// Check if a connector exists
const hasConnector = modelDefinition.connectors.has('connector-1');

// Remove an entity
modelDefinition.entities.remove('entity-1');
```

### Working with Resource Requirements

```typescript
// Create a resource requirement
const requirement = new ResourceRequirement('req-1', 'Processing Staff');

// Create a root clause
const rootClause = new RequirementClause('clause-1');
rootClause.mode = RequirementMode.ALL;

// Add a resource request
const request = new ResourceRequest('resource-1', 1);
rootClause.requests.push(request);

// Add the clause to the requirement
requirement.rootClauses.push(rootClause);

// Add to model
modelDefinition.resourceRequirements.add(requirement);
```

## Further Information

For more details on serialization, validation, and platform integration, refer to:

- Serialization: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\serialization\README.md`
- LucidChart Extension: `C:\_source\Greenshoes\quodsi_lucidchart_package\_docs\prompts\LucidChart Extension Panel Lifecycle Guide.md`
- Validation: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\validation\services\ModelValidationService.ts`
