# Table Generator Refactoring Guide

This document explains the recent refactoring of the simulation results table generator functionality and how to adapt your code to the new structure.

## Overview of Changes

The `DynamicSimulationResultsTableGenerator` has been refactored to follow the Strategy Pattern, with the following key changes:

1. Moved from `data_sources/simulation_results/` to `dashboard/`
2. Created specialized generator classes in `dashboard/generators/`
3. Implemented a common base class `BaseTableGenerator`
4. Added a factory class `TableGeneratorFactory`
5. Created a backward-compatible wrapper in `dashboard/DynamicSimulationResultsTableGenerator.ts`

## Directory Structure Changes

### Before:

```
data_sources/
└── simulation_results/
    ├── DynamicSimulationResultsTableGenerator.ts  # Large file with all table types
    ├── models/
    ├── schemas/
    └── SimulationResultsReader.ts
```

### After:

```
dashboard/
├── DynamicSimulationResultsTableGenerator.ts      # Wrapper for backward compatibility
├── generators/
│   ├── ActivityRepSummaryTableGenerator.ts        # Specialized generator classes
│   ├── ActivityTimingTableGenerator.ts
│   ├── ActivityUtilizationTableGenerator.ts
│   ├── BaseTableGenerator.ts                      # Base class with common functionality
│   ├── EntityStateTableGenerator.ts
│   ├── EntityThroughputTableGenerator.ts
│   ├── ResourceUtilizationTableGenerator.ts
│   └── TableGeneratorFactory.ts                   # Factory for creating generators
└── interfaces/
    └── GeneratorTypes.ts                          # Shared interfaces and types
```

## How to Update Your Code

### Import Statements

If you were directly importing the `DynamicSimulationResultsTableGenerator` from its old location, update your import paths:

```typescript
// Before
import { DynamicSimulationResultsTableGenerator } from '../data_sources/simulation_results/DynamicSimulationResultsTableGenerator';

// After
import { DynamicSimulationResultsTableGenerator } from '../dashboard/DynamicSimulationResultsTableGenerator';
```

### TableGenerationConfig Type

If you were using the `TableGenerationConfig` type, update your import:

```typescript
// Before
import { TableGenerationConfig } from '../data_sources/simulation_results/DynamicSimulationResultsTableGenerator';

// After
import { TableGenerationConfig } from '../dashboard/interfaces/GeneratorTypes';
```

### Direct Table Generation

The public API of `DynamicSimulationResultsTableGenerator` has been preserved for backward compatibility. Your existing code using this class should continue to work without changes:

```typescript
// This code continues to work the same way with the new implementation
const tableGenerator = new DynamicSimulationResultsTableGenerator(resultsReader);
const table = await tableGenerator.createActivityUtilizationTable(page, client);
```

### Using the New Generator Classes

If you want to use the new specialized generators directly:

```typescript
// Import the specific generator
import { ActivityUtilizationTableGenerator } from '../dashboard/generators';

// Create a generator instance
const generator = new ActivityUtilizationTableGenerator(resultsReader);

// Generate a table
const table = await generator.createTable(page, client);
```

### Using the Factory

For more flexibility, you can use the factory pattern:

```typescript
import { TableGeneratorFactory } from '../dashboard/generators';

// Create a factory
const factory = new TableGeneratorFactory(resultsReader);

// Get the appropriate generator
const generator = factory.getGenerator('activity_utilization');

// Generate a table
const table = await generator.createTable(page, client);
```

## Benefits of the Refactoring

1. **Modularity**: Each table type has its own focused generator class
2. **Maintainability**: Smaller, focused files are easier to understand and modify
3. **Extensibility**: Adding new table types is simpler with the strategy pattern
4. **Organization**: Table generation code is now properly in the dashboard module
5. **Consistent Interface**: All generators follow the same abstract base class
6. **Backward Compatibility**: Existing code continues to work with the wrapper class

## Adding New Table Types

To add a new table type:

1. Create a new generator class that extends `BaseTableGenerator` in the `generators` directory
2. Implement the required abstract methods (`getTableType`, `getSchemaMapping`, `getData`, `getDefaultTitle`)
3. Add the new generator to the `TableGeneratorFactory`
4. Optionally, add a method to `DynamicSimulationResultsTableGenerator` for backward compatibility

See the [generators/README.md](./generators/README.md) for detailed examples.
