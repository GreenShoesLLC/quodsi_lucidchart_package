# 04. Data Connector Integration

Detailed documentation of the Azure Function that orchestrates model storage and batch job submission.

## Overview

The data connector serves as the bridge between the LucidChart extension and Azure cloud services. It performs two critical functions:
1. **Model Storage:** Upload serialized model JSON to Azure Blob Storage
2. **Job Submission:** Create and submit Azure Batch jobs for simulation execution

**Primary Files:**
- `dataconnectors/quodsi_data_connector_lucidchart_v2/src/functions/saveAndSubmitSimulation.ts`
- `src/utils/LucidDataActionUtility.ts` (Extension wrapper)

## Architecture

```
Extension                      Azure Function                  Azure Services
   │                                 │                              │
   │  LucidDataActionUtility         │                              │
   ├─────────────────────────────────>│                              │
   │  performDataAction()            │                              │
   │                                 │                              │
   │  [OAuth Workaround]             │                              │
   │                                 │                              │
   │                                 │  saveAndSubmitSimulation()   │
   │                                 ├───────────────────────────────┐
   │                                 │  Phase 1: Storage Upload     │
   │                                 │  ┌─────────────────────────> │
   │                                 │  │  uploadBlobContent()       │
   │                                 │  │                  Blob      │
   │                                 │  │                  Storage   │
   │                                 │  └<──────────────────────────┤
   │                                 │                              │
   │                                 │  Phase 2: Batch Submission   │
   │                                 │  ┌─────────────────────────> │
   │                                 │  │  submitJob()               │
   │                                 │  │                  Azure     │
   │                                 │  │                  Batch     │
   │                                 │  └<──────────────────────────┤
   │                                 │                              │
   │<─────────────────────────────────┤                              │
   │  Success response                │                              │
```

## OAuth Workaround: LucidDataActionUtility

**Purpose:** Handle LucidChart API OAuth requirement before performDataAction()

**Location:** `src/utils/LucidDataActionUtility.ts:31-59`

### Why It Exists

LucidChart's `performDataAction()` requires OAuth to be triggered once per session. Without this workaround, the first data action call may fail silently.

### Implementation

```typescript
export class LucidDataActionUtility {
  private static hasTriggeredOauth: boolean = false;

  public static async performDataAction(
    client: any,
    params: DataActionParams
  ): Promise<any> {
    // First-time OAuth trigger
    if (!this.hasTriggeredOauth) {
      try {
        console.log("Triggering OAuth workaround");
        await client.oauthXhr("lucid", {
          url: "https://api.lucid.co/folders/search",
          headers: {
            "Lucid-Api-Version": "1",
            "Content-Type": "application/json",
          },
          data: "{}",
          method: "POST",
        });

        this.hasTriggeredOauth = true;
        console.log("Successfully triggered OAuth");
      } catch (error) {
        console.error("OAuth workaround error:", error);
        // Continue anyway
      }
    }

    // Now perform actual data action
    return await client.performDataAction(params);
  }
}
```

### Usage

```typescript
await LucidDataActionUtility.performDataAction(client, {
  dataConnectorName: 'quodsi_data_connector',
  actionName: 'SaveAndSubmitSimulation',
  actionData: {
    documentId,
    scenarioId,
    model: serializedModel,
    scenarioName,
    diagramSvg,
    appVersion
  },
  asynchronous: true
});
```

**Key Points:**
- OAuth triggered only once per session (tracked in static property)
- Dummy API call to `/folders/search` activates OAuth flow
- Errors in OAuth don't block the actual data action
- `resetOauthTriggerStatus()` available for testing

---

## Azure Function: saveAndSubmitSimulation

**Endpoint:** `POST /api/simulation/save-and-submit`

**Authentication:** Anonymous (handled via LucidChart's data connector authentication)

**Location:** `dataconnectors/quodsi_data_connector_lucidchart_v2/src/functions/saveAndSubmitSimulation.ts:33-300`

### Request Interface

```typescript
interface SaveAndSubmitRequest {
  documentId: string;         // LucidChart document ID
  scenarioId: string;          // Scenario identifier (typically baseline GUID)
  model: any;                  // Serialized ModelDefinition JSON
  applicationId?: string;      // Batch application ID (default: "dev_quodsim")
  appVersion?: string;         // Application version (default: "1.0")
}
```

### Response Interfaces

#### Success Response

```typescript
interface SuccessResponse {
  blobUrl: string;             // "{documentId}/model_{scenarioId}.json"
  uploadDateTime: string;      // ISO 8601 timestamp
  batchJob: {
    message: string;           // "Job '{jobId}' with task '{taskId}' submitted"
    jobId?: string;            // Azure Batch job ID
    taskId?: string;           // Azure Batch task ID
  }
}
```

#### Error Response

```typescript
interface ErrorResponse {
  message: string;             // Error description
  details?: any;               // Additional error information
  phase?: string;              // "validation" | "upload" | "batch" | "unknown"
}
```

---

## Phase 1: Model Storage Upload

**Lines:** 90-147

### Purpose

Upload the serialized model definition to Azure Blob Storage for access by the simulation runner.

### Steps

#### 1. Parse and Validate Request (lines 54-85)

```typescript
const requestBody = await request.json() as SaveAndSubmitRequest;
const { documentId, scenarioId, model, applicationId, appVersion } = requestBody;

if (!documentId || !scenarioId || !model) {
  return {
    status: 400,
    jsonBody: {
      message: "Missing required fields: documentId, scenarioId, or model",
      phase: "validation"
    }
  };
}
```

**Validation:**
- documentId must be present
- scenarioId must be present
- model object must exist

---

#### 2. Initialize Storage Service (lines 94-96)

```typescript
const config = getConfig();
const storageService = new AzureStorageService(config.azureStorageConnectionString);
```

**Configuration Source:**
- Environment variable: `AZURE_STORAGE_CONNECTION_STRING`
- Format: `DefaultEndpointsProtocol=https;AccountName=...;AccountKey=...`

---

#### 3. Serialize Model (lines 100-108)

```typescript
const serializeStart = Date.now();
const modelJson = JSON.stringify(model, null, 2);  // Pretty-printed
metrics.modelSerializationDuration = Date.now() - serializeStart;
metrics.modelSize = modelJson.length;

// Calculate compression ratio
const originalSize = JSON.stringify(model).length;
metrics.compressionRatio = originalSize ? (modelJson.length / originalSize) : 1;
```

**Output:**
- Pretty-printed JSON (2-space indentation)
- Typical size: 10KB-500KB depending on model complexity

**Performance:**
- Typical duration: 5-50ms
- Compression ratio: ~1.0 (no compression, just formatting)

---

#### 4. Upload to Blob Storage (lines 116-127)

```typescript
const blobName = "model_" + scenarioId + ".json";

const uploadSuccess = await storageService.uploadBlobContent(
  documentId,  // Container name
  blobName,
  modelJson
);

if (!uploadSuccess) {
  return {
    status: 500,
    jsonBody: {
      message: "Failed to upload model definition",
      phase: "upload"
    }
  };
}
```

**Storage Structure:**
```
Container: {documentId}
  └─ Blob: model_{scenarioId}.json
```

**Example:**
```
Container: abc123-def456-789
  └─ Blob: model_00000000-0000-0000-0000-000000000000.json
```

**Upload Metrics:**
- Typical duration: 500ms-2s
- Network dependent
- Retries handled by Azure SDK

---

## Phase 2: Batch Job Submission

**Lines:** 149-189

### Purpose

Create and submit an Azure Batch job to execute the simulation using the uploaded model.

### Steps

#### 1. Initialize Batch Service (lines 162-169)

```typescript
const batchService = new LucidSimulationJobSubmissionService({
  batchAccountUrl: config.batchAccountUrl,
  batchAccountName: config.batchAccountName,
  batchAccountKey: config.batchAccountKey,
  poolId: config.batchPoolId,
  defaultApplicationId: config.defaultApplicationId,
  defaultAppVersion: config.defaultAppVersion
});
```

**Configuration Sources:**
- `BATCH_ACCOUNT_URL`: `https://{accountName}.{region}.batch.azure.com`
- `BATCH_ACCOUNT_NAME`: Batch account name
- `BATCH_ACCOUNT_KEY`: Batch account access key
- `BATCH_POOL_ID`: Pool to use for execution
- `DEFAULT_APPLICATION_ID`: Application package ID
- `DEFAULT_APP_VERSION`: Application version

---

#### 2. Submit Job (lines 178-183)

```typescript
const batchResult = await batchService.submitJob(
  documentId,
  scenarioId,
  applicationId,
  appVersion
);
```

**Returns:** String message: `"Job '{jobId}' with task '{taskId}' submitted successfully."`

**Details:** See [05_batch_service.md](./05_batch_service.md)

---

#### 3. Parse Job IDs (lines 192-193)

```typescript
const jobIdMatch = batchResult.match(/Job '([^']+)'/);
const taskIdMatch = batchResult.match(/task '([^']+)'/);
```

**Extraction:** Use regex to extract UUIDs from success message

---

#### 4. Build Response (lines 195-203)

```typescript
const response: SuccessResponse = {
  blobUrl: documentId + "/" + blobName,
  uploadDateTime: new Date().toISOString(),
  batchJob: {
    message: batchResult,
    jobId: jobIdMatch?.[1],
    taskId: taskIdMatch?.[1]
  }
};

return {
  status: 200,
  jsonBody: response
};
```

---

## Performance Metrics

The function tracks and logs comprehensive performance metrics:

**Location:** Lines 34-41, 206-225

### Metrics Tracked

```typescript
const metrics = {
  startTime: Date.now(),
  uploadDuration: 0,
  batchSubmitDuration: 0,
  modelSize: 0,
  compressionRatio: 0,
  modelSerializationDuration: 0
};
```

### Logged on Success

```typescript
{
  totalDuration: "2500ms",
  modelSerializationDuration: "10ms",
  uploadDuration: "800ms",
  batchSubmitDuration: "1200ms",
  modelSize: 45000,
  compressionRatio: 1.0,
  documentId: "abc123",
  scenarioId: "00000000-0000-0000-0000-000000000000",
  jobId: "Job-uuid",
  taskId: "Task-uuid",
  blobUrl: "abc123/model_00000000-0000-0000-0000-000000000000.json",
  performanceBreakdown: {
    modelSerialization: "0%",
    upload: "32%",
    batchSubmit: "48%",
    other: "20%"
  }
}
```

**Typical Breakdown:**
- Model serialization: 5-50ms (< 2%)
- Upload: 500-2000ms (20-40%)
- Batch submit: 1000-3000ms (40-60%)
- Other (parsing, validation): 100-500ms (5-20%)

---

## Error Handling

### Error Types

#### 1. Validation Errors

**HTTP Status:** 400

**Example:**
```json
{
  "message": "Missing required fields: documentId, scenarioId, or model",
  "phase": "validation"
}
```

**Cause:** Missing required request fields

---

#### 2. Upload Errors

**HTTP Status:** 500

**Example:**
```json
{
  "message": "Failed to upload model definition",
  "phase": "upload"
}
```

**Causes:**
- Azure Storage connection issues
- Invalid storage account credentials
- Container creation failure
- Network timeout

---

#### 3. Batch Configuration Errors

**HTTP Status:** 500

**Example:**
```json
{
  "message": "Batch configuration error",
  "phase": "batch",
  "details": {
    "configurationKey": "BatchAccountUrl",
    "message": "BatchAccountUrl is not configured."
  }
}
```

**Causes:**
- Missing environment variables
- Invalid batch account URL
- Invalid credentials

---

#### 4. Batch Job Creation Errors

**HTTP Status:** 500

**Example:**
```json
{
  "message": "Failed to create batch job",
  "phase": "batch",
  "details": {
    "jobId": "Job-uuid",
    "batchError": {...},
    "message": "Job already exists"
  }
}
```

**Causes:**
- Job ID collision
- Pool not available
- Task creation failure
- Network timeout

---

### Error Logging

All errors are logged with comprehensive context:

```typescript
{
  type: "BatchConfigurationError",
  message: "BatchAccountUrl is not configured.",
  stack: "...",
  metrics: {
    totalDuration: "100ms",
    modelSerializationDuration: "10ms",
    uploadDuration: "0ms",
    batchSubmitDuration: "0ms",
    modelSize: 45000,
    compressionRatio: 1.0
  }
}
```

**Metrics at Error Time:**
- Shows how far execution progressed
- Identifies performance bottlenecks before error
- Aids in diagnosing timeout vs. configuration issues

---

## Configuration Management

**Location:** `dataconnectors/quodsi_data_connector_lucidchart_v2/src/config.ts`

### Environment Variables

```typescript
interface Config {
  azureStorageConnectionString: string;
  batchAccountUrl: string;
  batchAccountName: string;
  batchAccountKey: string;
  batchPoolId: string;
  defaultApplicationId: string;
  defaultAppVersion: string;
}
```

### Local Development

**Template:** `local.settings.json.template`

```json
{
  "IsEncrypted": false,
  "Values": {
    "AzureWebJobsStorage": "UseDevelopmentStorage=true",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "AZURE_STORAGE_CONNECTION_STRING": "...",
    "BATCH_ACCOUNT_URL": "https://devquodsi.eastus.batch.azure.com",
    "BATCH_ACCOUNT_NAME": "devquodsi",
    "BATCH_ACCOUNT_KEY": "...",
    "BATCH_POOL_ID": "dev-quodsi-pool",
    "DEFAULT_APPLICATION_ID": "dev_quodsim",
    "DEFAULT_APP_VERSION": "1.0"
  }
}
```

**Setup:**
1. Copy `local.settings.json.template` to `local.settings.json`
2. Fill in actual values from Azure Portal
3. Never commit `local.settings.json` (in `.gitignore`)

---

## Testing

### Local Testing

**Prerequisites:**
- Azure Functions Core Tools
- Valid Azure credentials
- Configured `local.settings.json`

**Commands:**
```bash
cd dataconnectors/quodsi_data_connector_lucidchart_v2
npm install
npm start
```

**Test Endpoint:**
```bash
curl -X POST http://localhost:7071/api/simulation/save-and-submit \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "test-doc-123",
    "scenarioId": "00000000-0000-0000-0000-000000000000",
    "model": {"name": "Test Model", "version": "1.0"}
  }'
```

### Integration Testing

**Test Scenarios:**
1. Successful submission with valid model
2. Missing required fields (validation error)
3. Invalid storage credentials (upload error)
4. Invalid batch credentials (batch error)
5. Large model (>1MB) upload
6. Concurrent submissions (multiple documents)

---

## Related Documentation

- [03. Extension Handler](./03_extension_handler.md) - Caller of this function
- [05. Batch Service](./05_batch_service.md) - Batch job creation details
- [07. Error Handling](./07_error_handling.md) - Complete error scenarios
- [troubleshooting.md](./troubleshooting.md) - Common issues and solutions
