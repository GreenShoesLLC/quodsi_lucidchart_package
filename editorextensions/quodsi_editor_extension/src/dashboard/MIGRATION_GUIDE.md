# Migration Guide: SimulationResultsDashboard Refactoring

This guide helps you migrate from the original SimulationResultsDashboard to the new refactored implementation.

## Current Status

We've implemented a new, refactored version of the SimulationResultsDashboard that breaks it down into smaller, more maintainable components. The original implementation is still available in its current location:

```
data_sources/simulation_results/SimulationResultsDashboard.ts
```

The new implementation is in:

```
dashboard/SimulationResultsDashboard.ts
```

## Migration Steps

### Step 1: Update Import Statements

**Before:**
```typescript
import { SimulationResultsDashboard } from './data_sources/simulation_results/SimulationResultsDashboard';
// OR
import { SimulationResultsDashboard } from './data_sources/simulation_results';
```

**After:**
```typescript
import { SimulationResultsDashboard } from './dashboard';
```

### Step 2: Review Configuration

The configuration interface `DashboardConfig` remains the same, but is now defined in:

```typescript
import { DashboardConfig } from './dashboard/interfaces/DashboardTypes';
```

If you were using or extending this interface, update your imports.

### Step 3: Testing

The refactored implementation maintains the same public API, so your existing code should work without changes. However, it's recommended to test the new implementation to ensure it produces the same results as the original.

### Step 4: Adding Custom Table Types

If you need to add new table types:

1. Create a new handler class extending `BaseTableHandler`
2. Register it in the `DashboardTableFactory`
3. Update the `DynamicSimulationResultsTableGenerator` if needed

See the examples in `handlers/ActivityUtilizationTableHandler.ts` and `handlers/ActivityRepSummaryTableHandler.ts`.

### Step 5: Full Migration

Once you've verified the new implementation works correctly:

1. Update all imports to use the new path
2. Consider removing the original implementation to avoid confusion

## Benefits of the New Architecture

1. **Better Organization**: Each component has a clear, focused responsibility
2. **Improved Extensibility**: Adding new table types is as simple as creating a new handler class
3. **Enhanced Testability**: Smaller, focused classes are easier to test individually
4. **Code Reuse**: Common functionality is shared through base classes
5. **Cleaner Code**: The main dashboard class is much more focused and readable

## Files in the New Implementation

- `dashboard/SimulationResultsDashboard.ts` - Main class
- `dashboard/interfaces/DashboardTypes.ts` - Types and interfaces
- `dashboard/utils/DashboardConfigManager.ts` - Configuration utilities
- `dashboard/layout/DashboardLayoutManager.ts` - Layout management
- `dashboard/factory/DashboardTableFactory.ts` - Table handler factory
- `dashboard/handlers/BaseTableHandler.ts` - Base handler
- `dashboard/handlers/ActivityUtilizationTableHandler.ts` - Concrete handlers
- `dashboard/handlers/ActivityRepSummaryTableHandler.ts` - Concrete handlers
- `dashboard/index.ts` - Exports

## Help and Support

If you encounter any issues during migration, please refer to the implementation files for detailed documentation or reach out to the development team.
