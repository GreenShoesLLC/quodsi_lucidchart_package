# Simulation Data Service

This directory contains the refactored implementation of the simulation data service, which is responsible for fetching, parsing, and preparing simulation result data for display in LucidChart.

## Directory Structure

```
simulationData/
├── collectors/            - Individual data collectors for specific simulation result types
├── index.ts               - Public API exports and facade
├── csvParser.ts           - CSV parsing and validation utilities
├── collectionUpdater.ts   - Collection update preparation utilities
├── storageService.ts      - Azure storage service management
└── README.md              - This file
```

## Core Components

### Storage Service (`storageService.ts`)

Provides functions for initializing and accessing the Azure Blob Storage service:

- `initializeStorageService`: Creates a singleton storage service instance
- `getStorageService`: Returns the initialized storage service
- `setVerboseLogging`: Configures logging verbosity
- Utility logging functions (`conditionalLog`, `conditionalError`, etc.)

### CSV Parser (`csvParser.ts`)

Provides utilities for fetching and parsing CSV data:

- `fetchCsvData`: Retrieves CSV data from Azure Blob Storage and parses it
- `getRequiredColumnsFromType`: Extracts required column names from type definitions
- Handles duplicate headers, missing columns, and validation

### Collection Updater (`collectionUpdater.ts`)

Prepares data for Lucid's collection update API:

- `prepareCollectionUpdate`: Formats data with proper IDs and serializes fields

### Data Collectors (`collectors/`)

Individual modules for each type of simulation result data:

- Each collector handles a specific CSV file type
- See the [collectors README](./collectors/README.md) for detailed documentation

### Index (`index.ts`)

The main entry point that exports the public API:

- Re-exports core utilities from other modules
- Provides namespaced access to all collectors
- Exposes unified `fetch` and `prepare` objects for convenient access

## Usage

This module is used by the parent `simulationDataService.ts` facade, which maintains backward compatibility with existing code. The refactored structure provides:

1. **Modularity**: Each component has a clear, single responsibility
2. **Extensibility**: New data types can be added by creating new collectors
3. **Maintainability**: Smaller, focused files are easier to understand and modify
4. **Testability**: Components can be tested in isolation

## Adding New Functionality

To add support for a new simulation data type:

1. Create a new collector in the `collectors/` directory
2. Add the collector to the exports in `index.ts`
3. Update the parent facade in `simulationDataService.ts` if needed

## Architectural Decisions

- **Singleton Storage Service**: A single instance of the Azure Storage service is maintained
- **Generic CSV Parsing**: The CSV parser is generic and can handle any type of CSV data
- **Type Safety**: TypeScript interfaces ensure data consistency
- **Error Handling**: Each component handles its own errors and provides meaningful messages
- **Backward Compatibility**: The facade pattern preserves the original API
