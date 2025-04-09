# Simulation Data Module

This directory contains the core components responsible for retrieving, processing, and preparing simulation result data for display in LucidChart. The module handles the low-level details of connecting to Azure Storage, parsing CSV files, and formatting data according to Lucid's requirements.

## Directory Structure

- `/collectors` - Individual data collectors for each type of simulation data
- `/csvParser.ts` - Utilities for parsing and validating CSV data
- `/storageService.ts` - Interface with Azure Blob Storage
- `/collectionUpdater.ts` - Utilities for formatting data for Lucid's collection update API
- `/resultsImportService.ts` - Orchestration service for the overall import process

## Key Components

### Storage Service (`storageService.ts`)

The storage service provides an abstraction over Azure Blob Storage. It handles:

- Initializing storage connections
- Checking if containers and blobs exist
- Retrieving blob content
- Listing available containers and blobs
- Providing logging utilities for storage operations

```typescript
// Example usage
import { initializeStorageService, getBlobContent } from './storageService';

// Initialize with connection string
initializeStorageService(config.azureStorageConnectionString);

// Get content from a blob
const csvContent = await getBlobContent(containerName, blobPath);
```

### CSV Parser (`csvParser.ts`)

The CSV parser provides utilities for safely parsing CSV files from Azure Storage. It handles:

- Fetching CSV content from blob storage
- Parsing CSV data with proper type conversion
- Validating required columns
- Handling potential issues like duplicate headers
- Supporting debugging for CSV-related problems

```typescript
// Example usage
import { fetchCsvData, getRequiredColumnsFromType } from './csvParser';

// Define required columns
const requiredColumns = getRequiredColumnsFromType<MyDataType>([
    'id', 'scenario_id', 'scenario_name'
]);

// Fetch and parse CSV data
const data = await fetchCsvData<MyDataType>(
    containerName,
    blobPath,
    documentId,
    requiredColumns
);
```

### Collection Updater (`collectionUpdater.ts`)

The collection updater provides utilities for preparing data for Lucid's collection update API. It handles:

- Converting arrays of data objects to Lucid's expected format
- Ensuring proper serialization of data fields
- Supporting custom ID generation strategies

```typescript
// Example usage
import { prepareCollectionUpdate } from './collectionUpdater';

// Prepare data for Lucid update
const update = prepareCollectionUpdate(
    data,
    MyDataSchema,
    'id' // ID field name or custom function
);
```

### Data Collectors (`/collectors`)

Each collector is responsible for fetching and preparing a specific type of simulation data. See the [Collectors README](./collectors/README.md) for details on individual collectors.

### Results Import Service (`resultsImportService.ts`)

The results import service orchestrates the overall import process. It:

- Determines which collections to import based on configuration
- Coordinates fetching data from multiple collectors
- Handles logging and error tracking
- Prepares and sends updates to LucidChart

```typescript
// Example usage from an action handler
import { updateSimulationResults } from './simulationData/resultsImportService';

const result = await updateSimulationResults(
    action,
    documentId,
    scenarioId,
    'importAction',
    loggingLevel
);
```

## Integration Pattern

The module follows a direct integration pattern, where each component directly imports what it needs from other components. There are no unnecessary abstraction layers, making the code easier to understand and maintain.

```
resultsImportService.ts
  │
  ├─ imports from storageService.ts
  │
  ├─ imports directly from collectors
  │   ├─ activityUtilizationCollector.ts
  │   ├─ entityStateRepSummaryCollector.ts
  │   └─ ...
  │
  └─ imports from dataCollectionConfigService.ts (outside this directory)
```

## Adding New Data Types

To add support for a new data type:

1. Create a new interface in `/collections/types/interfaces`
2. Create a new schema in `/collections`
3. Create a new collector in `/collectors`
4. Add import and usage in `resultsImportService.ts`

See the [Adding New CSV Output Files](../../_docs/AddingNewCsvOutputFiles.md) guide for detailed instructions.

## Best Practices

- Keep collectors focused on a single responsibility
- Use consistent naming conventions across all files
- Include comprehensive error handling
- Add proper logging for diagnostic purposes
- Follow the existing patterns for new additions
- Update documentation when making changes
