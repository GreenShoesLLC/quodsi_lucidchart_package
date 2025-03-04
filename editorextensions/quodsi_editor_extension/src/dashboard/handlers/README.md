# Dashboard Table Handlers

This directory contains handler classes that create and manage specific table types for the Quodsi simulation results dashboard.

## Overview

Table handlers are responsible for creating and managing specific types of tables in the simulation results dashboard. Each handler class extends the `BaseTableHandler` and specializes in a particular type of simulation data. The handlers work together with the dashboard system to:

1. Determine if data is available for a specific table type
2. Generate tables with appropriate configuration
3. Handle positioning and layout within the dashboard
4. Provide meaningful error handling and logging

## Handler Structure

Each handler follows the same basic structure:

```typescript
export class SomeDataTypeTableHandler extends BaseTableHandler {
    // Returns the identifier string for this table type
    getTableType(): string {
        return 'someDataType';
    }
    
    // Returns a human-readable title for the table
    getDefaultTitle(): string {
        return 'Some Data Type';
    }
    
    // Checks if there's data available to create this table
    async canCreateTable(): Promise<boolean> {
        const data = await this.resultsReader.getSomeDataTypeData();
        return data && data.length > 0;
    }
    
    // Creates the table at the specified position
    async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
        // Implementation details...
    }
}
```

## Available Handlers

The following table handlers are currently implemented:

| Handler Class | Table Type | Data Source | Description |
|---------------|------------|-------------|-------------|
| ActivityUtilizationTableHandler | activityUtilization | activity_utilization | Shows utilization metrics for activities including capacity, contents, and queue length |
| ActivityRepSummaryTableHandler | activityRepSummary | activity_rep_summary | Shows summarized activity metrics across simulation replications |
| ActivityTimingTableHandler | activityTiming | activity_timing | Shows timing metrics like cycle time, service time, waiting time, and blocked time |
| EntityThroughputTableHandler | entityThroughput | entity_throughput_rep_summary | Shows entity throughput metrics across replications |
| EntityStateTableHandler | entityState | entity_state_rep_summary | Shows entity state metrics (waiting, blocked, in operation, etc.) |
| ResourceUtilizationTableHandler | resourceUtilization | resource_utilization | Shows resource utilization rates and capacity metrics |

## Adding a New Handler

To add a new table handler:

1. **Create a new handler class**:
   - Create a new file in this directory (e.g., `MyNewTableHandler.ts`)
   - Extend the `BaseTableHandler` class
   - Implement the required methods (getTableType, getDefaultTitle, canCreateTable, createTable)

2. **Ensure data access**:
   - Make sure the `SimulationResultsReader` has methods to access your data
   - Check if you need to add new model interfaces in the models directory

3. **Add table generation logic**:
   - Ensure the `DynamicSimulationResultsTableGenerator` has a method to create your table type
   - Add a schema mapping in the `initializeSchemaMapping` method with appropriate field configurations

4. **Update configuration**:
   - Add your table type to the `includedDataTypes` interface in `DashboardTypes.ts`
   - Add custom column configuration if needed in `DEFAULT_DASHBOARD_CONFIG`

5. **Register the handler**:
   - Import your handler in `DashboardTableFactory.ts`
   - Add it to the `initializeHandlers` method

## Example: Adding a New Handler

Here's a complete example of adding a new `CustomMetricsTableHandler`:

1. Create the handler file:

```typescript
// handlers/CustomMetricsTableHandler.ts
import { PageProxy } from 'lucid-extension-sdk';
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/DashboardTypes';

export class CustomMetricsTableHandler extends BaseTableHandler {
    getTableType(): string {
        return 'customMetrics';
    }
    
    getDefaultTitle(): string {
        return 'Custom Metrics';
    }
    
    async canCreateTable(): Promise<boolean> {
        const data = await this.resultsReader.getCustomMetricsData();
        return data && data.length > 0;
    }
    
    async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
        this.log(`Creating custom metrics table at position (${position.x}, ${position.y})`);
        
        try {
            const tableConfig = this.getTableConfig(position);
            const table = await this.tableGenerator.createCustomMetricsTable(
                page, 
                this.client, 
                tableConfig
            );
            
            if (!table) {
                this.log('No data available for custom metrics table', 'warn');
                return this.createResult(null, false);
            }
            
            this.log('Custom metrics table created successfully');
            return this.createResult(table, true);
        } catch (error) {
            this.log(`Error creating custom metrics table: ${error}`, 'error');
            return this.createResult(null, false, error);
        }
    }
}
```

2. Update the DashboardTableFactory:

```typescript
// In DashboardTableFactory.ts
import { CustomMetricsTableHandler } from '../handlers/CustomMetricsTableHandler';

// In the initializeHandlers method
this.registerHandler(new CustomMetricsTableHandler(
    this.client,
    this.resultsReader,
    this.tableGenerator,
    this.config
));
```

3. Update the DashboardTypes:

```typescript
// In DashboardTypes.ts, includedDataTypes interface
includedDataTypes?: {
    // existing types...
    customMetrics?: boolean;
};

// In DEFAULT_DASHBOARD_CONFIG
includedDataTypes: {
    // existing types...
    customMetrics: true
},
customColumnConfig: {
    // existing configs...
    customMetrics: {
        columnOrder: [
            'metric_name',
            'value',
            'unit'
        ]
    }
}
```

## Handling Common Issues

### No Data Available

Handlers should gracefully handle cases where no data is available by:

1. Using the `canCreateTable()` method to check for data availability
2. Returning `null` and a `success: false` result when data is missing
3. Logging appropriate warnings using `this.log('No data available...', 'warn')`

### Table Creation Errors

Wrap table creation in try/catch blocks and:

1. Log detailed error information using `this.log(error, 'error')`
2. Return a result with `success: false` and the error object
3. Clean up any partially created resources if possible

### Custom Table Configurations

For specialized table appearance or behavior:

1. Use `this.getTableConfig(position)` to get the base configuration
2. Modify specific properties as needed
3. Pass the modified config to the table generator

## Best Practices

1. **Single Responsibility**: Each handler should focus on one table type only
2. **Error Handling**: Always provide detailed error logs and graceful fallbacks
3. **Type Safety**: Use proper TypeScript types for all properties and methods
4. **Configurability**: Support customization through the dashboard configuration
5. **Consistency**: Follow the established pattern of existing handlers
6. **Documentation**: Add JSDoc comments to explain non-obvious functionality

## Testing New Handlers

To test a new handler:

1. Ensure the simulation has data for your table type
2. Add your handler to the `DashboardTableFactory`
3. Set `true` for your table type in `DEFAULT_DASHBOARD_CONFIG.includedDataTypes`
4. Watch the console for log messages that can help diagnose issues
5. Check if your table appears in the dashboard with expected formatting
