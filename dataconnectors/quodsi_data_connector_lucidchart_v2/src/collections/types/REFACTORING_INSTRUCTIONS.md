# Simulation Types Refactoring Instructions

This document provides instructions for implementing the refactoring of the simulation data types.

## What Changed

The original `simulationTypes.ts` file has been refactored to:

1. Split each interface into its own file in the `interfaces/` directory
2. Add JSDoc comments to each interface
3. Create an index file in the interfaces directory for easier imports
4. Update the original `simulationTypes.ts` file to re-export from the interfaces directory

## Implementation Steps

1. **Backup the original file**:
   ```
   copy c:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\collections\types\simulationTypes.ts c:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\collections\types\simulationTypes.ts.bak
   ```

2. **Replace the original file with the new version**:
   ```
   copy c:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\collections\types\simulationTypes.ts.new c:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\collections\types\simulationTypes.ts
   ```

3. **Build and test** to ensure everything works as expected

## Benefits of This Refactoring

1. **Modularity**: Each interface is now in its own file, making it easier to find and modify
2. **Documentation**: Added JSDoc comments to each interface explain its purpose
3. **Maintainability**: Easier to add new interfaces or modify existing ones
4. **Organization**: Better directory structure for types
5. **IDE Support**: Better code completion and navigation in IDEs
6. **Backward Compatibility**: Maintained through re-exports in the original file

## Note on Imports

Existing code that imports from `simulationTypes.ts` will continue to work without changes. New code can import directly from the interface files or from the interfaces index file.

For example:
```typescript
// Old way (still works)
import { EntityStateRepSummaryData } from '../collections/types/simulationTypes';

// New way
import { EntityStateRepSummaryData } from '../collections/types/interfaces';

// Direct import (also works)
import { EntityStateRepSummaryData } from '../collections/types/interfaces/EntityStateRepSummaryData';
```
