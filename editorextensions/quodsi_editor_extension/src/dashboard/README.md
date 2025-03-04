# Dashboard Module

This module provides a modular and extensible system for creating dashboards with simulation results in LucidChart.

## Overview

The Dashboard module is responsible for generating comprehensive visualization dashboards for simulation results. It creates a new page in the LucidChart document and populates it with tables showing different aspects of the simulation data.

## Key Components

### Main Class

- **SimulationResultsDashboard**: Coordinates the overall dashboard creation process.

### Supporting Components

- **DashboardLayoutManager**: Manages page creation and table positioning.
- **DashboardConfigManager**: Handles configuration merging and access.
- **DashboardTableFactory**: Creates and manages table handler instances.

### Table Generation

- **DynamicSimulationResultsTableGenerator**: Wrapper class that provides backward compatibility with the original table generator.
- **generators/**: Directory containing specialized table generator classes (see [generators/README.md](./generators/README.md) for details).
  - **BaseTableGenerator**: Abstract base class for all table generators.
  - **Specialized Generators**: Concrete implementations for each table type.
  - **TableGeneratorFactory**: Factory for creating the appropriate generator.

### Table Handlers

- **BaseTableHandler**: Abstract base class for all table handlers.
- **ActivityUtilizationTableHandler**: Handles activity utilization tables.
- **ActivityRepSummaryTableHandler**: Handles activity replication summary tables.
- (Additional handlers for other table types)

## Directory Structure

```
dashboard/
├── DynamicSimulationResultsTableGenerator.ts  # Backward-compatible wrapper
├── SimulationResultsDashboard.ts              # Main dashboard class
├── factory/                                   # Dashboard component factories
├── generators/                                # Table generators (refactored)
│   ├── BaseTableGenerator.ts                  # Abstract base generator
│   ├── ActivityUtilizationTableGenerator.ts   # Specialized generators
│   ├── ...                                    # Other specialized generators
│   └── TableGeneratorFactory.ts               # Factory for creating generators
├── handlers/                                  # Table handlers
├── interfaces/                                # Type definitions
│   ├── DashboardTypes.ts                      # Dashboard-related types
│   └── GeneratorTypes.ts                      # Generator-related types
├── layout/                                    # Layout management
└── utils/                                     # Utility functions
```

## Usage

### Basic Usage

```typescript
import { EditorClient } from 'lucid-extension-sdk';
import { SimulationResultsDashboard } from './dashboard';

// Create dashboard generator
const client = new EditorClient();
const dashboard = new SimulationResultsDashboard(client);

// Create dashboard with default settings
try {
  const result = await dashboard.createDashboard('Simulation Results');
  console.log(`Created dashboard with ${result.tables.length} tables`);
} catch (error) {
  console.error('Error creating dashboard:', error);
}
```

### With Custom Configuration

```typescript
import { SimulationResultsDashboard, DashboardConfig } from './dashboard';

// Custom configuration
const config: DashboardConfig = {
  title: 'Performance Dashboard',
  tableSpacing: 30,
  includedDataTypes: {
    activityUtilization: true,
    activityRepSummary: true,
    // Only include these two table types
    activityTiming: false,
    entityThroughput: false,
    resourceRepSummary: false,
    entityState: false
  }
};

// Create dashboard with custom config
const dashboard = new SimulationResultsDashboard(client, config);
const result = await dashboard.createDashboard('Performance Dashboard');
```

### Using Table Generators Directly

```typescript
import { EditorClient } from 'lucid-extension-sdk';
import { SimulationResultsReader } from '../data_sources/simulation_results';
import { ActivityUtilizationTableGenerator } from './generators';

// Create a specific table
const client = new EditorClient();
const reader = new SimulationResultsReader(client);
const generator = new ActivityUtilizationTableGenerator(reader);

// Get the current page
const viewport = new Viewport(client);
const page = viewport.getCurrentPage();

// Generate the table
const table = await generator.createTable(page, client);
```

## Extending with Custom Table Types

To add support for a new table type:

1. Create a new generator class in the generators directory:

```typescript
import { BaseTableGenerator } from './BaseTableGenerator';
import { SchemaMapping } from '../interfaces/GeneratorTypes';
import { CustomDataSchema } from '../../data_sources/simulation_results/schemas';

export class CustomTableGenerator extends BaseTableGenerator {
  getTableType(): string {
    return 'custom_table';
  }
  
  getSchemaMapping(): SchemaMapping {
    return {
      schema: CustomDataSchema,
      identifierFields: ['id', 'name'],
      percentageFields: ['completion_rate'],
      priorityFields: ['name', 'completion_rate', 'value']
    };
  }
  
  async getData(): Promise<any[]> {
    return this.resultsReader.getCustomData();
  }
  
  getDefaultTitle(): string {
    return 'Custom Data';
  }
}
```

2. Add the generator to the TableGeneratorFactory:

```typescript
// In TableGeneratorFactory.ts
import { CustomTableGenerator } from './CustomTableGenerator';

// Inside getGenerator method:
case 'custom_table':
  return new CustomTableGenerator(this.resultsReader, this.config);
```

3. Create a matching handler class:

```typescript
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/DashboardTypes';

export class CustomTableHandler extends BaseTableHandler {
  getTableType(): string {
    return 'custom_table';
  }
  
  getDefaultTitle(): string {
    return 'Custom Data';
  }
  
  async canCreateTable(): Promise<boolean> {
    const data = await this.resultsReader.getCustomData();
    return data && data.length > 0;
  }
  
  async createTable(page, position): Promise<TableCreationResult> {
    const config = this.getTableConfig(position);
    try {
      const table = await this.tableGenerator.createCustomTable(page, this.client, config);
      return this.createResult(table, !!table);
    } catch (error) {
      return this.createResult(null, false, error);
    }
  }
}
```

4. Register the handler in the DashboardTableFactory:

```typescript
// In DashboardTableFactory.ts, add to initializeHandlers method:
this.registerHandler(new CustomTableHandler(
  this.client,
  this.resultsReader,
  this.tableGenerator,
  this.config
));
```

5. Update the configuration interface:

```typescript
// In DashboardTypes.ts
export interface DashboardConfig {
  // ...
  includedDataTypes?: {
    // ...
    custom_table?: boolean;
  };
  // ...
}
```

## Architecture Benefits

- **Single Responsibility**: Each class has a clear, focused purpose
- **Extensibility**: Adding new table types is as simple as creating a new generator and handler
- **Testability**: Smaller components with clear responsibilities are easier to test
- **Maintainability**: Code is organized into logical, manageable pieces
- **Readability**: The main dashboard class is much clearer and easier to understand
