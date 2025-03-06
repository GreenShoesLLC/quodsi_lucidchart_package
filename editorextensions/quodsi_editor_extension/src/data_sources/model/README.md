# Quodsi Model Data Source

This directory contains the implementation of the Quodsi Model Data Source, which provides a structured way to store and access model definitions and model elements in LucidChart documents.

## Overview

The Model Data Source system uses LucidChart's data collections API to create and manage structured data associated with simulation models. It follows a repository pattern to provide a clean, abstract interface for storing and retrieving model data.

## Key Components

### ModelDataSource

`ModelDataSource` serves as the primary entry point and facade for all model data operations. It:

- Initializes the data storage system
- Provides access to repositories for different model data types
- Manages the lifecycle of data sources and collections

```typescript
// Example usage
const dataProxy = new DataProxy(client);
const modelDataSource = new ModelDataSource(dataProxy);

// Initialize it
await modelDataSource.initialize();

// Create a model definition
const modelDef = await modelDataSource.createModelDefinition(
    documentId, 
    pageId, 
    "Process Model"
);
```

### Repositories

The system uses specialized repository classes to manage different data types:

- **ModelDefinitionRepository**: Stores the registry of models within the system
- *(Future)* ActivityRepository, ResourceRepository, etc.

Each repository handles CRUD operations for its specific data type and manages the underlying LucidChart collections.

### Schemas

The data structure is defined through a set of schema definitions:

- **ModelDefinitionSchema**: Defines the structure for tracking model metadata
- **ModelSchema**: Defines simulation model parameters
- **ActivitySchema**, **ResourceSchema**, etc.: Define different simulation object types

These schemas map to collections in the LucidChart document, enabling structured data storage.

## Data Structure

### Model Definition

The central registry of models is maintained via the ModelDefinitionSchema with the following fields:

| Field       | Type   | Description                                |
|-------------|--------|--------------------------------------------|
| id          | string | Unique identifier (documentId_pageId)      |
| documentId  | string | LucidChart document identifier            |
| pageId      | string | LucidChart page identifier                |
| name        | string | Human-readable model name                  |
| createdAt   | string | Creation timestamp                         |
| updatedAt   | string | Last update timestamp                      |
| version     | string | Model schema version                       |

### Model Elements

Each model can contain multiple simulation object types:

- **Activities**: Processing steps in the simulation
- **Resources**: Elements that perform work or are consumed
- **Entities**: Items flowing through the simulation
- **Generators**: Sources of new entities
- **Connectors**: Links between simulation objects

Each of these has its own schema and repository for CRUD operations.

## Implementation Details

### Data Source Identification

The system uses a unique data source name `model_def` and specializes in finding data sources by their configuration type rather than just by name. This ensures robustness in the face of LucidChart's UUID-based internal data source identification.

### Collection Management

Collections are created on-demand when needed, with robust validation to ensure they're accessible and usable. The repositories implement various fallback mechanisms to handle edge cases like:

- Collections that appear to exist but are not accessible
- Data sources that change identifiers
- Timing issues with collection creation

### Data Lifecycle

Model data follows this lifecycle:

1. **Creation**: When a page is converted to a Quodsi model
2. **Access**: Throughout the modeling process as users interact with elements
3. **Update**: When model or element properties are changed
4. **Deletion**: When a model is removed from a page

## Future Directions

The repository-based approach enables gradual expansion of the data model, including:

- Scenario management: Multiple simulation scenarios per model
- Version tracking: Managing model versions and changes
- Reference data: Storing simulation parameters and reference values
- Cross-model linking: Enabling relationships between models
