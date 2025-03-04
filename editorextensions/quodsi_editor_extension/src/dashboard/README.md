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

### Table Handlers

- **BaseTableHandler**: Abstract base class for all table handlers.
- **ActivityUtilizationTableHandler**: Handles activity utilization tables.
- **ActivityRepSummaryTableHandler**: Handles activity replication summary tables.
- (Additional handlers for other table types)

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

## Extending with Custom Table Types

To add support for a new table type:

1. Create a new handler class:

```typescript
import { PageProxy } from 'lucid-extension-sdk';
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/DashboardTypes';

export class MyCustomTableHandler extends BaseTableHandler {
  getTableType(): string {
    return 'myCustomTable';
  }
  
  getDefaultTitle(): string {
    return 'My Custom Table';
  }
  
  async canCreateTable(): Promise<boolean> {
    // Check if data is available
    const data = await this.resultsReader.getMyCustomData();
    return data && data.length > 0;
  }
  
  async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
    // Implementation details...
  }
}
```

2. Register the handler in the factory:

```typescript
// In DashboardTableFactory.ts, add to initializeHandlers method:
this.registerHandler(new MyCustomTableHandler(
  this.client,
  this.resultsReader,
  this.tableGenerator,
  this.config
));
```

3. Update the configuration interface:

```typescript
// In DashboardTypes.ts
export interface DashboardConfig {
  // ...
  includedDataTypes?: {
    // ...
    myCustomTable?: boolean;
  };
  // ...
}
```

## Architecture Benefits

- **Single Responsibility**: Each class has a clear, focused purpose
- **Extensibility**: Adding new table types is as simple as creating a new handler class
- **Testability**: Smaller components with clear responsibilities are easier to test
- **Maintainability**: Code is organized into logical, manageable pieces
- **Readability**: The main dashboard class is much clearer and easier to understand
