# Data Sources

This directory contains modules for accessing and working with data sources available in LucidChart documents, particularly simulation results data from the Quodsi simulation engine.

## Overview

The data sources framework provides a structured way to access data collections stored within LucidChart documents. These collections are created by the Quodsi data connector when simulation results are imported into the document.

> **Note:** As part of a recent refactoring, the table generation functionality that was previously in this module has been moved to the `dashboard/generators/` directory. The data sources module now focuses exclusively on data access.

## Directory Structure

```
data_sources/
├── base/                      # Base classes and shared utilities
│   └── DataSourceReader.ts    # Abstract base class for data source readers
├── examples/                  # Usage examples
│   └── SimulationResultsExample.ts  # Examples of using the simulation results reader
├── simulation_results/        # Simulation results specific implementation
│   ├── models/                # Type definitions for simulation data
│   │   ├── ActivityUtilization.ts  # Activity utilization data model
│   │   └── index.ts           # Exports all model interfaces
│   ├── schemas/               # Schema definitions for simulation data
│   ├── index.ts               # Exports the SimulationResultsReader
│   └── SimulationResultsReader.ts  # Reader for simulation results data
└── index.ts                   # Exports all data source readers
```

## Usage

### Basic Usage

```typescript
import { EditorClient } from 'lucid-extension-sdk';
import { SimulationResultsReader } from './data_sources';

// Create the client and reader
const client = new EditorClient();
const resultsReader = new SimulationResultsReader(client);

// Check if simulation results exist
const hasResults = await resultsReader.hasSimulationResults();

// Get activity utilization data
const activityUtilizationData = await resultsReader.getActivityUtilizationData();

// Work with the data
activityUtilizationData.forEach(activity => {
  console.log(`Activity: ${activity.Name}, Utilization: ${activity.utilization_mean}`);
});
```

### Available Data Collections

The following data collections are available from the simulation results:

- `Models` - Basic model metadata linking document, page, and user IDs
- `activity_utilization` - Utilization metrics for activities
- `activity_rep_summary` - Summary metrics for activities across replications
- `activity_timing` - Timing metrics for activities
- `entity_state_rep_summary` - Entity state metrics across replications
- `entity_throughput_rep_summary` - Entity throughput metrics across replications
- `resource_rep_summary` - Resource utilization metrics
- `complete_activity_metrics` - Comprehensive activity metrics
- `custom_metrics` - User-defined metrics from the simulation

## Technical Notes

### Working with MapProxy

The Lucid SDK uses `MapProxy` rather than standard JavaScript `Map` objects. When working with these collections, remember:

- Use `for...of` loops for iteration: `for (const [key, value] of mapProxy) { ... }`
- Use `get(key)` to access values: `mapProxy.get('someKey')`
- Use `keys()` to get all keys: `mapProxy.keys()`
- Use `size` to get the number of items: `mapProxy.size`

### Common Patterns

1. **Check if collection exists:**
```typescript
const collection = await resultsReader.getActivityUtilization();
if (!collection) {
  console.log('No activity utilization data available');
  return;
}
```

2. **Convert to strongly typed objects:**
```typescript
const results = [];
for (const [_, item] of collection.items) {
  results.push(mapToActivityUtilization(item.fields));
}
```

3. **Access specific items by ID:**
```typescript
const activityItem = collection.items.get(activityId);
```

## Architecture

This module follows these design principles:

1. **Separation of Concerns** - Each reader focuses on a specific data source
2. **Type Safety** - Strongly typed interfaces for all data models
3. **Abstraction** - Common functionality is extracted to base classes
4. **Extensibility** - Easy to add new data sources and models

## Relationship to Dashboard Module

The data_sources module provides the raw data access layer that the dashboard module builds upon:

```typescript
// Example of how dashboard uses data sources
import { SimulationResultsReader } from '../data_sources/simulation_results';
import { ActivityUtilizationTableGenerator } from '../dashboard/generators';

// Data access layer
const reader = new SimulationResultsReader(client);

// Visualization layer that consumes the data
const generator = new ActivityUtilizationTableGenerator(reader);
const table = await generator.createTable(page, client);
```

For table generation functionality that was previously in this module, refer to:
- `dashboard/DynamicSimulationResultsTableGenerator.ts` - Backward-compatible wrapper
- `dashboard/generators/` - Specialized table generators
- `dashboard/REFACTORING_GUIDE.md` - Guide to the recent refactoring

## Extending

To add a new data source:

1. Create a new directory under `data_sources/`
2. Create a reader class extending `DataSourceReader`
3. Define models for the data in the source
4. Export the new reader in the root `index.ts`
