# Guide: Adding New CSV Output Files to Quodsi Data Connector

This document outlines the step-by-step process for adding new CSV output files to the Quodsi data connector. The data connector serves as a bridge between LucidChart diagrams and the Quodsi simulation engine, allowing simulation results to be imported and visualized within LucidChart.

## Overview

Adding support for a new CSV output file involves several steps:

1. Creating a schema definition
2. Defining TypeScript interfaces
3. Updating data collection configuration
4. Creating data collectors
5. Updating the results import service
6. Exporting the new schemas

This guide will walk you through each step with examples and code snippets.

## Prerequisites

Before starting the implementation, you should have:

1. A clear understanding of the structure of the new CSV file(s)
2. The column names and data types from the CSV file(s)
3. Access to the Quodsi data connector codebase

## Step 1: Create Schema Definitions

The first step is to create schema definitions that map to the structure of your CSV file. These schemas define the field types and labels that will be used in LucidChart.

Create a new file in the `collections` directory with a name like `yourDataTypeSchema.ts`:

```typescript
import { SchemaDefinition, ScalarFieldTypeEnum } from "lucid-extension-sdk";

export const YourDataTypeSchema: SchemaDefinition = {
    fields: [
        { name: "id", type: ScalarFieldTypeEnum.STRING }, 
        { name: "scenario_id", type: ScalarFieldTypeEnum.STRING },
        { name: "scenario_name", type: ScalarFieldTypeEnum.STRING },
        // Add fields based on your CSV structure
        { name: "your_field_1", type: ScalarFieldTypeEnum.NUMBER },
        { name: "your_field_2", type: ScalarFieldTypeEnum.STRING },
        // ...
    ],
    primaryKey: ["id"],
    fieldLabels: {
        'id': 'ID',
        'scenario_id': 'Scenario Id',
        'scenario_name': 'Scenario Name',
        // Add labels based on your CSV structure
        'your_field_1': 'Your Field 1',
        'your_field_2': 'Your Field 2',
        // ...
    }
};
```

Choose appropriate field types for each column:
- `ScalarFieldTypeEnum.STRING` for text data
- `ScalarFieldTypeEnum.NUMBER` for numeric data
- `ScalarFieldTypeEnum.BOOLEAN` for boolean data
- `ScalarFieldTypeEnum.DATE` for date/time data

## Step 2: Define TypeScript Interfaces

Create a TypeScript interface that represents the structure of your CSV data. This interface will be used for type safety throughout the codebase.

Create a new file in the `collections/types/interfaces` directory with a name like `YourDataTypeData.ts`:

```typescript
/**
 * Interface for Your Data Type
 * Describes the structure of your CSV file data
 */
export interface YourDataTypeData {
    id: string;
    scenario_id: string;
    scenario_name: string;
    // Add properties based on your CSV structure
    your_field_1: number;
    your_field_2: string;
    // ...
    
    // Allow for additional properties
    [key: string]: any;
}
```

Ensure that the interface properties match the field names in your schema and CSV file.

## Step 3: Update Data Collection Configuration

Update the `dataCollectionConfigService.ts` file to include configuration options for your new data type.

```typescript
// Update the DataCollectionConfig interface
export interface DataCollectionConfig {
    // Existing collections
    collectActivityUtilization: boolean;
    collectActivityRepSummary: boolean;
    // ...
    // Add your new collection
    collectYourDataType: boolean;
}

// Update the default configuration
const defaultDataCollectionConfig: DataCollectionConfig = {
    // Existing collections
    collectActivityUtilization: true,
    collectActivityRepSummary: true,
    // ...
    // Add your new collection with a default value (usually true)
    collectYourDataType: true
};
```

## Step 4: Create Data Collectors

Create a collector module that handles fetching and processing your CSV data.

Create a new file in the `services/simulationData/collectors` directory with a name like `yourDataTypeCollector.ts`:

```typescript
// services/simulationData/collectors/yourDataTypeCollector.ts
import { YourDataTypeData } from '../../../collections/types/interfaces/YourDataTypeData';
import { YourDataTypeSchema } from '../../../collections';
import { fetchCsvData, getRequiredColumnsFromType } from '../csvParser';
import { conditionalLog, conditionalError, conditionalWarn } from '../storageService';
import { SerializedFields } from 'lucid-extension-sdk';

// Required columns for validation
export const requiredColumns = getRequiredColumnsFromType<YourDataTypeData>([
    'id',
    'scenario_id',
    'scenario_name',
    // Add all required columns from your CSV
    'your_field_1',
    'your_field_2',
    // ...
]);

/**
 * Fetches your data type from storage
 * @param containerName Azure container name
 * @param documentId Document ID
 * @param scenarioId Scenario ID to use as folder prefix
 * @returns Array of your data type
 */
export async function fetchYourDataType(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<YourDataTypeData[]> {
    const baseBlobName = 'your_data_type.csv'; // The name of your CSV file
    const blobName = `${scenarioId}/${baseBlobName}`;

    conditionalLog(`[yourDataType] Attempting to fetch data from: ${containerName}/${blobName}`);

    try {
        // Try first at the standard path
        let result = await fetchCsvData<YourDataTypeData>(
            containerName,
            blobName,
            documentId,
            requiredColumns
        );

        // If we didn't find any data, try alternative locations
        if (result.length === 0) {
            conditionalLog(`[yourDataType] No data at primary location, trying alternative locations...`);
            
            // Try in the results folder
            const altBlobName = `${scenarioId}/results/${baseBlobName}`;
            
            result = await fetchCsvData<YourDataTypeData>(
                containerName,
                altBlobName,
                documentId,
                requiredColumns
            );
        }

        conditionalLog(`[yourDataType] Fetched ${result.length} records`);
        
        // Validate and provide defaults for any missing fields
        const validatedResult = result.map(item => {
            // Create a new object with defaults for all required fields
            const validItem: YourDataTypeData = {
                id: String(item.id || "Unknown"),
                scenario_id: String(item.scenario_id || 'Unknown'),
                scenario_name: String(item.scenario_name || "Unknown"),
                // Add defaults for your fields
                your_field_1: item.your_field_1 || 0,
                your_field_2: String(item.your_field_2 || ''),
                // ...
            };

            return validItem;
        });

        return validatedResult;
    } catch (error) {
        conditionalError(`[yourDataType] Error fetching data: ${error.message}`);
        throw error;
    }
}

/**
 * Prepares your data type for Lucid update
 * @param data Array of your data type
 * @returns Collection update for Lucid
 */
export function prepareYourDataTypeUpdate(data: YourDataTypeData[]) {
    conditionalLog("[yourDataType] Starting update preparation");
    conditionalLog(`[yourDataType] Processing ${data.length} rows of data`);

    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data
    data.forEach(item => {
        // Create a cleaned item with only the fields we need
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            scenario_id: String(item.scenario_id || 'Unknown'),
            scenario_name: String(item.scenario_name || "Unknown"),
            // Add your fields
            your_field_1: item.your_field_1 || 0,
            your_field_2: String(item.your_field_2 || ''),
            // ...
        };

        // Add to our collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    conditionalLog(`[yourDataType] Final map has ${items.size} items`);

    // Return the schema and patch
    return {
        schema: YourDataTypeSchema,
        patch: {
            items
        }
    };
}
```

Note that we now use specific function names (`fetchYourDataType` and `prepareYourDataTypeUpdate`) instead of generic ones like `fetchData` and `prepareUpdate`.

## Step 5: Update Results Import Service

Update the `services/simulationData/resultsImportService.ts` file to include your new data type in the fetching and updating process.

First, add imports for your collector functions:

```typescript
import { 
    fetchYourDataType, 
    prepareYourDataTypeUpdate 
} from './collectors/yourDataTypeCollector';
```

Then, add a new variable to hold your data:

```typescript
let yourDataType = [];
```

Add your data type to the data fetch results tracking:

```typescript
const dataFetchResults = {
    // Existing data types
    activityUtilization: { success: false, count: 0, enabled: isDataCollectionEnabled('collectActivityUtilization') },
    // ...
    // Add your new data type
    yourDataType: { success: false, count: 0, enabled: isDataCollectionEnabled('collectYourDataType') }
};
```

Add a fetch block for your data type:

```typescript
// Your Data Type
if (isDataCollectionEnabled('collectYourDataType')) {
    try {
        log.info('Fetching your data type...');
        yourDataType = await fetchYourDataType(
            containerName, documentId, scenarioId
        );
        dataFetchResults.yourDataType.success = true;
        dataFetchResults.yourDataType.count = yourDataType.length;
    } catch (error) {
        log.error(`Error fetching your data type: ${error.message}`);
    }
} else {
    log.debug('Your data type collection is disabled');
}
```

Add your data type to the collection updates:

```typescript
if (isDataCollectionEnabled('collectYourDataType')) {
    updates["your_data_type"] = prepareYourDataTypeUpdate(yourDataType);
}
```

## Step 6: Export the New Schemas

Update the `collections/index.ts` file to export your new schema:

```typescript
export { YourDataTypeSchema } from './yourDataTypeSchema';
```

## Testing Your Implementation

After implementing the changes, test your implementation:

1. Deploy the updated data connector to your development environment
2. Run a simulation that generates your CSV file
3. Use the LucidChart extension to import the simulation results
4. Verify that your data is correctly imported and displayed

## Troubleshooting

If your data is not being imported correctly, check the following:

1. **CSV Column Names**: Ensure column names in the CSV match the field names in your schema
2. **File Path**: Verify the CSV file is being generated in the expected location
3. **Logging**: Enable verbose logging to see detailed information about the import process
4. **Required Columns**: Make sure all required columns are present in the CSV file
5. **Data Types**: Ensure numeric columns in the CSV contain valid numbers

## Conclusion

By following these steps, you can extend the Quodsi data connector to support new CSV output files. This allows for richer visualization and analysis of simulation results within LucidChart.

Remember that the key to successful integration is understanding both the structure of your CSV file and how the data connector's import pipeline works.
