# Simulation Results

This directory contains components for reading and working with Quodsi simulation results data from within the LucidChart editor extension.

## Purpose

The simulation results reader and models provide:

1. Type-safe access to simulation data imported by the data connector
2. Mapping between raw collection data and strongly-typed TypeScript objects
3. Utility methods for querying specific types of simulation metrics
4. Abstractions to handle the complexities of the LucidChart data API

## Architecture

This module consists of two main components:

1. **SimulationResultsReader** - A class that extends `DataSourceReader` to provide specific methods for reading Quodsi simulation data
2. **Models** - TypeScript interfaces and mapping functions that define the structure of simulation data

## Available Data Collections

The reader provides access to these simulation data collections:

| Collection Name | Description |
|-----------------|-------------|
| `Models` | Basic model metadata linking document, page, and user IDs |
| `activity_utilization` | Utilization metrics for activities including mean/max/std dev values for utilization, capacity, contents, and queue length |
| `activity_rep_summary` | Summarized metrics for activities across simulation replications |
| `activity_timing` | Timing-related metrics for activities (durations, delays, etc.) |
| `entity_state_rep_summary` | Entity state metrics across simulation replications |
| `entity_throughput_rep_summary` | Entity throughput metrics across replications |
| `resource_rep_summary` | Resource utilization and capacity metrics |
| `complete_activity_metrics` | A comprehensive set of activity metrics |
| `custom_metrics` | User-defined custom metrics from simulation outputs |

## Data Flow

The data flow between components works as follows:

1. Quodsi simulation engine generates CSV output files with simulation metrics
2. The data connector imports these files and creates collections in the LucidChart document
3. The SimulationResultsReader in this module reads data from those collections
4. Model interfaces and mapping functions convert raw data to strongly-typed objects
5. The extension UI components consume these objects to display visualizations and reports

## Usage

### Basic Example

```typescript
import { EditorClient } from 'lucid-extension-sdk';
import { SimulationResultsReader } from './data_sources/simulation_results';

async function displayActivityUtilization() {
  const client = new EditorClient();
  const reader = new SimulationResultsReader(client);
  
  // Get activity utilization data as strongly-typed objects
  const activityUtilizationData = await reader.getActivityUtilizationData();
  
  // Use the data (e.g., in a React component)
  activityUtilizationData.forEach(activity => {
    console.log(`Activity: ${activity.Name}`);
    console.log(`- Mean Utilization: ${activity.utilization_mean.toFixed(2)}%`);
    console.log(`- Max Queue Length: ${activity.queue_length_max}`);
  });
}
```

### Getting Model Information

```typescript
// Get info about the simulation model on the current page
const currentPage = viewport.getCurrentPage();
if (currentPage) {
  const modelData = await reader.getModelDataForPage(currentPage.id);
  if (modelData) {
    console.log(`Model for document ${modelData.documentId}, user ${modelData.userId}`);
  }
}
```

## Working with Lucid Data Collections

When working with data collections through the Lucid SDK:

1. Use the reader methods to get collections: `await reader.getActivityUtilizationCollection()`
2. Access individual items from the collection's items: `collection.items.get(itemId)`
3. Remember that `items` is a `MapProxy`, not a standard JavaScript `Map`
4. Iteration requires using `for...of` loops directly: `for (const [key, item] of collection.items) {...}`

## Extension Tips

- The reader methods return `null` when collections don't exist, so always check before accessing
- Collections will only exist after a simulation has been run and results imported
- Use the `hasSimulationResults()` method to check if any simulation data is available
- Model objects are plain JavaScript objects, so they can be stored in React state or passed to components

## Relationship to Data Connector

This module reads data created by the `quodsi_data_connector_lucidchart_v2` data connector. The schema definitions in the data connector and the model interfaces in this module should be kept in sync.
