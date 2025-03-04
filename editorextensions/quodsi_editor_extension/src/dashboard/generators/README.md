# Table Generators

This directory contains specialized generator classes for creating different types of simulation result tables in LucidChart.

## Overview

The table generators provide a structured approach to transforming simulation data into visual tables within LucidChart. The implementation follows the Strategy Pattern, with specialized generators for each table type inheriting from a common base class.

## Directory Structure

```
generators/
├── ActivityRepSummaryTableGenerator.ts  # Generator for activity replication summary tables
├── ActivityTimingTableGenerator.ts      # Generator for activity timing tables
├── ActivityUtilizationTableGenerator.ts # Generator for activity utilization tables
├── BaseTableGenerator.ts                # Abstract base class with common functionality
├── EntityStateTableGenerator.ts         # Generator for entity state tables
├── EntityThroughputTableGenerator.ts    # Generator for entity throughput tables
├── ResourceUtilizationTableGenerator.ts # Generator for resource utilization tables
├── TableGeneratorFactory.ts             # Factory for creating appropriate generators
└── index.ts                             # Exports all generators and the factory
```

## Architecture

The table generator architecture follows these design patterns:

1. **Strategy Pattern**: Each table type has its own specialized generator that implements a common interface.
2. **Factory Pattern**: A factory class creates the appropriate generator based on the requested table type.
3. **Template Method Pattern**: The base class defines the overall algorithm, while subclasses override specific steps.

## Key Components

### BaseTableGenerator

The `BaseTableGenerator` provides common functionality for all table generators, including:

- Methods for creating columns from schema definitions
- Value formatting for percentages and numbers
- Table creation and layout logic
- Sorting and filtering columns

### Specialized Generators

Each specialized generator implements:

- `getTableType()`: Returns the unique identifier for this table type
- `getSchemaMapping()`: Provides mapping information for the schema
- `getData()`: Retrieves the appropriate data from the SimulationResultsReader
- `getDefaultTitle()`: Returns the default title for this table type

### TableGeneratorFactory

The factory creates and returns the appropriate generator based on the table type:

```typescript
const factory = new TableGeneratorFactory(resultsReader, config);
const generator = factory.getGenerator('activity_utilization');
```

## Usage

### Basic Usage

```typescript
import { EditorClient } from 'lucid-extension-sdk';
import { SimulationResultsReader } from '../../data_sources/simulation_results';
import { ActivityUtilizationTableGenerator } from './generators';

async function createUtilizationTable(page) {
  const client = new EditorClient();
  const reader = new SimulationResultsReader(client);
  
  // Create a specialized generator
  const generator = new ActivityUtilizationTableGenerator(reader);
  
  // Generate the table
  const table = await generator.createTable(page, client);
  
  return table;
}
```

### Using the Factory

```typescript
import { TableGeneratorFactory } from './generators';

async function createTable(tableType, page, client) {
  const reader = new SimulationResultsReader(client);
  const factory = new TableGeneratorFactory(reader);
  
  // Get the appropriate generator
  const generator = factory.getGenerator(tableType);
  
  // Generate the table
  return generator.createTable(page, client);
}
```

### With Configuration

```typescript
const config = {
  formatNumbers: true,
  percentDecimals: 1,
  numberDecimals: 2,
  styleHeader: true,
  dynamicColumns: true,
  maxColumns: 6,
  columnOrder: ['Name', 'utilization_mean', 'utilization_max']
};

const generator = new ActivityUtilizationTableGenerator(reader, config);
const table = await generator.createTable(page, client);
```

## Integration with DynamicSimulationResultsTableGenerator

The `DynamicSimulationResultsTableGenerator` class (located in the dashboard directory) serves as a backward-compatible wrapper around the specialized generators, maintaining the original public API while leveraging the new generator structure internally.

```typescript
import { DynamicSimulationResultsTableGenerator } from '../DynamicSimulationResultsTableGenerator';

// Create the wrapper generator
const generator = new DynamicSimulationResultsTableGenerator(reader);

// Use the original API
const table = await generator.createActivityUtilizationTable(page, client);
```

## Extending

To add a new table type:

1. Create a new generator class that extends `BaseTableGenerator`
2. Implement the required abstract methods
3. Register the new generator in `TableGeneratorFactory`
4. Add a method to `DynamicSimulationResultsTableGenerator` for backward compatibility (if needed)
