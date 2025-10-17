# 07. Error Handling

Comprehensive guide to error types, phases, recovery strategies, and debugging approaches for simulation execution.

## Overview

The simulation system spans multiple tiers (React → Extension → Azure Function → Azure Batch), each with distinct error scenarios. This document catalogs all error types and provides recovery strategies.

## Error Phases

Errors can occur at different points in the simulation lifecycle:

| Phase | Location | Typical Errors |
|-------|----------|---------------|
| **UI Trigger** | React/PanelHeader | Button state issues, validation |
| **Message Routing** | Extension/MessageRouter | Invalid envelope, routing failures |
| **Model Preparation** | Extension/SimulationHandler | Model not found, serialization failures |
| **Azure Submission** | Data Connector/saveAndSubmitSimulation | Upload failures, OAuth issues |
| **Batch Creation** | Batch Service/LucidSimulationJobSubmissionService | Configuration errors, job creation failures |
| **Execution** | Azure Batch/Python Runner | Runtime errors, timeouts |
| **Status Polling** | Extension/mockSimulationProgress | Polling failures (future) |

---

## Extension Errors

### Phase 1: Initialization Errors

**Location:** `simulationHandler.ts:86-118`

#### Error: EditorClient Not Available

**Cause:** ModelManager.getClient() fails and no global fallback exists

**Message:**
```typescript
{
  jobId: 'error',
  status: SimulationStatus.FAILED,
  progress: 0,
  error: 'Editor client not initialized. Please try again.'
}
```

**Recovery:**
- Automatic: Try global fallback
- Manual: Reload page
- Prevention: Ensure proper extension initialization

**Code Reference:** Lines 89-117

---

#### Error: No Active Page

**Cause:** User not viewing a page or viewport.getCurrentPage() returns null

**Message:**
```typescript
{
  jobId: 'error',
  status: SimulationStatus.FAILED,
  progress: 0,
  error: 'No active page found'
}
```

**Recovery:**
- Manual: Navigate to a page in LucidChart
- Prevention: Disable simulate button when no page active

**Code Reference:** Lines 126-145

---

### Phase 2: Model Loading Errors

**Location:** `simulationHandler.ts:148-209`

#### Error: Page Not a Quodsi Model

**Cause:** User attempts to simulate a page that wasn't converted to Quodsi model

**Message:**
```typescript
{
  jobId: 'error',
  status: SimulationStatus.FAILED,
  progress: 0,
  error: 'Current page is not a Quodsi model. Please convert it first.'
}
```

**Recovery:**
- Manual: Click "Initialize Quodsi Model" or convert page
- Prevention: Only show simulate button on Quodsi model pages

**Code Reference:** Lines 157-177

---

#### Error: No Model Definition

**Cause:** ModelDefinition could not be loaded or initialized

**Message:**
```typescript
{
  jobId: 'error',
  status: SimulationStatus.FAILED,
  progress: 0,
  error: 'No model definition found. Please ensure the page contains Quodsi model elements.'
}
```

**Recovery:**
- Manual: Add Quodsi elements (Activity, Resource, etc.) to page
- Manual: Re-convert page
- Prevention: Validate page has elements before enabling simulate

**Code Reference:** Lines 189-209

---

### Phase 3: Serialization Errors

**Location:** `simulationHandler.ts:212-215`

#### Error: ModelSerializerFactory Failure

**Cause:** Invalid ModelDefinition structure, missing required fields

**Example:**
```
Error: Cannot serialize model: missing required field 'version'
```

**Message:**
```typescript
{
  jobId: 'error',
  status: SimulationStatus.FAILED,
  progress: 0,
  error: 'Failed to start simulation: {serialization error details}'
}
```

**Recovery:**
- Automatic: None
- Manual: Fix model structure, re-validate
- Prevention: Use ModelValidationService before simulation

**Code Reference:** Lines 320-337 (error catch)

---

### Phase 4: SVG Capture Errors

**Location:** `simulationHandler.ts:218-220`

#### Error: getSvg() Failure

**Cause:** LucidChart API error, complex diagram, embedded images issue

**Example:**
```
Error: Failed to generate SVG: diagram too complex
```

**Message:** Same format as above

**Recovery:**
- Manual: Simplify diagram, remove problematic elements
- Alternative: Retry without SVG (future enhancement)

---

### Phase 5: Azure Submission Errors

**Location:** `simulationHandler.ts:249-318`

#### Error: OAuth Failure

**Cause:** LucidDataActionUtility OAuth workaround fails

**Example:**
```
Error: OAuth request failed: network timeout
```

**Message:**
```typescript
{
  jobId,
  status: SimulationStatus.FAILED,
  progress: 0,
  error: 'Failed to submit simulation: OAuth request failed'
}
```

**Recovery:**
- Automatic: OAuth errors don't block submission (try anyway)
- Manual: Retry simulation
- Prevention: Check network connectivity

**Code Reference:** Lines 294-318

---

#### Error: performDataAction Failure

**Cause:** Network error, data connector unavailable, authentication failure

**Example:**
```
Error: Failed to connect to data connector: ECONNREFUSED
```

**Message:**
```typescript
{
  jobId,
  status: SimulationStatus.FAILED,
  progress: 0,
  error: 'Failed to submit simulation: Failed to connect to data connector'
}
```

**Recovery:**
- Automatic: None
- Manual: Check data connector status, retry
- Prevention: Validate data connector availability before submission

---

## Data Connector Errors

### Phase 1: Validation Errors

**Location:** `saveAndSubmitSimulation.ts:70-85`

#### Error: Missing Required Fields

**HTTP Status:** 400

**Response:**
```json
{
  "message": "Missing required fields: documentId, scenarioId, or model",
  "phase": "validation"
}
```

**Causes:**
- Missing documentId
- Missing scenarioId
- Missing model object

**Recovery:**
- Automatic: None (client bug)
- Manual: Report bug to developers
- Prevention: Validate parameters before sending

---

### Phase 2: Storage Upload Errors

**Location:** `saveAndSubmitSimulation.ts:122-147`

#### Error: Blob Upload Failure

**HTTP Status:** 500

**Response:**
```json
{
  "message": "Failed to upload model definition",
  "phase": "upload"
}
```

**Causes:**
- Invalid storage connection string
- Network timeout
- Storage account permissions
- Container creation failure
- Storage account full/quota exceeded

**Recovery:**
- Automatic: Azure SDK retries (typically 3 attempts)
- Manual: Check storage configuration, retry
- Prevention: Monitor storage account health

---

### Phase 3: Batch Submission Errors

**Location:** `saveAndSubmitSimulation.ts:232-299`

#### Error: BatchConfigurationError

**HTTP Status:** 500

**Response:**
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
- Missing BATCH_ACCOUNT_URL environment variable
- Missing BATCH_ACCOUNT_NAME
- Missing BATCH_ACCOUNT_KEY
- Missing BATCH_POOL_ID

**Recovery:**
- Automatic: None (configuration issue)
- Manual: Fix environment variables, redeploy function
- Prevention: Validate configuration on function startup

**Code Reference:** Lines 250-266

---

#### Error: BatchJobCreationError

**HTTP Status:** 500

**Response:**
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
- Job ID collision (unlikely with UUIDs)
- Pool not available/not found
- Invalid pool configuration
- Batch account permissions
- Task creation failure
- Network timeout

**Recovery:**
- Automatic: Retry logic (3 attempts, exponential backoff)
- Manual: Check batch account, pool status, retry
- Prevention: Validate pool exists and is active

**Code Reference:** Lines 269-287

---

## Batch Service Errors

### BatchConfigurationError

**Location:** `lucidSimulationJobSubmissionService.ts:58-88`

**Class:** Custom error extending `Error`

**Properties:**
```typescript
{
  message: string;
  configurationKey: string;
  innerError?: Error;
}
```

**Scenarios:**
1. Missing `batchAccountUrl`
2. Missing `batchAccountName`
3. Missing `batchAccountKey`
4. Missing `poolId`

**Thrown At:** Constructor, during initialization

**Recovery:** Fix configuration, restart function

---

### BatchJobCreationError

**Location:** `lucidSimulationJobSubmissionService.ts:173-189`

**Class:** Custom error extending `Error`

**Properties:**
```typescript
{
  message: string;
  jobId: string;
  batchError?: any;
  innerError?: Error;
}
```

**Scenarios:**
1. Job already exists (code: 'JobExists')
2. Pool not found
3. Invalid credentials
4. Network timeout
5. Task creation failure

**Thrown At:** submitJob() during job/task creation

**Recovery:**
- JobExists: Generate new job ID (shouldn't happen with UUIDs)
- Other errors: Check configuration, retry

---

## React/UI Errors

### Mapper Errors

**Location:** `simulation.mapper.ts:12-97`

#### Error: Invalid Message Format

**Cause:** Envelope structure validation fails in MessageRouter

**Effect:** Message silently dropped, no UI update

**Recovery:**
- Automatic: None
- Manual: None (shouldn't happen in production)
- Prevention: Use proper message builders

---

#### Error: Status Message with Error Field

**Cause:** Backend sends error status

**Mapping:**
```typescript
if (statusData.status === 'error' || statusData.error) {
  return {
    type: 'SIMULATION_ERROR',
    error: statusData.error || 'Unknown simulation error'
  };
}
```

**UI Effect:**
- Shows error message to user
- Re-enables simulate button
- Logs error to console

**Code Reference:** Lines 52-56

---

### UI State Errors

**Location:** `PanelHeader.tsx:58-69, 124-129`

#### Error: Button Not Re-enabling

**Cause:** simulationStatus never updates to completion

**Symptoms:**
- "Running..." button stays disabled forever
- No error message shown

**Recovery:**
- Manual: Reload page
- Automatic: Timeout on status updates (future)

**Prevention:**
- Always send completion status (success or failure)
- Implement timeout in mock/polling

---

## Error Logging

### Extension Logging

**Format:**
```typescript
console.error('[SimulationHandler] Error in handleRunRequest:', error);
```

**Logged Information:**
- Error message
- Stack trace
- Context (documentId, jobId, etc.)

**Location:** Browser console (F12)

---

### Data Connector Logging

**Format:**
```typescript
context.log(`[${requestId}] Error description`, errorInfo);
```

**Logged Information:**
- Request ID
- Error type
- Error message
- Stack trace
- Performance metrics (how far execution progressed)

**Location:** Azure Functions logs (Application Insights)

---

### Batch Service Logging

**Format:**
```typescript
console.error('[BatchService] Caught unexpected error:', {
  errorMessage: error.message,
  errorCode: error.code,
  errorStack: error.stack
});
```

**Logged Information:**
- Error code (if available)
- Error message
- Stack trace
- Context (jobId, taskId, etc.)

**Location:** Azure Functions logs

---

## Error Recovery Strategies

### Automatic Recovery

1. **OAuth Failures:** Continue with submission anyway
2. **Network Timeouts:** Retry with exponential backoff (3 attempts)
3. **Job Creation Failures:** Retry with exponential backoff (3 attempts)

### Manual Recovery

1. **Configuration Errors:** Fix environment variables, redeploy
2. **Model Errors:** Fix model structure, re-convert page
3. **Permission Errors:** Update Azure permissions
4. **Resource Errors:** Scale up resources, check quotas

### User-Facing Recovery

1. **Show clear error messages** in UI
2. **Provide actionable guidance** (e.g., "Please convert page first")
3. **Enable retry** button after failures
4. **Log details** for developer support

---

## Debugging Approaches

### Browser Console

**Enable:**
1. Open Developer Tools (F12)
2. Go to Console tab
3. Filter by `[SimulationHandler]` or `[MessageRouter]`

**Look For:**
- Error messages
- Stack traces
- Message flow logs

---

### Azure Functions Logs

**Access:**
1. Azure Portal → Function App
2. Monitor → Log Stream OR Application Insights

**Look For:**
- Request IDs
- Error types
- Performance metrics
- Stack traces

---

### Azure Batch Logs

**Access:**
1. Azure Portal → Batch Account
2. Jobs → Select job → Tasks → Select task
3. View stderr.txt and stdout.txt

**Look For:**
- Python runtime errors
- Command execution output
- Environment variable issues

---

## Error Prevention

### Pre-Submission Validation

1. **Validate model** using ModelValidationService
2. **Check page is Quodsi model** before showing simulate button
3. **Verify EditorClient** initialized before handler runs
4. **Test data connector** connectivity periodically

### Configuration Validation

1. **Validate environment variables** on function startup
2. **Check Azure resources** exist (pools, storage accounts)
3. **Test credentials** before first use
4. **Monitor quotas** and limits

### Graceful Degradation

1. **OAuth failures:** Continue anyway (non-blocking)
2. **SVG capture failures:** Continue without SVG (future)
3. **Polling failures:** Retry with backoff, then give up gracefully
4. **Partial results:** Show what's available, flag incomplete

---

## Related Documentation

- [01. Simulation Lifecycle](./01_simulation_lifecycle.md) - Error context in flow
- [02. Message Flow](./02_message_flow.md) - Error messages
- [03. Extension Handler](./03_extension_handler.md) - Extension error handling
- [04. Data Connector Integration](./04_data_connector_integration.md) - Data connector errors
- [05. Batch Service](./05_batch_service.md) - Batch errors
- [troubleshooting.md](./troubleshooting.md) - Common issues and solutions
