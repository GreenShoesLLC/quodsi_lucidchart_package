# Simulation Data Collectors

This directory contains individual data collectors for various simulation result types. Each collector is responsible for fetching and preparing a specific type of simulation data for display in LucidChart.

## Naming Conventions

Collectors follow these naming conventions:
- Files are named with the pattern `[dataType]Collector.ts` (e.g., `activityUtilizationCollector.ts`)
- Fetch functions are named with the pattern `fetch[DataType]` (e.g., `fetchActivityUtilization`)
- Update preparation functions are named with the pattern `prepare[DataType]Update` (e.g., `prepareActivityUtilizationUpdate`)

## Collector Structure

Each collector follows a consistent structure with three main components:

### 1. Required Columns

Each collector defines the required columns that must be present in its corresponding CSV file:

```typescript
export const requiredColumns = getRequiredColumnsFromType<SomeDataType>([
    'id', 'scenario_id', 'metric1', 'metric2', ...
]);
```

These columns are used to validate the CSV file when it's parsed. If any required column is missing, the collector will report an error and fail gracefully.

### 2. Fetch Function

Each collector provides a fetch function (e.g., `fetchActivityUtilization`) that retrieves data from Azure Blob Storage:

```typescript
export async function fetchSomeDataType(
    containerName: string,
    documentId: string,
    scenarioId: string
): Promise<SomeDataType[]> {
    const baseBlobName = 'some_data_type.csv';
    const blobName = `${scenarioId}/${baseBlobName}`;
    
    // Fetch and process data
    return fetchCsvData<SomeDataType>(
        containerName, 
        blobName, 
        documentId,
        requiredColumns
    );
}
```

This function:
- Uses the container name (which equals the document ID)
- Specifies the CSV file name to look for within the scenario folder
- Handles validation against required columns
- Performs any necessary data transformations
- Returns a typed array of data objects

### 3. Update Preparation Function

Each collector provides an update preparation function (e.g., `prepareActivityUtilizationUpdate`) that formats the data for Lucid's collection update API:

```typescript
export function prepareSomeDataTypeUpdate(data: SomeDataType[]) {
    // Create a Map to store the serialized fields
    const items = new Map<string, SerializedFields>();

    // Process each row of data and add to the map
    data.forEach(item => {
        // Create a cleaned item with no null values
        const cleanedItem: SerializedFields = {
            id: String(item.id || "Unknown"),
            // Add other fields with default values as needed
        };

        // Add to the collection using the ID as the key
        items.set(`"${String(item.id || 'Unknown')}"`, cleanedItem);
    });

    // Return the schema and patch
    return {
        schema: SomeDataTypeSchema,
        patch: {
            items
        }
    };
}
```

This function:
- Takes an array of data objects
- Performs validation and default value assignment
- Creates a map of serialized fields for Lucid
- Associates them with the correct schema
- Returns a properly formatted collection update object

## Available Collectors

| Collector | CSV File | Description |
|-----------|----------|-------------|
| `activityUtilizationCollector.ts` | `activity_utilization.csv` | Activity utilization metrics including mean/max/std dev values |
| `activityRepSummaryCollector.ts` | `activity_rep_summary.csv` | Summarized metrics for activities across simulation replications |
| `activityTimingCollector.ts` | `activity_timing.csv` | Timing-related metrics for activities (durations, delays, etc.) |
| `entityStateRepSummaryCollector.ts` | `entity_state_rep_summary.csv` | Entity state metrics across simulation replications |
| `entityThroughputRepSummaryCollector.ts` | `entity_throughput_rep_summary.csv` | Entity throughput metrics across replications |
| `entityStateCrossRepSummaryCollector.ts` | `entity_state_cross_rep_summary.csv` | Cross-replication entity state summary metrics |
| `entityThroughputCrossRepSummaryCollector.ts` | `entity_throughput_cross_rep_summary.csv` | Cross-replication entity throughput summary metrics |
| `resourceRepSummaryCollector.ts` | `resource_rep_summary.csv` | Resource utilization and capacity metrics |
| `resourceUtilizationCollector.ts` | `resource_utilization.csv` | Detailed resource utilization metrics |

## Adding a New Collector

To add a new collector for a new data type:

1. Create a new file named after the data type (e.g., `newDataTypeCollector.ts`)
2. Define the required columns using `getRequiredColumnsFromType`
3. Implement the fetch function (e.g., `fetchNewDataType`) to retrieve the data
4. Implement the update preparation function (e.g., `prepareNewDataTypeUpdate`) to format the data
5. Import and use the collector directly in `resultsImportService.ts`

## Direct Integration

Collectors are imported and used directly in the `resultsImportService.ts` file:

```typescript
// Import collector functions directly
import { 
    fetchActivityUtilization, 
    prepareActivityUtilizationUpdate 
} from './collectors/activityUtilizationCollector';

// Use them directly in the code
activityUtilization = await fetchActivityUtilization(
    containerName, documentId, scenarioId
);

updates["activity_utilization"] = prepareActivityUtilizationUpdate(activityUtilization);
```

This direct import pattern eliminates unnecessary abstraction layers and makes the code easier to understand and maintain.

## Best Practices

- Keep collectors focused on a single data type
- Use consistent naming conventions for files and functions
- Handle edge cases gracefully (missing files, transformation errors)
- Provide default values for all fields to prevent null values
- Add comments explaining any complex transformations or validations
- Update this README when adding new collectors
