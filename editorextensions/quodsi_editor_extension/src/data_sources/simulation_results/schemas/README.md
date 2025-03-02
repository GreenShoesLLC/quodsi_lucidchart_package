# Schema Definitions

This directory contains schema definitions for various simulation result data collections that are part of the Quodsi simulation system. These schemas define the structure of data that is used by the Lucid data connector to import and display simulation results within LucidChart.

## Purpose

The schema definitions serve as data models that:

1. Define the structure of simulation output data from the Quodsim Python discrete event simulation engine
2. Map CSV output fields to strongly-typed data structures for use in LucidChart
3. Provide field labels for display in LucidChart UI
4. Enable proper data exchange between the simulation backend and the LucidChart visualization frontend

## Schema Structure

Each schema follows a consistent pattern and implements the `SchemaDefinition` interface from the Lucid Extension SDK:

```typescript
export const SomeSchema: SchemaDefinition = {
    fields: [
        { name: "Id", type: ScalarFieldTypeEnum.STRING },
        { name: "Name", type: ScalarFieldTypeEnum.STRING },
        { name: "some_metric", type: ScalarFieldTypeEnum.NUMBER },
        // Additional fields...
    ],
    primaryKey: ["Id"],
    fieldLabels: {
        'Id': 'ID',
        'Name': 'Name',
        'some_metric': 'Some Metric',
        // Additional field labels...
    }
};
```

## Available Schemas

The following schemas are defined in this directory:

| Schema File | Description |
|-------------|-------------|
| `activityUtilizationSchema.ts` | Defines metrics related to activity utilization, including mean/max/std dev values for utilization, capacity, contents, and queue length |
| `activityRepSummarySchema.ts` | Defines summarized metrics for activities across simulation replications |
| `activityTimingSchema.ts` | Defines timing-related metrics for activities (durations, delays, etc.) |
| `entityStateRepSummarySchema.ts` | Defines entity state metrics across simulation replications |
| `entityThroughputRepSummarySchema.ts` | Defines entity throughput metrics across replications |
| `resourceRepSummarySchema.ts` | Defines resource utilization and capacity metrics |
| `resourceUtilizationSchema.ts` | Defines detailed resource utilization metrics |
| `completeActivityMetricsSchema.ts` | Defines a comprehensive set of activity metrics |
| `customMetricsSchema.ts` | Defines user-defined custom metrics from simulation outputs |
| `modelSchema.ts` | Defines the model metadata structure |

## Integration with Data Connector

These schemas are utilized by the data connector, primarily in:

1. `importSimulationResultsAction.ts` - For importing simulation results into LucidChart
2. `simulationResultsService.ts` - For handling data retrieval and preparation

The schemas enable the data connector to properly structure the simulation results data for display in the LucidChart environment, mapping fields from CSV outputs to properly typed and labeled fields in the LucidChart data model.

## Usage

When adding a new output type from the Quodsim engine, you should:

1. Create a corresponding schema in this directory
2. Export it from the `index.ts` file
3. Add handling for the new data type in `simulationResultsService.ts`
4. Update relevant actions that use the new data type

This ensures that all output data from the simulation engine is properly structured for display and interaction within the LucidChart environment.