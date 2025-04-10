# Adding a New Schema to the Dashboard

This guide outlines the process for adding support for a new CSV schema to the Quodsi LucidChart dashboard. It assumes that a new CSV output has been added to the Quodsim engine and the corresponding schema has been defined in the data connector project.

## Example Context

Throughout this guide, we'll use a fictitious schema called `resource_capacity_summary` as our example. This schema tracks capacity and utilization metrics for resources across multiple simulation replications.

The schema definition might look something like this:

```typescript
// resourceCapacitySummarySchema.ts in the data connector project
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ResourceCapacitySummarySchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "resource_id", type: ScalarFieldTypeEnum.STRING },
        { name: "resource_name", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "capacity_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_std_dev", type: ScalarFieldTypeEnum.NUMBER },
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'resource_id': 'Resource ID',
        'resource_name': 'Resource Name',
        'scenario_id': 'Scenario ID',
        'scenario_name': 'Scenario Name',
        'capacity_mean': 'Mean Capacity',
        'capacity_max': 'Max Capacity',
        'capacity_min': 'Min Capacity',
        'capacity_std_dev': 'Capacity Std Dev',
        'utilization_mean': 'Mean Utilization',
        'utilization_max': 'Max Utilization',
        'utilization_min': 'Min Utilization',
        'utilization_std_dev': 'Utilization Std Dev'
    }
};
```

## Implementation Steps

Adding support for a new schema involves the following steps:

### 1. Create Model Interface

First, create a TypeScript interface and mapping function for the new data structure.

**Location**: `quodsi_editor_extension/src/data_sources/simulation_results/models/ResourceCapacitySummary.ts`

```typescript
// Define the interface for the data
export interface ResourceCapacitySummary {
    id: string;
    resource_id: string;
    resource_name: string;
    scenario_id: string;
    scenario_name: string;
    capacity_mean: number;
    capacity_max: number;
    capacity_min: number;
    capacity_std_dev: number;
    utilization_mean: number;
    utilization_max: number;
    utilization_min: number;
    utilization_std_dev: number;
}

// Create a mapping function for converting raw data to typed objects
export function mapToResourceCapacitySummary(fields: any): ResourceCapacitySummary {
    return {
        id: String(fields.id || ''),
        resource_id: String(fields.resource_id || ''),
        resource_name: String(fields.resource_name || ''),
        scenario_id: String(fields.scenario_id || ''),
        scenario_name: String(fields.scenario_name || ''),
        capacity_mean: Number(fields.capacity_mean || 0),
        capacity_max: Number(fields.capacity_max || 0),
        capacity_min: Number(fields.capacity_min || 0),
        capacity_std_dev: Number(fields.capacity_std_dev || 0),
        utilization_mean: Number(fields.utilization_mean || 0),
        utilization_max: Number(fields.utilization_max || 0),
        utilization_min: Number(fields.utilization_min || 0),
        utilization_std_dev: Number(fields.utilization_std_dev || 0)
    };
}
```

### 2. Update Model Index File

Update the models index to export the new interface and mapping function.

**Location**: `quodsi_editor_extension/src/data_sources/simulation_results/models/index.ts`

```typescript
// Add these lines to the existing exports
export { ResourceCapacitySummary, mapToResourceCapacitySummary } from './ResourceCapacitySummary';
```

### 3. Create Schema Definition

Create a schema definition file in the schemas directory if not already available.

**Location**: `quodsi_editor_extension/src/data_sources/simulation_results/schemas/ResourceCapacitySummarySchema.ts`

```typescript
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const ResourceCapacitySummarySchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING },
        { name: "resource_id", type: ScalarFieldTypeEnum.STRING },
        { name: "resource_name", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        { name: "capacity_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "capacity_std_dev", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_mean", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_max", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_min", type: ScalarFieldTypeEnum.NUMBER },
        { name: "utilization_std_dev", type: ScalarFieldTypeEnum.NUMBER }
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'resource_id': 'Resource ID',
        'resource_name': 'Resource Name',
        'scenario_id': 'Scenario ID',
        'scenario_name': 'Scenario Name',
        'capacity_mean': 'Mean Capacity',
        'capacity_max': 'Max Capacity',
        'capacity_min': 'Min Capacity',
        'capacity_std_dev': 'Capacity Std Dev',
        'utilization_mean': 'Mean Utilization',
        'utilization_max': 'Max Utilization',
        'utilization_min': 'Min Utilization',
        'utilization_std_dev': 'Utilization Std Dev'
    }
};
```

### 4. Update Schema Index File

Update the schemas index to export the new schema.

**Location**: `quodsi_editor_extension/src/data_sources/simulation_results/schemas/index.ts`

```typescript
// Add this line to the existing exports
export { ResourceCapacitySummarySchema } from './ResourceCapacitySummarySchema';
```

### 5. Update SimulationResultsReader

Add methods to the SimulationResultsReader to access the new data collection.

**Location**: `quodsi_editor_extension/src/data_sources/simulation_results/SimulationResultsReader.ts`

```typescript
/**
 * Gets resource capacity summary collection
 * @returns The resource capacity summary collection if found, null otherwise
 */
async getResourceCapacitySummaryCollection(): Promise<CollectionProxy | null> {
    return this.getCollectionByName('resource_capacity_summary');
}

/**
 * Gets resource capacity summary data as strongly typed objects
 * @returns Array of ResourceCapacitySummary objects
 */
async getResourceCapacitySummaryData(): Promise<ResourceCapacitySummary[]> {
    const collection = await this.getResourceCapacitySummaryCollection();
    if (!collection) return [];
    
    const result: ResourceCapacitySummary[] = [];
    
    for (const [_, item] of collection.items) {
        if (item) {
            result.push(mapToResourceCapacitySummary(item.fields));
        }
    }
    
    return result;
}
```

### 6. Create Table Generator

Create a specialized table generator for the new data type.

**Location**: `quodsi_editor_extension/src/dashboard/generators/ResourceCapacitySummaryTableGenerator.ts`

```typescript
import { BaseTableGenerator } from './BaseTableGenerator';
import { SimulationResultsReader } from '../../data_sources/simulation_results/SimulationResultsReader';
import { ResourceCapacitySummary } from '../../data_sources/simulation_results/models';
import { ResourceCapacitySummarySchema } from '../../data_sources/simulation_results/schemas';
import { SchemaMapping, TableGenerationConfig } from '../interfaces/GeneratorTypes';

/**
 * Specialized generator for Resource Capacity Summary tables
 */
export class ResourceCapacitySummaryTableGenerator extends BaseTableGenerator {
    constructor(resultsReader: SimulationResultsReader, config?: TableGenerationConfig) {
        super(resultsReader, config);
    }

    /**
     * Returns the table type identifier
     */
    getTableType(): string {
        return 'resourceCapacitySummary';
    }
    
    /**
     * Returns the schema mapping for resource capacity data
     */
    getSchemaMapping(): SchemaMapping {
        return {
            schema: ResourceCapacitySummarySchema,
            identifierFields: ['id', 'resource_id', 'resource_name'],
            percentageFields: [
                'utilization_mean',
                'utilization_max',
                'utilization_min'
            ],
            priorityFields: [
                'resource_name',
                'scenario_name',
                'capacity_mean',
                'capacity_max',
                'capacity_min',
                'utilization_mean',
                'utilization_max',
                'utilization_min'
            ]
        };
    }
    
    /**
     * Retrieves resource capacity data from the results reader
     */
    async getData(): Promise<ResourceCapacitySummary[]> {
        return this.resultsReader.getResourceCapacitySummaryData();
    }
    
    /**
     * Returns the default title for resource capacity tables
     */
    getDefaultTitle(): string {
        return 'Resource Capacity Analysis';
    }
}
```

### 7. Update TableGeneratorFactory

Update the TableGeneratorFactory to support the new table type.

**Location**: `quodsi_editor_extension/src/dashboard/generators/TableGeneratorFactory.ts`

```typescript
// Add import for the new generator
import { ResourceCapacitySummaryTableGenerator } from './ResourceCapacitySummaryTableGenerator';

// Inside the getGenerator method, add these cases
case 'resourceCapacitySummary':
case 'resource_capacity_summary': // For backward compatibility
    return new ResourceCapacitySummaryTableGenerator(this.resultsReader, this.config);
```

### 8. Update DynamicSimulationResultsTableGenerator

Add a new method to the wrapper generator class.

**Location**: `quodsi_editor_extension/src/dashboard/DynamicSimulationResultsTableGenerator.ts`

```typescript
/**
 * Creates a table for resource capacity summary data
 * @param page The page to add the table to
 * @param client The editor client
 * @param config Optional configuration overrides for this table
 */
public async createResourceCapacitySummaryTable(
    page: PageProxy,
    client: EditorClient,
    config?: TableGenerationConfig
): Promise<TableBlockProxy | null> {
    const generator = this.factory.getGenerator('resourceCapacitySummary');
    return generator.createTable(page, client, config);
}
```

### 9. Create Table Handler

Create a handler class for the new table type.

**Location**: `quodsi_editor_extension/src/dashboard/handlers/ResourceCapacitySummaryTableHandler.ts`

```typescript
import { PageProxy } from 'lucid-extension-sdk';
import { BaseTableHandler } from './BaseTableHandler';
import { TableCreationResult } from '../interfaces/results/TableResult';

/**
 * Handler for creating resource capacity summary tables
 */
export class ResourceCapacitySummaryTableHandler extends BaseTableHandler {
    /**
     * Gets the table type identifier
     * @returns Type identifier string
     */
    getTableType(): string {
        return 'resourceCapacitySummary';
    }
    
    /**
     * Gets the default title for this table type
     * @returns Default title
     */
    getDefaultTitle(): string {
        return 'Resource Capacity Summary';
    }
    
    /**
     * Checks if this table can be created (has data)
     * @returns True if the table can be created
     */
    async canCreateTable(): Promise<boolean> {
        const data = await this.resultsReader.getResourceCapacitySummaryData();
        return data && data.length > 0;
    }
    
    /**
     * Creates a table at the specified position
     * @param page Page to add the table to
     * @param position Position coordinates
     * @returns Table creation result
     */
    async createTable(page: PageProxy, position: { x: number, y: number }): Promise<TableCreationResult> {
        this.log(`Creating resource capacity summary table at position (${position.x}, ${position.y})`);
        
        try {
            // Get table configuration
            const tableConfig = this.getTableConfig(position);
            
            // Create the table
            const table = await this.tableGenerator.createResourceCapacitySummaryTable(
                page, 
                this.client, 
                tableConfig
            );
            
            if (!table) {
                this.log('No data available for resource capacity summary table', 'warn');
                return this.createResult(null, false);
            }
            
            this.log('Resource capacity summary table created successfully');
            return this.createResult(table, true);
        } catch (error) {
            this.log(`Error creating resource capacity summary table: ${error}`, 'error');
            return this.createResult(null, false, error);
        }
    }
}
```

### 10. Update DashboardTableFactory

Update the DashboardTableFactory to register the new handler.

**Location**: `quodsi_editor_extension/src/dashboard/factory/DashboardTableFactory.ts`

```typescript
// Add import for the new handler
import { ResourceCapacitySummaryTableHandler } from '../handlers/ResourceCapacitySummaryTableHandler';

// Inside the initializeHandlers method, add
this.registerHandler(new ResourceCapacitySummaryTableHandler(
    this.client,
    this.resultsReader,
    this.tableGenerator,
    this.config
));
```

## Testing

After implementing all these changes, you should test the new functionality:

1. Ensure your simulation produces the CSV data that corresponds to the new schema
2. Import the simulation results using the data connector
3. Generate a dashboard and verify the new table appears
4. Check that data is correctly displayed and formatted
5. Test edge cases like empty data sets and unusual values

## 11. Update Dashboard Configuration

A critical final step is updating the dashboard configuration to make your new table visible in the dashboard.

**Location**: `quodsi_editor_extension/src/dashboard/config/DefaultTableConfig.ts`

```typescript
export const DEFAULT_TABLE_CONFIGS: Record<string, TableConfig> = {
    // Existing table configs...
    
    // Add your new table type
    resourceCapacitySummary: {
        included: true,  // Set to true to make it visible
        header: 'Resource Capacity Summary',
        columns: {
            order: [
                'resource_name',
                'scenario_name',
                'capacity_mean',
                'capacity_max',
                'capacity_min',
                'utilization_mean',
                'utilization_max',
                'utilization_min'
            ],
            exclude: [
                'id',
                'scenario_id',
                'resource_id',
                'capacity_std_dev',
                'utilization_std_dev'
            ]
        }
    }
};
```

Then, update the dashboard configuration to include your new table in the display order:

**Location**: `quodsi_editor_extension/src/dashboard/config/DefaultDashboardConfig.ts`

```typescript
export const DEFAULT_DASHBOARD_CONFIG: DashboardConfig = {
    // Other config...
    
    tableOrder: [
        'entityState',
        'activityUtilization',
        'entityThroughput',
        'resourceCapacitySummary',  // Add your new table in the desired position
        'activityTiming',
        // Any tables not in this list will be shown after these
    ],
    
    // Other config...
};
```

Without this step, the table won't appear in the dashboard even if all the other components are correctly implemented.

## Summary

Adding a new schema to the dashboard involves several steps, but following this structured approach ensures that the new table integrates seamlessly with the existing dashboard framework.

The process follows the established patterns in the codebase, ensuring:

1. Strong typing through interfaces and mapping functions
2. Clear separation of concerns between data access and visualization
3. Proper integration with the dashboard configuration system
4. Consistent user experience across all table types

By following these steps, you can quickly add support for new CSV schemas produced by the Quodsim engine, allowing users to visualize additional aspects of their simulation results.
