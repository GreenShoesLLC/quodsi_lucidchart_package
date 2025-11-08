# 03. Extension Handler

Deep dive into the SimulationHandler class responsible for coordinating simulation execution in the extension host process.

## Overview

The `SimulationHandler` is a static class that manages the complete simulation lifecycle within the LucidChart extension. It handles message routing, model preparation, job tracking, and status updates.

**Primary File:** `src/core/messaging/handlers/simulationHandler.ts`

## Class Structure

### Static Properties

```typescript
class SimulationHandler {
  // Job tracking map
  private static activeJobs: Map<string, {
    documentId: string;
    scenarioId: string;
    scenarioName?: string;
    status: SimulationStatus;
    progress: number;
    startTime: Date;
    lastUpdate: Date;
    pollInterval?: NodeJS.Timeout;
  }> = new Map();
}
```

**Purpose:** Track all active simulation jobs in-memory

**Additional Properties:**
- `scenarioId` - Scenario identifier for this job
- `pollInterval` - Interval handle for status polling (can be cleared)

**Lifecycle:** Jobs remain in map until completion + 60 seconds

---

### Public Methods

#### handleMessage()

**Signature:**
```typescript
public static handleMessage(msg: EnvelopeBase): boolean
```

**Location:** `simulationHandler.ts:43-62`

**Purpose:** Entry point for all simulation-related messages

**Logic:**
```typescript
switch (msg.type) {
  case EnvelopeMessageType.MODEL_RUN_REQUEST:
    // Async handler - fire and forget
    SimulationHandler.handleRunRequest(msg).catch(error => {
      console.error('[SimulationHandler] Error in handleRunRequest:', error);
    });
    return true;

  default:
    return false;  // Not a simulation message
}
```

**Note:** The handler only processes MODEL_RUN_REQUEST messages. Status updates are initiated internally via polling, not through incoming messages.

**Returns:** `true` if message was handled, `false` otherwise

---

#### getActiveJobs()

**Signature:**
```typescript
public static getActiveJobs(): Array<{
  jobId: string;
  documentId: string;
  scenarioName?: string;
  status: SimulationStatus;
  progress: number;
  startTime: Date;
  lastUpdate: Date;
}>
```

**Location:** `simulationHandler.ts:511-516`

**Purpose:** Query all currently tracked simulation jobs

**Usage:** Debugging, dashboard displays, status monitoring

---

#### getJob()

**Signature:**
```typescript
public static getJob(jobId: string): JobInfo | null
```

**Location:** `simulationHandler.ts:521-524`

**Purpose:** Query a specific simulation job by ID

---

#### stopPolling()

**Signature:**
```typescript
public static stopPolling(jobId: string): void
```

**Location:** `simulationHandler.ts:556-569`

**Purpose:** Stop polling for a specific job and clean up resources

**Usage:** Called when user navigates away from page or cancels simulation

---

#### resumePollingIfNeeded()

**Signature:**
```typescript
public static resumePollingIfNeeded(documentId: string): void
```

**Location:** `simulationHandler.ts:574-588`

**Purpose:** Resume polling for any jobs associated with a document when panel is reopened

**Usage:** Called when user returns to a page with active simulations

---

## Core Handler: handleRunRequest()

This is the primary handler that orchestrates the simulation execution.

**Location:** `simulationHandler.ts:70-340`

### Execution Flow

#### Phase 1: Initialization (lines 86-118)

**Purpose:** Obtain necessary SDK instances

**Steps:**
1. Get ModelManager singleton
2. Get EditorClient (with fallback to global)
3. Create Viewport, DocumentProxy, UserProxy
4. Get active page

**Error Handling:**
- If EditorClient unavailable, send error status and return
- If no active page, send error status and return

**Code Reference:**
```typescript
const modelManager = ModelManager.getInstance();
let client: EditorClient;

try {
  client = ModelManager.getClient();
} catch (error) {
  // Try fallback to global
  if ((globalThis as any).lucidEditorClient) {
    client = (globalThis as any).lucidEditorClient;
  } else {
    // Send error response
    router.send('model', {
      // ... error message
    });
    return true;
  }
}
```

---

#### Phase 2: Model Loading (lines 148-209)

**Purpose:** Ensure ModelDefinition is available for the current page

**Steps:**
1. Check if model is already loaded: `modelManager.getModelDefinition()`
2. If not loaded:
   - Check if page is a Quodsi model: `modelManager.isQuodsiModel(activePageProxy)`
   - Initialize with basic model: `modelManager.initializeModel(basicModel, activePageProxy)`
3. Verify ModelDefinition exists after initialization

**Error Scenarios:**
- Page is not a Quodsi model → Send error "Please convert it first"
- No model definition found → Send error "No model definition found"

**Code Reference:**
```typescript
const currentModelDef = await modelManager.getModelDefinition();
if (!currentModelDef) {
  const isQuodsiModel = modelManager.isQuodsiModel(activePageProxy);
  if (!isQuodsiModel) {
    // Error: not a Quodsi model
  }

  const basicModel = Model.createDefault(documentProxy.id);
  await modelManager.initializeModel(basicModel, activePageProxy);
}

const modelDefinition = await modelManager.getModelDefinition();
if (!modelDefinition) {
  // Error: no model definition
}
```

---

#### Phase 3: Serialization (lines 212-215)

**Purpose:** Convert ModelDefinition to JSON format for transmission

**Steps:**
1. Create serializer: `ModelSerializerFactory.create(modelDefinition)`
2. Serialize: `serializer.serialize(modelDefinition)`

**Output:** JSON object representing the complete model

**Code Reference:**
```typescript
const serializer = ModelSerializerFactory.create(modelDefinition);
const serializedModel = serializer.serialize(modelDefinition);
console.log('[SimulationHandler] Model serialized successfully');
```

**Related:** See `shared/src/serialization/ModelSerializerFactory.ts`

---

#### Phase 4: SVG Capture (lines 218-220)

**Purpose:** Get visual representation of the diagram

**Steps:**
1. Call `activePageProxy.getSvg(undefined, true)`
2. Store SVG string for submission

**Parameters:**
- `undefined` - Use default bounds (entire page)
- `true` - Include embedded images

**Code Reference:**
```typescript
const diagramSvg = await activePageProxy.getSvg(undefined, true);
console.log('[SimulationHandler] SVG obtained successfully');
```

---

#### Phase 5: Job ID Generation (lines 223-224)

**Purpose:** Create unique identifier for this simulation job

**Format:** `job-{documentId}-{timestamp}`

**Example:** `job-abc123-1697654321000`

**Code Reference:**
```typescript
const jobId = `job-${documentProxy.id}-${Date.now()}`;
```

---

#### Phase 6: Send Initial Status (lines 260-277)

**Purpose:** Inform React that request was received and job is queued

**Message:** `MODEL_RUN_STATUS` with status `QUEUED`

**Payload:**
```typescript
{
  jobId,
  documentId,
  scenarioId,
  scenarioName,
  status: SimulationStatus.QUEUED,
  progress: 0,
  currentStep: 'Queued for execution',
  lastChecked: new Date().toISOString(),
  queuedAt: new Date().toISOString()
}
```

**Code Reference:**
```typescript
router.send('model', {
  id: '',  // New ID for status message
  type: EnvelopeMessageType.MODEL_RUN_STATUS,
  source: 'host',
  target: 'model-iframe',
  version: '1.0',
  data: {
    jobId,
    documentId: data.documentId,
    scenarioId,
    scenarioName: data.scenarioName,
    status: SimulationStatus.QUEUED,
    progress: 0,
    currentStep: 'Queued for execution',
    lastChecked: new Date().toISOString(),
    queuedAt: new Date().toISOString()
  }
});
```

**Note:** This initial MODEL_RUN_STATUS message replaces the previous MODEL_RUN_ACK pattern, serving as both acknowledgment and initial status update.

---

#### Phase 7: Job Tracking (lines 238-246)

**Purpose:** Create in-memory record of job for status tracking

**Data Stored:**
```typescript
{
  documentId: string;
  scenarioId: string;
  scenarioName?: string;
  status: SimulationStatus.QUEUED;
  progress: 0;
  startTime: new Date();
  lastUpdate: new Date();
  pollInterval?: NodeJS.Timeout;
}
```

**Code Reference:**
```typescript
SimulationHandler.activeJobs.set(jobId, {
  documentId: data.documentId,
  scenarioId: scenarioId,
  scenarioName: data.scenarioName,
  status: SimulationStatus.QUEUED,
  progress: 0,
  startTime: new Date(),
  lastUpdate: new Date()
});
```

---

#### Phase 8: Azure Submission (lines 249-264)

**Purpose:** Submit job to Azure via LucidChart data connector

**Method:** `LucidDataActionUtility.performDataAction()`

**Parameters:**
```typescript
{
  dataConnectorName: 'quodsi_data_connector',
  actionName: 'SaveAndSubmitSimulation',
  actionData: {
    documentId: documentProxy.id,
    scenarioId: scenarioId,  // Unique UUID generated via generateUUID()
    model: serializedModel,
    scenarioName: data.scenarioName || 'Generated timestamp name',
    diagramSvg: diagramSvg,
    appVersion: '1.0'
  },
  asynchronous: true
}
```

**Note:** Each simulation run gets a unique `scenarioId` generated via `generateUUID()` (line 253).

**Success Path:**
1. Update job status to `PROCESSING`
2. Send initial status message
3. Start real Azure polling: `pollDocumentStatus(documentId, scenarioId, jobId)`

**Error Path:**
1. Update job status to `FAILED`
2. Send error status message with details

**Code Reference:**
```typescript
try {
  await LucidDataActionUtility.performDataAction(client, {/* params */});

  // Update job status
  const job = SimulationHandler.activeJobs.get(jobId);
  if (job) {
    job.status = SimulationStatus.PROCESSING;
    job.lastUpdate = new Date();
  }

  // Start real Azure polling
  SimulationHandler.pollDocumentStatus(documentId, scenarioId, jobId);

} catch (submitError) {
  // Error handling
}
```

---

## Status Update System

### pollDocumentStatus()

**Location:** `simulationHandler.ts:408-551`

**Purpose:** Poll Azure for real-time simulation status updates

**Polling Interval:** 10 seconds (configurable)

**Implementation Details:**

#### Polling Logic

**Step 1: Initialize Polling** (lines 419-431)
```typescript
private static async pollDocumentStatus(
  documentId: string,
  scenarioId: string,
  jobId: string
): Promise<void> {
  const job = SimulationHandler.activeJobs.get(jobId);
  if (!job) return;

  // Store interval handle for cleanup
  const intervalId = setInterval(async () => {
    await this.checkStatus(documentId, scenarioId, jobId);
  }, 10000); // Poll every 10 seconds

  job.pollInterval = intervalId;
}
```

**Step 2: Status Check via Data Action** (lines 439-464)

Uses `LucidDataActionUtility.performDataAction()` with:
- `actionName: 'GetDocumentStatus'`
- `documentId` parameter
- Returns `PageStatus` with scenario run states

**Step 3: Map RunState to SimulationStatus** (lines 469-504)

Status mapping:
- `"RAN_SUCCESSFULLY"` → `SimulationStatus.COMPLETED` (100%)
- `"RAN_WITH_ERRORS"` → `SimulationStatus.FAILED` (0%)
- `"RUNNING"` → `SimulationStatus.RUNNING` (50-90%)
- `"QUEUED"` → `SimulationStatus.QUEUED` (0%)
- `null` or unknown → `SimulationStatus.PROCESSING` (10%)

**Step 4: Send Status Update** (lines 509-526)

Sends `MODEL_RUN_STATUS` message with:
- Current status
- Progress percentage
- Current step description
- Has results flag

**Step 5: Cleanup on Completion** (lines 528-545)

When status is `COMPLETED` or `FAILED`:
1. Clear polling interval
2. Send final status message
3. Schedule job removal after 60 seconds

#### Error Handling

**Polling Errors** (lines 533-540)
- Log error to console
- Send FAILED status to React
- Clear interval to stop polling
- Keep job in tracking for debugging

#### Job Lifecycle Management

**Stopping Polling:**
```typescript
public static stopPolling(jobId: string): void {
  const job = SimulationHandler.activeJobs.get(jobId);
  if (job?.pollInterval) {
    clearInterval(job.pollInterval);
    job.pollInterval = undefined;
  }
}
```

**Resuming Polling:**
```typescript
public static resumePollingIfNeeded(documentId: string): void {
  for (const [jobId, job] of SimulationHandler.activeJobs.entries()) {
    if (job.documentId === documentId && !job.pollInterval) {
      if (job.status !== SimulationStatus.COMPLETED &&
          job.status !== SimulationStatus.FAILED) {
        SimulationHandler.pollDocumentStatus(documentId, job.scenarioId, jobId);
      }
    }
  }
}
```

**Job Cleanup:**
- Jobs are removed from `activeJobs` map 60 seconds after completion

---

## Error Handling

### Error Response Pattern

All errors send a `MODEL_RUN_STATUS` message with:
```typescript
{
  jobId: 'error' | jobId,
  status: SimulationStatus.FAILED,
  progress: 0,
  error: 'Error description'
}
```

### Error Categories

1. **Initialization Errors** (Phase 1)
   - EditorClient not available
   - No active page

2. **Model Errors** (Phase 2)
   - Page not a Quodsi model
   - Model initialization failed
   - No ModelDefinition found

3. **Submission Errors** (Phase 8)
   - Azure Function error
   - Network connectivity
   - OAuth failure

**Code Reference:** See lines 102-117, 162-177, 191-209, 294-318

---

## Scenario ID Generation

### generateUUID()

**Location:** Line 253 (within handleRunRequest)

**Implementation:**
```typescript
const scenarioId = generateUUID();
```

**Purpose:** Generate a unique identifier for each simulation run

**Format:** Standard UUID v4 (e.g., "a1b2c3d4-e5f6-7890-abcd-ef1234567890")

**Note:** Each simulation gets a unique `scenarioId`, not a constant. This allows multiple scenarios per document to be tracked independently in Azure Storage

---

## Dependencies

### Imported Modules

```typescript
import {
  EnvelopeBase,
  EnvelopeMessageType,
  SimulationStatus,
  ModelSerializerFactory,
  Model
} from '@quodsi/shared';

import {
  DocumentProxy,
  PageProxy,
  UserProxy,
  Viewport,
  EditorClient
} from 'lucid-extension-sdk';

import { router } from '../index';
import { ModelManager } from '../../ModelManager';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
```

---

## Testing Considerations

### Unit Testing

**Challenges:**
- Static class design makes mocking difficult
- Heavy dependency on LucidChart SDK
- Async operations with side effects

**Recommendations:**
- Test message validation logic separately
- Mock ModelManager and router
- Test error scenarios with invalid inputs

### Integration Testing

**Test Scenarios:**
1. Successful simulation submission
2. Model not found error
3. No active page error
4. Azure submission failure
5. Status update progression

---

## Performance Considerations

### Memory Usage

- **Job Tracking:** ~1KB per job
- **Typical Load:** 1-5 concurrent jobs = 5KB
- **Max Load:** 100 jobs = 100KB

### Processing Time

| Phase | Typical Duration | Notes |
|-------|-----------------|-------|
| Initialization | 10-50ms | Fast unless EditorClient recovery needed |
| Model Loading | 50-200ms | Cached if already loaded |
| Serialization | 100-500ms | Depends on model size |
| SVG Capture | 200-1000ms | Depends on diagram complexity |
| Azure Submission | 1000-3000ms | Network + Function execution |

**Total:** 1.5-5 seconds typical

---

## Future Enhancements

1. **Persistent Job Storage**
   - Store jobs in LucidChart storage
   - Survive page reloads
   - Job history

2. **Real Azure Polling**
   - Replace mock with actual batch status API
   - Configurable polling interval
   - Exponential backoff on errors

3. **Cancellation Support**
   - Handle MODEL_RUN_CANCEL message
   - Call Azure Batch cancel job API
   - Update job status to cancelled

4. **Multiple Concurrent Simulations**
   - Support running multiple scenarios simultaneously
   - Queue management if too many concurrent jobs

5. **Detailed Progress Tracking**
   - Report current replication number
   - Estimated time remaining
   - Resource utilization stats

---

## Related Documentation

- [01. Simulation Lifecycle](./01_simulation_lifecycle.md) - Overall flow context
- [02. Message Flow](./02_message_flow.md) - Message details
- [04. Data Connector Integration](./04_data_connector_integration.md) - Azure Function interface
- [06. Status Polling](./06_status_polling.md) - Status update mechanism
- [07. Error Handling](./07_error_handling.md) - Error scenarios
