# 05. Batch Service

Comprehensive documentation of Azure Batch job creation and task submission for simulation execution.

## Overview

The `LucidSimulationJobSubmissionService` class manages all interactions with Azure Batch, creating jobs and tasks that execute the Python simulation runner.

**Primary File:** `dataconnectors/quodsi_data_connector_lucidchart_v2/src/services/lucidSimulationJobSubmissionService.ts`

## Architecture

```
LucidSimulationJobSubmissionService
           │
           ├─> Azure Batch API
           │       │
           │       ├─> Job Creation (with retry)
           │       │   └─> Pool: {poolId}
           │       │
           │       └─> Task Creation (with retry)
           │           └─> Command: Python CLI
           │                 └─> Simulation Runner
           │                       └─> Results Output
```

## Class Structure

### Constructor

**Location:** Lines 58-89

**Signature:**
```typescript
constructor(config: BatchConfiguration)
```

**Configuration Interface:**
```typescript
interface BatchConfiguration {
  batchAccountUrl: string;      // "https://{account}.{region}.batch.azure.com"
  batchAccountName: string;     // Batch account name
  batchAccountKey: string;      // Access key
  poolId: string;               // Pool ID for task execution
  defaultApplicationId?: string; // App package ID (default: "dev_quodsim")
  defaultAppVersion?: string;   // App version (default: "1.0")
}
```

**Initialization Steps:**
1. Validate configuration (throws `BatchConfigurationError` if invalid)
2. Create `BatchSharedKeyCredentials` object
3. Initialize `BatchServiceClient`
4. Store configuration values

**Code Reference:**
```typescript
// Validation
if (!config.batchAccountUrl)
  throw new BatchConfigurationError("BatchAccountUrl is not configured.", "BatchAccountUrl");
if (!config.batchAccountName)
  throw new BatchConfigurationError("BatchAccountName is not configured.", "BatchAccountName");
if (!config.batchAccountKey)
  throw new BatchConfigurationError("BatchAccountKey is not configured.", "BatchAccountKey");
if (!config.poolId)
  throw new BatchConfigurationError("BatchPoolId is not configured.", "BatchPoolId");

// Initialize client
const credentials = new BatchSharedKeyCredentials(
  config.batchAccountName,
  config.batchAccountKey
);

this.batchClient = new BatchServiceClient(credentials, config.batchAccountUrl);
```

---

## Job Submission: submitJob()

**Location:** Lines 111-191

**Signature:**
```typescript
public async submitJob(
  documentId: string,
  scenarioId: string,
  scenarioName: string,
  applicationId?: string,
  appVersion?: string
): Promise<string>
```

**Returns:** Success message: `"Job '{jobId}' with task '{taskId}' submitted successfully."`

### Execution Flow

#### Step 1: Generate IDs (lines 124-125)

```typescript
const jobId = `Job-${randomUUID()}`;
const taskId = `Task-${randomUUID()}`;
```

**Format:**
- Job ID: `Job-550e8400-e29b-41d4-a716-446655440000`
- Task ID: `Task-6ba7b810-9dad-11d1-80b4-00c04fd430c8`

---

#### Step 2: Create Batch Job with Retry (lines 128-144)

**Purpose:** Create the job container in Azure Batch

**Retry Configuration:**
```typescript
{
  maxAttempts: 3,
  factor: 2,              // Exponential backoff multiplier
  timeout: 30000,         // 30 seconds max per attempt
  handleError: async (error, context) => {
    console.warn('[BatchService] Job creation retry:', {
      attempt: context.attemptNum,
      error: error.message
    });
  }
}
```

**Job Parameters:**
```typescript
const poolInfo: PoolInformation = {
  poolId: this.poolId  // e.g., "dev-quodsi-pool"
};

const jobParams: JobAddParameter = {
  id: jobId,
  poolInfo: poolInfo,
  constraints: {
    maxWallClockTime: "PT1H",     // 1 hour maximum
    maxTaskRetryCount: 1          // Retry once on failure
  },
  onAllTasksComplete: "terminatejob"  // Auto-terminate when done
};

await this.batchClient.job.add(jobParams);
```

**Pool Information:**
- Pool must exist before job creation
- Pool contains compute nodes (VMs) for execution
- Pool configuration includes VM size, OS, and application packages

**Job Constraints:**
- `maxWallClockTime`: Hard limit for job execution (1 hour)
- `maxTaskRetryCount`: Number of automatic retries on task failure
- `onAllTasksComplete`: Auto-cleanup behavior

**Retry Behavior:**
- Attempt 1: Immediate
- Attempt 2: 2s delay
- Attempt 3: 4s delay
- Total max time: 90s (30s × 3)

---

#### Step 3: Create and Submit Task (lines 148-168)

**Purpose:** Create the actual simulation task within the job

**Retry Configuration:** Same as job creation (3 attempts, exponential backoff)

**Command Line Construction:**

```typescript
const appPackageEnvVar = `AZ_BATCH_APP_PACKAGE_${applicationId.toLowerCase()}_${appVersion.replace(".", "_")}`;

const taskCommandLine = `/bin/bash -c "source $AZ_BATCH_NODE_STARTUP_DIR/wd/batch_env/bin/activate && python3 -m pip list && cd $${appPackageEnvVar} && python3 -m quodsim_runner.lucidchart.cli --document-id \\"${documentId}\\" --scenario-id \\"${scenarioId}\\" --scenario-name \\"${scenarioName}\\""`;
```

**Command Breakdown:**
1. `source $AZ_BATCH_NODE_STARTUP_DIR/wd/batch_env/bin/activate` - Activate Python virtual environment
2. `python3 -m pip list` - List installed packages (diagnostic)
3. `cd $AZ_BATCH_APP_PACKAGE_dev_quodsim_1_0` - Change to app package directory
4. `python3 -m quodsim_runner.lucidchart.cli` - Run simulation CLI
5. `--document-id "{documentId}"` - Document identifier
6. `--scenario-id "{scenarioId}"` - Scenario identifier
7. `--scenario-name "{scenarioName}"` - Human-readable name

**Environment Variables:**

```typescript
environmentSettings: [
  { name: "BATCH_ACCOUNT_NAME", value: this.batchAccountName },
  { name: "BATCH_ACCOUNT_KEY", value: this.batchAccountKey },
  { name: "BATCH_URL", value: this.batchAccountUrl },
  { name: "AZURE_STORAGE_CONNECTION_STRING", value: config.azureStorageConnectionString },
  { name: "AZURE_STORAGE_URL", value: this.extractStorageUrlFromConnectionString(...) },
  { name: "QUODSIM_UPLOAD_MODE", value: "both" }
]
```

**Purpose of Environment Variables:**
- `BATCH_ACCOUNT_*`: Allow simulation runner to interact with Batch API
- `AZURE_STORAGE_*`: Allow simulation runner to read model and write results
- `QUODSIM_UPLOAD_MODE`: Controls output upload behavior
  - `"both"`: Upload to both blob storage and data connector (default)
  - `"blob"`: Upload only to blob storage
  - `"connector"`: Upload only via data connector

**Task Parameters:**
```typescript
const taskParams: TaskAddParameter = {
  id: taskId,
  commandLine: taskCommandLine,
  environmentSettings: [...]
};

await this.batchClient.task.add(jobId, taskParams);
```

---

#### Step 4: Return Success (lines 170-171)

```typescript
console.log('[BatchService] Successfully submitted job with task:', {
  jobId, taskId, scenarioId, scenarioName
});

return `Job '${jobId}' with task '${taskId}' submitted successfully.`;
```

---

## Retry Logic

### Retry Library

**Package:** `@lifeomic/attempt`

**Usage:**
```typescript
import { retry, AttemptContext, PartialAttemptOptions } from '@lifeomic/attempt';

await retry(async () => {
  // Operation to retry
  await this.batchClient.job.add(jobParams);
}, this.jobRetryOptions);
```

### Retry Configuration

#### Job Creation (lines 32-43)
```typescript
private readonly jobRetryOptions: PartialAttemptOptions<any> = {
  maxAttempts: 3,
  factor: 2,
  timeout: 30000,
  handleError: async (error: any, context: AttemptContext) => {
    console.warn('[BatchService] Job creation retry:', {
      attempt: context.attemptNum,
      error: error.message,
      code: error.code
    });
  }
};
```

#### Task Submission (lines 45-56)
```typescript
private readonly taskRetryOptions: PartialAttemptOptions<void> = {
  maxAttempts: 3,
  factor: 2,
  timeout: 30000,
  handleError: async (error: any, context: AttemptContext) => {
    console.warn('[BatchService] Task submission retry:', {
      attempt: context.attemptNum,
      error: error.message,
      code: error.code
    });
  }
};
```

### Retry Timing

| Attempt | Wait Time | Total Elapsed |
|---------|-----------|---------------|
| 1 | 0s | 0s |
| 2 | 2s | 2s |
| 3 | 4s | 6s |

**Formula:** `waitTime = initialDelay * (factor ^ (attemptNum - 1))`

**Max Per Operation:** 30s timeout × 3 attempts = 90s maximum

---

## Error Handling

### Custom Error Classes

**Location:** `dataconnectors/quodsi_data_connector_lucidchart_v2/src/services/errors/batchErrors.ts`

#### BatchConfigurationError

**Thrown when:** Missing or invalid configuration values

**Properties:**
```typescript
{
  message: string;          // Error description
  configurationKey: string; // Which config value is invalid
  innerError?: Error;       // Original error if any
}
```

**Example:**
```typescript
throw new BatchConfigurationError(
  "BatchAccountUrl is not configured.",
  "BatchAccountUrl"
);
```

---

#### BatchJobCreationError

**Thrown when:** Job or task creation fails

**Properties:**
```typescript
{
  message: string;          // Error description
  jobId: string;            // Job ID that failed
  batchError?: any;         // Azure Batch API error
  innerError?: Error;       // Original error
}
```

**Example:**
```typescript
throw new BatchJobCreationError(
  "Job already exists",
  jobId,
  error
);
```

---

### Error Scenarios

#### Configuration Errors (Constructor)

**Lines:** 61-64, 84-88

**Scenarios:**
- Missing `batchAccountUrl`
- Missing `batchAccountName`
- Missing `batchAccountKey`
- Missing `poolId`

**Response:** Throws `BatchConfigurationError` immediately

---

#### Job Creation Errors (lines 182-187)

**Scenarios:**
- Job ID already exists (`error.code === 'JobExists'`)
- Pool not found
- Invalid credentials
- Network timeout

**Handling:**
```typescript
if (error.code === 'JobExists') {
  throw new BatchJobCreationError("Job already exists", '', error);
}
if (error.code) {
  throw new BatchJobCreationError(`Batch error: ${error.message}`, '', error);
}
throw new BatchConfigurationError("An unexpected error occurred...", "Unknown", error);
```

---

#### Task Creation Errors (lines 173-189)

**Scenarios:**
- Task ID already exists
- Job not found
- Command line too long
- Invalid environment variables

**Handling:** Same as job creation errors

---

## Helper Methods

### extractStorageUrlFromConnectionString()

**Location:** Lines 92-109

**Purpose:** Extract blob storage URL from connection string

**Logic:**
```typescript
private extractStorageUrlFromConnectionString(connectionString: string): string {
  let storageUrl = "https://devquodsist01.blob.core.windows.net"; // Default

  try {
    // Parse connection string for AccountName
    const accountNameMatch = connectionString.match(/AccountName=([^;]+)/i);
    if (accountNameMatch && accountNameMatch[1]) {
      const accountName = accountNameMatch[1];
      storageUrl = `https://${accountName}.blob.core.windows.net`;
    }
  } catch (error) {
    console.warn('[BatchService] Failed to extract storage URL, using default');
  }

  return storageUrl;
}
```

**Input:** `"DefaultEndpointsProtocol=https;AccountName=devquodsist01;AccountKey=..."`

**Output:** `"https://devquodsist01.blob.core.windows.net"`

**Fallback:** Uses default URL if parsing fails

---

## Azure Batch Concepts

### Pool

**Definition:** Collection of compute nodes (VMs) for running tasks

**Configuration:**
- VM size (e.g., `Standard_D2s_v3`)
- Operating system (e.g., Ubuntu 20.04)
- Node count (min/max auto-scale)
- Application packages
- Start tasks (environment setup)

**Pool Name Example:** `dev-quodsi-pool`

---

### Job

**Definition:** Container for one or more related tasks

**Properties:**
- Associated with a specific pool
- Has constraints (max runtime, retry count)
- Can be scheduled or on-demand
- Auto-terminates when tasks complete

**Job ID Example:** `Job-550e8400-e29b-41d4-a716-446655440000`

---

### Task

**Definition:** Individual unit of work executed on a compute node

**Properties:**
- Associated with a job
- Has command line to execute
- Can have resource files
- Reports exit code and output

**Task ID Example:** `Task-6ba7b810-9dad-11d1-80b4-00c04fd430c8`

---

### Application Package

**Definition:** ZIP file containing application code deployed to nodes

**Structure:**
```
dev_quodsim_1.0.zip
  ├── quodsim_runner/
  │   ├── __init__.py
  │   ├── lucidchart/
  │   │   ├── cli.py
  │   │   └── ...
  │   └── ...
  └── requirements.txt
```

**Deployment:**
1. Upload ZIP to Azure Batch account
2. Associate with pool
3. Extracted to `$AZ_BATCH_APP_PACKAGE_dev_quodsim_1_0` on nodes

---

## Performance Considerations

### Operation Timing

| Operation | Typical Duration | Notes |
|-----------|-----------------|-------|
| Job creation | 500-1500ms | Network + API processing |
| Task creation | 500-1500ms | Network + API processing |
| Total submission | 1-3s | With retries: 2-6s worst case |

### Retry Impact

**Best Case (no retries):** 1-3 seconds

**Worst Case (all retries used):**
- Job creation: 90s max
- Task creation: 90s max
- Total: 180s (3 minutes)

**Typical:** 1-5 seconds (retries rare in production)

---

## Testing

### Unit Testing

**Challenges:**
- Requires Azure Batch account
- Expensive to run repeatedly
- Difficult to mock Azure SDK

**Recommendations:**
- Mock `BatchServiceClient`
- Test retry logic separately
- Test error handling with fake errors

### Integration Testing

**Prerequisites:**
- Azure Batch account with pool
- Application package deployed
- Valid credentials

**Test Scenarios:**
1. Successful job submission
2. Job already exists (retry)
3. Invalid pool ID
4. Invalid credentials
5. Network timeout simulation

---

## Related Documentation

- [04. Data Connector Integration](./04_data_connector_integration.md) - Caller of this service
- [07. Error Handling](./07_error_handling.md) - Complete error scenarios
- [troubleshooting.md](./troubleshooting.md) - Common batch issues
