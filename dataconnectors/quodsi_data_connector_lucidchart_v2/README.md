# Quodsi Data Connector for LucidChart

This Azure Function-based data connector serves as the bridge between LucidChart diagrams and the Quodsi simulation engine. It provides actions to submit, run, and retrieve simulation data across development, testing, and production environments.

## Environment Configuration

The application uses a robust environment detection and configuration system that automatically determines which resources to use based on the deployment environment.

### Environment Detection

The system automatically detects which environment it's running in based on the Azure Function App name:

```typescript
// From config.ts
export function detectEnvironment(): Environment {
  // When running in Azure, use the Function App name to detect environment
  const functionAppName = process.env.WEBSITE_SITE_NAME || '';
  
  if (functionAppName.startsWith('dev-')) {
    return 'dev';
  } else if (functionAppName.startsWith('tst-')) {
    return 'tst';
  } else if (functionAppName.startsWith('prd-')) {
    return 'prd';
  }
  
  // Default to local environment if not running in Azure or can't detect
  return 'local';
}
```

### Environment-Specific Resources

Each environment uses its own set of resources:

- **Storage Accounts**: Environment-specific storage for model data
  - Development: `devquodsist01`
  - Test: `tstquodsist01`
  - Production: `prdquodsist01`

- **Batch Resources**: All environments share the same Batch account but use environment-specific pools and applications
  - Shared Batch Account: `quodsisharedbatch01`
  - Development: Pool `quodsi-dev-python-pool-01`, App `dev_quodsim`
  - Test: Pool `quodsi-tst-python-pool-01`, App `tst_quodsim`
  - Production: Pool `quodsi-prd-python-pool-01`, App `prd_quodsim`

### Configuration System

The configuration system in `config.ts` merges base configuration with environment-specific settings:

```typescript
export function getConfig(): QuodsiConfig {
  // Detect the current environment
  const environment = detectEnvironment();
  
  // Get environment-specific configuration
  const envConfig = getEnvironmentSpecificConfig(environment);
  
  // Merge base config with environment-specific config
  const mergedConfig: QuodsiConfig = {
    ...baseConfig,
    ...envConfig,
    environment
  };
  
  return mergedConfig;
}
```

## Environment Variables

### Key Environment Variables

| Variable Name | Description | Example Value |
|---------------|-------------|--------------|
| QUODSI_ENVIRONMENT | Explicitly identifies the environment | `dev`, `tst`, or `prd` |
| QUODSI_STORAGE_ACCOUNT | Environment-specific storage account name | `devquodsist01` |
| AzureStorageConnectionString | Connection string for environment-specific storage | `DefaultEndpointsProtocol=https;AccountName=devquodsist01;...` |
| BatchStorageConnectionString | Connection string for shared batch storage | `DefaultEndpointsProtocol=https;AccountName=quodsisharedbatch01storage;...` |
| BatchAccountName | Name of the shared batch account | `quodsisharedbatch01` |
| BatchAccountUrl | URL of the shared batch account | `https://quodsisharedbatch01.eastus2.batch.azure.com` |
| BatchAccountKey | Access key for the batch account | (Secure value) |
| BatchPoolId | Environment-specific batch pool | `quodsi-dev-python-pool-01` |
| DefaultApplicationId | Environment-specific batch application | `dev_quodsim` |

### Local Development

For local development, copy the `local.settings.json.template` to `local.settings.json` and fill in the required values. Make sure to use the development environment values.

## Key Architecture Components

### 1. Configuration (config.ts)

The configuration module detects the environment and loads appropriate settings. It serves as the foundation for environment-specific resource access.

### 2. Azure Storage Service (azureStorageService.ts)

Handles uploading model definitions and simulation results to the environment-specific Azure Storage account.

```typescript
// Example from saveAndSubmitSimulationAction.ts
const storageService = new AzureStorageService(config.azureStorageConnectionString);
const uploadSuccess = await storageService.uploadBlobContent(
    documentId,  // Using documentId as container name
    blobName,
    modelJson
);
```

### 3. Batch Job Submission (lucidSimulationJobSubmissionService.ts)

Submits simulation jobs to Azure Batch using environment-specific pools and applications.

```typescript
// Example from saveAndSubmitSimulationAction.ts
const batchService = new LucidSimulationJobSubmissionService({
    batchAccountUrl: config.batchAccountUrl,
    batchAccountName: config.batchAccountName,
    batchAccountKey: config.batchAccountKey,
    poolId: config.batchPoolId,
    defaultApplicationId: config.defaultApplicationId,
    defaultAppVersion: config.defaultAppVersion
});
```

## Important Implementation Details

### 1. Container Naming Convention

Azure Storage containers are named using the LucidChart document ID. This ensures data isolation between different diagrams.

```typescript
// From saveAndSubmitSimulationAction.ts
await storageService.uploadBlobContent(
    documentId,  // Using documentId as container name
    blobName,
    modelJson
);
```

### 2. Blob Naming Convention

Within each container, blobs are organized using scenario IDs to separate different simulation runs:

```typescript
// From saveAndSubmitSimulationAction.ts
const blobName = `${scenarioId}/model.json`;
```

### 3. Batch Job Naming

Batch jobs are named using a combination of document ID and scenario ID:

```typescript
// From lucidSimulationJobSubmissionService.ts
const jobId = `job-${documentId}-${scenarioId}`.toLowerCase();
```

### 4. Error Handling & Logging

The system uses a structured logging approach via the `ActionLogger` class. Each action logs key information including environment, storage account, and batch pool being used.

```typescript
// From saveAndSubmitSimulationAction.ts
logger.info(`Operating in environment: ${config.environment}`);
logger.info(`Using storage account: ${config.azureStorageConnectionString.includes('AccountName=') ? 
    config.azureStorageConnectionString.split('AccountName=')[1].split(';')[0] : 'unknown'}`);
logger.info(`Using batch pool: ${config.batchPoolId}`);
```

## Deployment

The data connector is deployed as part of the Azure Function App:
- Development: `dev-quodsi-func-v1` (in `dev-quodsi-rg-01`)
- Test: `tst-quodsi-func-v1` (in `tst-quodsi-rg-01`)
- Production: `prd-quodsi-func-v1` (in `prd-quodsi-rg-01`)

See the deployment instructions in: 
`infrastructure/deployment/function-apps/v1/README.md`

## Adding New Environment-Specific Settings

To add a new environment-specific setting:

1. Add the property to the `QuodsiConfig` interface in `config.ts`:
   ```typescript
   export interface QuodsiConfig {
     // Existing properties
     newProperty: string;
   }
   ```

2. Add environment-specific values in `getEnvironmentSpecificConfig`:
   ```typescript
   const envConfigs: Record<Environment, Partial<QuodsiConfig>> = {
     'dev': {
       // Existing properties
       newProperty: 'dev-specific-value',
     },
     'tst': {
       // Existing properties
       newProperty: 'tst-specific-value',
     },
     'prd': {
       // Existing properties
       newProperty: 'prd-specific-value',
     },
     'local': {
       // Local properties if needed
     }
   };
   ```

3. Add a default value in `baseConfig` if appropriate:
   ```typescript
   const baseConfig: QuodsiConfig = {
     // Existing properties
     newProperty: process.env.NEW_PROPERTY || 'default-value',
   };
   ```

4. Update the Azure Function App configuration in all environments through the ARM templates.

## Testing Environment Configuration

When testing locally, you can verify the environment detection and configuration by examining the startup logs which show the detected environment and resources being used.

## Troubleshooting

Common environment-related issues:

1. **Wrong Storage Account**: Check if `AzureStorageConnectionString` points to the correct environment-specific storage.
2. **Wrong Batch Pool**: Verify that `BatchPoolId` is set to the environment-specific pool.
3. **Wrong Application ID**: Ensure `DefaultApplicationId` matches the environment-specific application.
4. **Authorization Errors**: Check that the appropriate keys and credentials are provided for the environment.