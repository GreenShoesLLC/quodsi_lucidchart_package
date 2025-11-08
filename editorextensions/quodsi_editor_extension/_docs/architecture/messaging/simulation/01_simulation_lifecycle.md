# 01. Simulation Lifecycle

Complete end-to-end documentation of simulation execution from user click to results display.

## Overview

The simulation lifecycle spans four major systems and involves approximately 11 distinct steps, from UI interaction through Azure Batch execution. This document traces the complete flow with specific file and line number references.

## Lifecycle Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  USER CLICKS "Run Simulation"                                     │
│  PanelHeader.tsx:124                                              │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  useModelPanel Hook → useSimulationSender                         │
│  useModelPanel.ts:174 → simulationSender.ts:28                   │
│  MESSAGE: MODEL_RUN_REQUEST                                       │
└──────────────────────┬───────────────────────────────────────────┘
                       │ postMessage
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  MessageRouter.receive()                                          │
│  MessageRouter.ts:201                                             │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  SimulationHandler.handleRunRequest()                             │
│  simulationHandler.ts:70                                          │
│  1. Load model                                                    │
│  2. Serialize ModelDefinition                                     │
│  3. Get SVG                                                       │
│  4. Send MODEL_RUN_STATUS (QUEUED) ───┐                         │
│  5. Submit to Data Connector           │                         │
└──────────────────────┬────────────────┘│                         │
                       │                 │                         │
                       ▼                 ▼                         │
┌─────────────────────────────┐  ┌──────────────────────────────┐ │
│  LucidDataActionUtility      │  │  React receives STATUS       │ │
│  LucidDataActionUtility.ts:31│  │  simulation.mapper.ts:25     │ │
│  OAuth + performDataAction   │  │  → SIMULATION_PROGRESS       │ │
└─────────────────────┬────────┘  └──────────────────────────────┘ │
                      │                                             │
                      ▼                                             │
┌──────────────────────────────────────────────────────────────────┤
│  Azure Function: saveAndSubmitSimulation                          │
│  saveAndSubmitSimulation.ts:33                                    │
│  1. Upload model JSON to Blob Storage                            │
│  2. Submit Azure Batch Job                                       │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  LucidSimulationJobSubmissionService.submitJob()                  │
│  lucidSimulationJobSubmissionService.ts:111                       │
│  Creates batch job + task → Python simulation runner             │
└──────────────────────┬───────────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  Status Polling (Extension → React)                               │
│  simulationHandler.ts:407 (mock)                                  │
│  MESSAGE: MODEL_RUN_STATUS (periodic)                             │
│  ────────────────────────────────────────────────────────────────│
│                                                                    │
│  simulation.mapper.ts:39 → SIMULATION_PROGRESS actions           │
│  PanelHeader.tsx:58 → UI updates                                 │
└────────────────────────────────────────────────────────────────────┘
```

## Detailed Step-by-Step Flow

### Step 1: User Initiates Simulation

**Location:** `quodsim-react/src/features/modelPanel/PanelHeader.tsx:75-98`

**Action:**
1. User clicks "Run Simulation" button (only visible when Model element is selected)
2. `handleSimulateClick()` is called
3. Local state `isSimulating` set to `true` (disables button for 2 seconds)
4. Generates timestamp-based scenario name in format: `YY-MM-DD HH:MM:SS`
5. Calls `onSimulate(scenarioName)`

**Code Reference:**
```typescript
const handleSimulateClick = () => {
  if (onSimulate) {
    setIsSimulating(true);

    // Generate user-friendly scenario name with timestamp
    const now = new Date();
    const year = now.getFullYear();
    const twoDigitYear = String(year).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const scenarioName = `${twoDigitYear}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    onSimulate(scenarioName);

    // Clear loading state after 2 seconds
    setTimeout(() => setIsSimulating(false), 2000);
  }
};
```

**Scenario Name Format:** `YY-MM-DD HH:MM:SS` (e.g., "25-01-08 14:32:45")

**Next:** Triggers hook chain

---

### Step 2: Hook Chain Execution

**Location:** `quodsim-react/src/messaging/hooks/useModelPanel.ts:174-177`

**Action:**
1. `useModelPanel` hook provides `onSimulate` callback
2. Calls `simulationSender.requestSimulation(documentId, scenarioName)`

**Code Reference:**
```typescript
const onSimulate = (scenarioName?: string) => {
  logger.log(`Simulating model with scenario name: ${scenarioName}`);
  simulationSender.requestSimulation(documentContext.documentId, scenarioName);
};
```

**Next:** Message sender invoked

---

### Step 3: Message Creation and Sending

**Location:** `quodsim-react/src/messaging/senders/simulationSender.ts:21-35`

**Action:**
1. `useSimulationSender` hook's `requestSimulation` function called
2. Creates `MODEL_RUN_REQUEST` envelope message
3. Sends via `postMessage` to extension

**Payload:**
```typescript
{
  documentId: string,
  scenarioName?: string,
  durationDays?: number,
  repetitions?: number,
  parameters?: Record<string, unknown>
}
```

**Next:** Message received by extension

---

### Step 4: Message Routing

**Location:** `src/core/messaging/MessageRouter.ts:201-245`

**Action:**
1. MessageRouter singleton's `receive()` method called
2. Validates envelope structure with `isEnvelope(msg)`
3. Routes to `MessageHandlers.handleMessage(msg)`
4. MessageHandlers delegates to appropriate handler

**Next:** Simulation handler invoked

---

### Step 5: Simulation Request Handler

**Location:** `src/core/messaging/handlers/simulationHandler.ts:70-340`

**Major Sub-steps:**

#### 5a. Initialization (lines 86-118)
- Get EditorClient instance
- Get ModelManager instance
- Verify active page exists

#### 5b. Model Loading (lines 148-209)
- Check if model is loaded for current page
- If not loaded, check if page is a Quodsi model
- Initialize model if needed
- Retrieve ModelDefinition

#### 5c. Serialization (lines 212-215)
```typescript
const serializer = ModelSerializerFactory.create(modelDefinition);
const serializedModel = serializer.serialize(modelDefinition);
```

#### 5d. SVG Capture (lines 218-220)
```typescript
const diagramSvg = await activePageProxy.getSvg(undefined, true);
```

#### 5e. Generate Job ID (lines 223-224)
```typescript
const jobId = `job-${documentProxy.id}-${Date.now()}`;
```

#### 5f. Send Status Update (lines 260-277)
Sends `MODEL_RUN_STATUS` message with status "QUEUED" back to React with:
- `jobId`
- `documentId`
- `scenarioId` (unique UUID for this simulation run)
- `scenarioName`
- `status: SimulationStatus.QUEUED`
- `progress: 0`
- `currentStep` (optional)
- `lastChecked` (timestamp)
- `queuedAt` (timestamp)

#### 5g. Create Job Tracking (lines 238-246)
Stores job in `SimulationHandler.activeJobs` Map:
```typescript
SimulationHandler.activeJobs.set(jobId, {
  documentId: data.documentId,
  scenarioName: data.scenarioName,
  status: SimulationStatus.QUEUED,
  progress: 0,
  startTime: new Date(),
  lastUpdate: new Date()
});
```

#### 5h. Submit to Data Connector (lines 249-264)
Calls `LucidDataActionUtility.performDataAction()` with:
- `dataConnectorName: 'quodsi_data_connector'`
- `actionName: 'SaveAndSubmitSimulation'`
- Model data, SVG, scenario info

**Next:** OAuth utility wrapper invoked

---

### Step 6: OAuth Workaround

**Location:** `src/utils/LucidDataActionUtility.ts:31-59`

**Action:**
1. Check if OAuth has been triggered this session
2. If first time, trigger OAuth via dummy API call:
   ```typescript
   await client.oauthXhr("lucid", {
     url: "https://api.lucid.co/folders/search",
     // ...
   });
   ```
3. Mark `hasTriggeredOauth = true`
4. Execute actual `client.performDataAction(params)`

**Purpose:** Workaround for LucidChart API OAuth requirement

**Next:** Data connector Azure Function invoked

---

### Step 7: Azure Function Orchestration

**Location:** `dataconnectors/quodsi_data_connector_lucidchart_v2/src/functions/saveAndSubmitSimulation.ts:33-300`

#### Phase 1: Storage Upload (lines 90-147)

**Sub-steps:**
1. Parse and validate request body
2. Initialize `AzureStorageService`
3. Serialize model to JSON: `JSON.stringify(model, null, 2)`
4. Generate blob name: `model_{scenarioId}.json`
5. Upload to blob storage:
   ```typescript
   await storageService.uploadBlobContent(
     documentId,  // container name
     blobName,
     modelJson
   );
   ```

#### Phase 2: Batch Submission (lines 149-189)

**Sub-steps:**
1. Initialize `LucidSimulationJobSubmissionService` with config
2. Call `submitJob(documentId, scenarioId, applicationId, appVersion)`
3. Extract `jobId` and `taskId` from result
4. Return response with blob URL and batch job info

**Performance Metrics Logged:**
- Model serialization duration
- Upload duration
- Batch submit duration
- Total duration

**Next:** Batch service creates Azure Batch job

---

### Step 8: Azure Batch Job Creation

**Location:** `dataconnectors/quodsi_data_connector_lucidchart_v2/src/services/lucidSimulationJobSubmissionService.ts:111-191`

#### Sub-steps:

1. **Generate IDs** (lines 124-125)
   ```typescript
   const jobId = `Job-${randomUUID()}`;
   const taskId = `Task-${randomUUID()}`;
   ```

2. **Create Batch Job with Retry** (lines 128-144)
   - Pool information
   - Constraints (1 hour max runtime)
   - Auto-termination on task completion

3. **Create Task with Retry** (lines 148-168)
   - Command line for Python simulation runner:
     ```bash
     /bin/bash -c "source $AZ_BATCH_NODE_STARTUP_DIR/wd/batch_env/bin/activate &&
     python3 -m quodsim_runner.lucidchart.cli
     --document-id \"{documentId}\"
     --scenario-id \"{scenarioId}\"
     --scenario-name \"{scenarioName}\""
     ```
   - Environment variables (storage connection, batch credentials)

4. **Return Success Message**
   ```
   Job '{jobId}' with task '{taskId}' submitted successfully.
   ```

**Retry Logic:** 3 attempts with exponential backoff (factor 2, 30s timeout)

**Next:** Python simulation runner executes on Azure Batch node

---

### Step 9: Status Updates (Real Azure Polling)

**Location:** `src/core/messaging/handlers/simulationHandler.ts:408-551`

**Current Implementation:**
Uses `pollDocumentStatus()` function to query Azure Storage via LucidChart Data Connector

**Update Mechanism:**
1. **Poll Interval:** Every 10 seconds
2. **Data Action:** `GetDocumentStatus` via LucidDataActionUtility
3. **Status Mapping:** Maps Azure `RunState` to `SimulationStatus`
   - `"RAN_SUCCESSFULLY"` → `COMPLETED` (100%)
   - `"RAN_WITH_ERRORS"` → `FAILED` (0%)
   - `"RUNNING"` → `RUNNING` (70%)
   - `"QUEUED"` → `QUEUED` (0%)
   - Unknown → `PROCESSING` (10%)
4. **Cleanup:** On completion, stop polling and remove job after 60s

**Message Sent:** `MODEL_RUN_STATUS` to React panel

**Integration:**
- Uses LucidChart Data Connector for Azure communication
- No direct Azure Batch API calls from extension
- Leverages existing Lucid infrastructure for auth and access

**Next:** Status messages received by React

---

### Step 10: Status Message Mapping

**Location:** `quodsim-react/src/messaging/mappers/simulation.mapper.ts:12-97`

**Action:**
1. `mapSimulation()` function receives `MODEL_RUN_STATUS` message
2. Extracts status data
3. Maps to Redux actions:
   - `status === 'error'` → `SIMULATION_ERROR` action
   - `status === 'completed'` → `SIMULATION_COMPLETE` action
   - `status === 'running'` or `'processing'` → `SIMULATION_PROGRESS` action

**Code Reference:**
```typescript
if (statusData.status === 'completed') {
  return {
    type: 'SIMULATION_COMPLETE',
    results: {
      jobId: statusData.jobId,
      resultUrl: statusData.resultUrl,
      // ...
    }
  };
}
```

**Next:** UI state updated

---

### Step 11: UI Updates

**Location:** `quodsim-react/src/features/modelPanel/PanelHeader.tsx:58-69`

**Action:**
1. `useEffect` monitors `simulationStatus` changes
2. Checks if simulation completed:
   ```typescript
   if (
     scenarioStatus?.runState === "RAN_SUCCESSFULLY" ||
     scenarioStatus?.runState === "RAN_WITH_ERRORS"
   ) {
     setIsSimulating(false);
   }
   ```
3. Re-enables "Run Simulation" button
4. Shows completion status or "View Results" button

**Visual Feedback:**
- Button text changes: "Run Simulation" → "Running..." → "Run Simulation"
- Progress indicator (if implemented)
- Status messages displayed

---

## State Transitions

```
[User Click]
    ↓
[INITIATED] - Button disabled, loading state
    ↓
[QUEUED] - Waiting for submission
    ↓
[PROCESSING] - Model serialization, upload
    ↓
[VALIDATING] - Model validation on backend
    ↓
[RUNNING] - Simulation executing (progress updates)
    ↓
[COMPLETED] - Results available
    OR
[FAILED] - Error occurred
    ↓
[IDLE] - Button re-enabled
```

## Component Responsibilities

| Component | Responsibility | Primary File |
|-----------|---------------|--------------|
| **PanelHeader** | UI trigger, button state management | `PanelHeader.tsx:124` |
| **useModelPanel** | Action coordination, state mapping | `useModelPanel.ts:174` |
| **useSimulationSender** | Message creation and sending | `simulationSender.ts:21` |
| **MessageRouter** | Message routing and validation | `MessageRouter.ts:201` |
| **SimulationHandler** | Model prep, serialization, submission | `simulationHandler.ts:70` |
| **LucidDataActionUtility** | OAuth workaround wrapper | `LucidDataActionUtility.ts:31` |
| **saveAndSubmitSimulation** | Azure orchestration (storage + batch) | `saveAndSubmitSimulation.ts:33` |
| **LucidSimulationJobSubmissionService** | Azure Batch API interface | `lucidSimulationJobSubmissionService.ts:111` |
| **simulation.mapper** | Status message to Redux actions | `simulation.mapper.ts:12` |

## Timing Estimates

| Phase | Typical Duration | Notes |
|-------|-----------------|-------|
| Message routing | < 10ms | In-memory |
| Model serialization | 50-200ms | Depends on model size |
| SVG capture | 100-500ms | Depends on diagram complexity |
| Blob upload | 500ms-2s | Network dependent |
| Batch submission | 1-3s | Azure API calls |
| Simulation execution | 10s-10min | Model dependent |
| Status polling | Every 10s | Real Azure polling via Data Connector |

## Error Handling

Errors can occur at each phase. See [07_error_handling.md](./07_error_handling.md) for complete details.

**Quick Reference:**
- **Step 1-4:** UI errors, message validation failures
- **Step 5:** Model loading failures, serialization errors
- **Step 6:** OAuth failures
- **Step 7:** Blob upload failures, network errors
- **Step 8:** Batch configuration errors, job creation failures
- **Step 9-11:** Status polling failures, UI update errors

## Related Documentation

- [02. Message Flow](./02_message_flow.md) - Detailed message sequencing
- [03. Extension Handler](./03_extension_handler.md) - SimulationHandler deep dive
- [04. Data Connector Integration](./04_data_connector_integration.md) - Azure Function details
- [05. Batch Service](./05_batch_service.md) - Azure Batch job creation
- [06. Status Polling](./06_status_polling.md) - Status update mechanism
- [07. Error Handling](./07_error_handling.md) - Error scenarios and recovery
