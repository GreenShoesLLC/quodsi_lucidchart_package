# Quodsi Model Elements

This directory contains the core domain model for the Quodsi simulation system. These elements represent the fundamental building blocks that make up a simulation model in TypeScript, which are then serialized and deserialized into the Quodsim Python simulation engine.

## Table of Contents

- [Overview](#overview)
- [Core Components](#core-components)
- [ModelDefinition](#modeldefinition)
- [Element Types](#element-types)
  - [Model](#model)
  - [Activities](#activities)
  - [Entities](#entities)
  - [Resources](#resources)
  - [Generators](#generators)
  - [Connectors](#connectors)
  - [Resource Requirements](#resource-requirements)
- [List Managers](#list-managers)
- [Enumerations](#enumerations)
- [Serialization & Deserialization](#serialization--deserialization)
- [Integration with LucidChart](#integration-with-lucidchart)
- [Integration with Quodsim Python Engine](#integration-with-quodsim-python-engine)
- [Validation](#validation)
- [Usage Examples](#usage-examples)

## Overview

The elements directory defines the type system for Quodsi simulation models. These types are platform-agnostic and serve as the bridge between the UI (LucidChart extension) and the simulation engine (Quodsim Python). The types in this directory define the structure, relationships, and properties of a discrete event simulation model.

The architecture follows a clear separation of concerns:
1. UI representation (LucidChart extension)
2. Type definition (TypeScript elements)
3. Simulation execution (Quodsim Python engine)

## Core Components

The main components of the model system are:

- **ModelDefinition**: Container for all simulation objects
- **Model**: Core simulation settings and properties
- **Activities**: Operations that process entities
- **Entities**: Objects that flow through the system
- **Resources**: Items required by activities
- **Generators**: Create entities in the simulation
- **Connectors**: Define relationships between objects
- **ResourceRequirements**: Define complex resource allocation rules

## ModelDefinition

`ModelDefinition` is the central class that manages all simulation components. It serves as the root object for serialization, validation, and simulation execution.

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

The ModelDefinition maintains collections of simulation objects through specialized list managers, providing type-safe access and manipulation of the elements.

## Element Types

Each element implements the `SimulationObject` interface, providing a consistent way to identify and access objects:

```typescript
interface SimulationObject {
  id: string;
  name: string;
  type: SimulationObjectType;
}
```

### Model

`Model` contains global simulation settings:

- **Basic Configuration**:
  - `id`: Unique identifier
  - `name`: Model name
  - `reps`: Number of simulation replications
  - `forecastDays`: Future time horizon
  - `seed`: Random seed for reproducibility

- **Time Configuration** (two modes):
  - **Clock-based**: 
    - `oneClockUnit`: Base time unit (MINUTES, HOURS, etc.)
    - `warmupClockPeriod`: Initial warm-up period
    - `runClockPeriod`: Main simulation run period
  - **Calendar-based**:
    - `warmupDateTime`: Calendar-based warm-up time
    - `startDateTime`: Simulation start datetime
    - `finishDateTime`: Simulation end datetime

### Activities

`Activity` represents a process or operation in the simulation:

- `id`: Unique identifier
- `name`: Activity name
- `capacity`: Number of entities processable simultaneously
- `inputBufferCapacity`: Queue capacity before processing
- `outputBufferCapacity`: Queue capacity after processing
- `operationSteps`: List of processing steps with durations and resource requirements

Activities are the primary processing nodes in the simulation where entities spend time and consume resources.

### Entities

`Entity` represents objects that flow through the simulation:

- `id`: Unique identifier
- `name`: Entity name

Entities are created by generators, processed by activities, and follow paths defined by connectors. They can represent customers, products, documents, or any discrete item that flows through a system.

### Resources

`Resource` represents items required by activities:

- `id`: Unique identifier
- `name`: Resource name
- `capacity`: Number of available units

Resources can be allocated to activities through resource requirements and are critical for modeling constraints in systems where limited resources must be shared.

### Generators

`Generator` controls the creation of entities:

- `id`: Unique identifier
- `name`: Generator name
- `activityKeyId`: Target activity where entities are sent
- `entityId`: Type of entity to generate
- `periodicOccurrences`: Number of creation cycles
- `periodIntervalDuration`: Time between creation cycles
- `entitiesPerCreation`: Entities created per cycle
- `periodicStartDuration`: Delay before first creation
- `maxEntities`: Maximum entities to create

Generators introduce entities into the simulation according to specified patterns, which can be constant, random, or based on schedules.

### Connectors

`Connector` defines relationships between simulation objects:

- `id`: Unique identifier
- `name`: Connector name
- `sourceId`: Source object ID
- `targetId`: Target object ID
- `connectType`: Connection type (PROBABILITY, ATTRIBUTE_VALUE)
- `probability`: Likelihood of selecting this path

Connectors determine how entities flow between activities, creating the network structure of the simulation model.

### Resource Requirements

`ResourceRequirement` defines resource needs for activities:

- `id`: Unique identifier
- `name`: Requirement name
- `rootClauses`: List of requirement clauses

Resource requirements use a hierarchical structure of clauses and requests to model complex resource allocation rules:

- `RequirementClause`: Grouping of requests with logical operators (AND/OR)
- `ResourceRequest`: Request for a specific resource quantity
- `RequirementMode`: Logical mode for clause evaluation (REQUIRE_ALL, REQUIRE_ANY)

This structure supports complex expressions like: "(Operator AND Tool) OR Robot" or "Machine AND (Operator1 OR Operator2)".

## List Managers

Each element type has a corresponding list manager that extends `ComponentListManager<T>`:

```typescript
abstract class ComponentListManager<T extends SimulationObject> {
    protected items: Map<string, T>;
    
    add(item: T): void
    remove(id: string): void
    get(id: string): T | undefined
    getAll(): T[]
    // Additional methods...
}
```

Specialized list managers include:
- `ActivityListManager`
- `ConnectorListManager`
- `ResourceListManager`
- `GeneratorListManager`
- `EntityListManager`
- `ResourceRequirementListManager`

These provide type-safe collection management, CRUD operations, and list integrity enforcement.

## Enumerations

The system includes several enumerations to ensure type safety:

- `SimulationObjectType`: Types of simulation objects (Activity, Entity, Resource, etc.)
- `DurationType`: Types of duration calculations (CONSTANT, TRIANGULAR, NORMAL, etc.)
- `PeriodUnit`: Time units for durations (SECONDS, MINUTES, HOURS, DAYS, etc.)
- `DistributionType`: Statistical distributions for random values
- `ConnectType`: Connection types between objects (PROBABILITY, ATTRIBUTE_VALUE)
- `RequirementMode`: Modes for resource requirements (REQUIRE_ALL, REQUIRE_ANY)
- `SimulationTimeType`: Simulation time modes (CLOCK, CALENDAR)

## Serialization & Deserialization

The TypeScript model elements are designed to be serializable to JSON format for:
1. Storage within LucidChart diagrams
2. Transmission to the Python simulation engine
3. Persistence between sessions

The serialization process preserves the hierarchical structure and relationships between elements, enabling a complete model definition to be reconstructed from its serialized form.

## Integration with LucidChart

While these elements are platform-agnostic, they integrate with LucidChart through:

- `ModelDefinitionPageBuilder`: Constructs a ModelDefinition from LucidChart elements
- `LucidElementFactory`: Creates platform-specific implementations of elements

LucidChart diagrams contain Shapes, Blocks, and Lines (generically referred to as Elements), which can store custom data. Quodsi stores its model information inside the element's custom shape data capability.

The conversion process maps LucidChart visual elements to corresponding simulation objects:
- Shapes → Activities, Resources, Generators
- Lines → Connectors
- Custom Properties → Element attributes

For more details on LucidChart integration, see:
- `C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\types\README.md`
- `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\platform\README.md`

## Integration with Quodsim Python Engine

The TypeScript model elements correspond to Python dataclasses in the Quodsim engine:

| TypeScript Class | Python Dataclass |
|------------------|------------------|
| ModelDefinition | ModelDefinition |
| Model | ModelDef |
| Activity | ActivityDef |
| Entity | EntityDef |
| Resource | ResourceDef |
| Generator | GeneratorDef |
| Connector | ConnectorDef |
| ResourceRequirement | ResourceSetRequestDef |

The Python engine uses these dataclasses to execute the simulation, calculate statistics, and generate results.

The serialization format serves as the contract between the TypeScript UI components and the Python simulation engine, ensuring consistent behavior across the entire system.

## Validation

Model validation is handled by `ModelValidationService`, which:

- Validates the entire ModelDefinition
- Checks individual elements for correctness
- Enforces relationships between elements
- Provides detailed validation results

Validation occurs at multiple levels:
1. **Type-level validation**: Ensures properties have correct types and values
2. **Element-level validation**: Verifies individual elements meet their requirements
3. **Relationship validation**: Checks connections between elements are valid
4. **Model-level validation**: Ensures the overall model is coherent and executable

The validation rules can be found in:
`C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\validation\rules`

## Usage Examples

### Creating a Basic Model

```typescript
import { Model, ModelDefinition, Activity, Entity, Generator } from 'shared/src/types/elements';

// Create a model
const model = Model.createDefault('model-1');
model.name = 'Customer Service Process';
const modelDefinition = new ModelDefinition(model);

// Add a custom entity
const customer = new Entity('entity-1', 'Customer');
modelDefinition.entities.add(customer);

// Add an activity
const serviceActivity = Activity.createDefault('activity-1');
serviceActivity.name = 'Customer Service';
serviceActivity.capacity = 3;
serviceActivity.inputBufferCapacity = 10;
modelDefinition.activities.add(serviceActivity);

// Add a generator
const customerGenerator = Generator.createDefault('generator-1');
customerGenerator.name = 'Customer Arrivals';
customerGenerator.entityId = customer.id;
customerGenerator.activityKeyId = serviceActivity.id;
customerGenerator.entitiesPerCreation = 1;
modelDefinition.generators.add(customerGenerator);

// Add a connector
const connector = new Connector('connector-1', '');
connector.sourceId = customerGenerator.id;
connector.targetId = serviceActivity.id;
modelDefinition.connectors.add(connector);
```

### Working with Resource Requirements

```typescript
// Create a resource
const operator = new Resource('resource-1', 'Service Operator', 5);
modelDefinition.resources.add(operator);

// Create a resource requirement
const requirement = new ResourceRequirement('req-1', 'Service Staff');

// Create a root clause
const rootClause = new RequirementClause('clause-1');
rootClause.mode = RequirementMode.REQUIRE_ALL;

// Add a resource request
const request = new ResourceRequest(operator.id, 1);
rootClause.requests.push(request);

// Add the clause to the requirement
requirement.rootClauses.push(rootClause);

// Add to model
modelDefinition.resourceRequirements.add(requirement);

// Assign to an activity's operation step
const activity = modelDefinition.activities.get('activity-1');
if (activity && activity.operationSteps.length > 0) {
    activity.operationSteps[0].resourceRequirementId = requirement.id;
}
```

## Further Information

For more details on serialization, validation, and platform integration, refer to:

- Serialization: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\serialization`
- LucidChart Extension: `C:\_source\Greenshoes\quodsi_lucidchart_package\_docs\prompts\LucidChart Extension Panel Lifecycle Guide.md`
- Validation: `C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\validation\services\ModelValidationService.ts`
- Python Engine: `C:\_source\Greenshoes\quodsim\_docs\model-definition-docs.md`
