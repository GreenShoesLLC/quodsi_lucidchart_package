# Migration Guide: Dashboard Refactoring

This guide helps you migrate code to use the refactored dashboard and table generation components.

## Recent Refactorings

The dashboard module has undergone two significant refactorings:

1. **SimulationResultsDashboard Refactoring**: Moved from data_sources/simulation_results to dashboard/
2. **DynamicSimulationResultsTableGenerator Refactoring**: Moved from data_sources/simulation_results to dashboard/ and split into specialized generator classes

## Migration Steps for SimulationResultsDashboard

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

## Migration Steps for DynamicSimulationResultsTableGenerator

### Step 1: Update Import Statements

**Before:**
```typescript
import { DynamicSimulationResultsTableGenerator } from './data_sources/simulation_results/DynamicSimulationResultsTableGenerator';
// OR
import { DynamicSimulationResultsTableGenerator } from './data_sources/simulation_results';
```

**After:**
```typescript
import { DynamicSimulationResultsTableGenerator } from './dashboard/DynamicSimulationResultsTableGenerator';
```

### Step 2: Update TableGenerationConfig Import

**Before:**
```typescript
import { TableGenerationConfig } from './data_sources/simulation_results/DynamicSimulationResultsTableGenerator';
```

**After:**
```typescript
import { TableGenerationConfig } from './dashboard/interfaces/GeneratorTypes';
```

### Step 3: Consider Using Specialized Generators

The refactored implementation introduces specialized generator classes that you can use directly:

```typescript
import { ActivityUtilizationTableGenerator } from './dashboard/generators';

const generator = new ActivityUtilizationTableGenerator(resultsReader);
const table = await generator.createTable(page, client);
```

Or use the factory pattern:

```typescript
import { TableGeneratorFactory } from './dashboard/generators';

const factory = new TableGeneratorFactory(resultsReader);
const generator = factory.getGenerator('activity_utilization');
const table = await generator.createTable(page, client);
```

## Adding Custom Components

### Adding New Table Types

1. Create a generator class in the generators directory that extends BaseTableGenerator
2. Create a handler class in the handlers directory that extends BaseTableHandler
3. Register the handler in DashboardTableFactory
4. Add the table type to the includedDataTypes interface in DashboardTypes.ts

See the [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md) for detailed examples.

## Benefits of the New Architecture

1. **Better Organization**: Each component has a clear, focused responsibility
2. **Improved Extensibility**: Adding new components is cleaner and more structured
3. **Enhanced Testability**: Smaller, focused classes are easier to test individually
4. **Code Reuse**: Common functionality is shared through base classes
5. **Strategy Pattern**: Different algorithms encapsulated in their own classes
6. **Factory Pattern**: Object creation delegated to specialized factory classes

## Files in the New Implementation

### Dashboard Framework
- `dashboard/SimulationResultsDashboard.ts` - Main dashboard class
- `dashboard/interfaces/DashboardTypes.ts` - Dashboard types and interfaces
- `dashboard/utils/DashboardConfigManager.ts` - Configuration utilities
- `dashboard/layout/DashboardLayoutManager.ts` - Layout management
- `dashboard/factory/DashboardTableFactory.ts` - Table handler factory

### Table Handlers
- `dashboard/handlers/BaseTableHandler.ts` - Base handler class
- `dashboard/handlers/ActivityUtilizationTableHandler.ts` - Specialized handlers
- `dashboard/handlers/(other handlers)...` - Additional handlers

### Table Generators (New)
- `dashboard/DynamicSimulationResultsTableGenerator.ts` - Backward-compatible wrapper
- `dashboard/interfaces/GeneratorTypes.ts` - Generator interfaces
- `dashboard/generators/BaseTableGenerator.ts` - Base generator class
- `dashboard/generators/ActivityUtilizationTableGenerator.ts` - Specialized generators
- `dashboard/generators/(other generators)...` - Additional generators
- `dashboard/generators/TableGeneratorFactory.ts` - Generator factory

## Help and Support

For more details on the recent table generator refactoring, see the [REFACTORING_GUIDE.md](./REFACTORING_GUIDE.md).

If you encounter any issues during migration, please refer to the implementation files for detailed documentation or reach out to the development team.
