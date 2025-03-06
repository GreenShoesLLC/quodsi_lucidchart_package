# Simulation Data Collectors

This directory contains individual data collectors for various simulation result types. Each collector is responsible for fetching and preparing a specific type of simulation data for display in LucidChart.

## Collector Structure

Each collector follows a consistent structure with three main components:

### 1. Required Columns

Each collector defines the required columns that must be present in its corresponding CSV file:

```typescript
export const requiredColumns = getRequiredColumnsFromType<SomeDataType>([
    'Id', 'Name', 'metric1', 'metric2', ...
]);
```

These columns are used to validate the CSV file when it's parsed. If any required column is missing, the collector will report an error and fail gracefully.

### 2. fetchData Function

Each collector provides a `fetchData` function that retrieves data from Azure Blob Storage:

```typescript
export async function fetchData(
    containerName: string,
    documentId: string
): Promise<SomeDataType[]> {
    return fetchCsvData<SomeDataType>(
        containerName, 
        'some_data_type.csv', 
        documentId,
        requiredColumns
    );
}
```

This function:
- Uses the container name (which equals the document ID)
- Specifies the CSV file name to look for
- Handles validation against required columns
- Performs any necessary data transformations
- Returns a typed array of data objects

### 3. prepareUpdate Function

Each collector provides a `prepareUpdate` function that formats the data for Lucid's collection update API:

```typescript
export function prepareUpdate(data: SomeDataType[]) {
    return prepareCollectionUpdate(
        data, 
        SomeDataTypeSchema,
        'Id' // or a function that creates a composite key
    );
}
```

This function:
- Takes an array of data objects
- Associates them with the correct schema
- Specifies how to generate unique IDs for each item
- Returns a properly formatted collection update object

## Available Collectors

| Collector | CSV File | Description |
|-----------|----------|-------------|
| `activityUtilization.ts` | `activity_utilization.csv` | Activity utilization metrics including mean/max/std dev values |
| `activityRepSummary.ts` | `activity_rep_summary.csv` | Summarized metrics for activities across simulation replications |
| `activityTiming.ts` | `activity_timing.csv` | Timing-related metrics for activities (durations, delays, etc.) |
| `entityStateRepSummary.ts` | `entity_state_rep_summary.csv` | Entity state metrics across simulation replications |
| `entityThroughputRepSummary.ts` | `entity_throughput_rep_summary.csv` | Entity throughput metrics across replications |
| `resourceRepSummary.ts` | `resource_rep_summary.csv` | Resource utilization and capacity metrics |
| `completeActivityMetrics.ts` | `complete_activity_metrics.csv` | Comprehensive set of activity metrics |
| `customMetrics.ts` | `custom_metrics.csv` | User-defined custom metrics from simulation outputs |

## Adding a New Collector

To add a new collector for a new data type:

1. Create a new file named after the data type (e.g., `newDataType.ts`)
2. Define the required columns using `getRequiredColumnsFromType`
3. Implement the `fetchData` function to retrieve the data
4. Implement the `prepareUpdate` function to format the data
5. Add the collector to the exports in `simulationData/index.ts`

## Best Practices

- Keep collectors focused on a single data type
- Use consistent naming conventions for CSV files
- Handle edge cases gracefully (missing files, transformation errors)
- Add comments explaining any complex transformations or composite key generation
- Update this README when adding new collectors
