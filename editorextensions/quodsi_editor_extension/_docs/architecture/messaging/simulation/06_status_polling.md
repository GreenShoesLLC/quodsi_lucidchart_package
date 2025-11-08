# 06. Status Polling

Documentation of the status update mechanism that keeps the UI synchronized with simulation execution progress.

## Overview

The status polling system provides real-time feedback to users about simulation progress through Azure Data Connector integration.

**Key Files:**
- **Extension:** `src/core/messaging/handlers/simulationHandler.ts:408-551` (real polling implementation)
- **React Mapper:** `quodsim-react/src/messaging/mappers/simulation.mapper.ts:12-97`
- **React UI:** `quodsim-react/src/features/modelPanel/PanelHeader.tsx:58-69`

## Current Implementation: Real Azure Polling

### Purpose

Provide real-time status updates by querying Azure Storage via the LucidChart Data Connector.

### Architecture

The polling system uses the LucidChart Data Connector to query Azure for simulation status:

```
Extension                    Data Connector           Azure Storage
    │                              │                        │
    │  Poll every 10s              │                        │
    ├──────────────────────────────>│                        │
    │  GetDocumentStatus           │                        │
    │                              │  Check scenario        │
    │                              ├───────────────────────>│
    │                              │  PageStatus            │
    │                              │<───────────────────────┤
    │<──────────────────────────────┤                        │
    │  Send MODEL_RUN_STATUS       │                        │
```

### pollDocumentStatus()

**Location:** `simulationHandler.ts:408-551`

**Signature:**
```typescript
private static async pollDocumentStatus(
  documentId: string,
  scenarioId: string,
  jobId: string
): Promise<void>
```

**Called After:** Job submission to data connector

**Polling Interval:** 10 seconds

### Update Sequence

#### Phase 1: Initialize Polling

```typescript
// Store interval handle in job for cleanup
const intervalId = setInterval(async () => {
  await this.checkStatus(documentId, scenarioId, jobId);
}, 10000); // Poll every 10 seconds

const job = SimulationHandler.activeJobs.get(jobId);
if (job) {
  job.pollInterval = intervalId;
}
```

**Actions:**
- Creates polling interval (10 seconds)
- Stores interval handle for later cleanup
- Begins periodic status checks

---

#### Phase 2: Status Check via Data Action

```typescript
const response = await LucidDataActionUtility.performDataAction(client, {
  dataConnectorName: 'quodsi_data_connector',
  actionName: 'GetDocumentStatus',
  actionData: {
    documentId: documentId
  },
  asynchronous: false
});
```

**Integration:**
- Uses LucidChart Data Connector API
- Calls `GetDocumentStatus` action
- Returns `PageStatus` object with scenario information

**Response Structure:**
```typescript
{
  success: boolean;
  scenario: {
    scenarioId: string;
    scenarioName: string;
    runState: "QUEUED" | "RUNNING" | "RAN_SUCCESSFULLY" | "RAN_WITH_ERRORS" | null;
    hasResults: boolean;
  }
}
```

**Note:** The response returns a single scenario object directly, not an array of scenarios within a pageStatus wrapper. The code accesses this via `result.scenario`.

---

#### Phase 3: Map RunState to SimulationStatus

**Status Mapping:**

| Azure RunState | SimulationStatus | Progress | Description |
|----------------|------------------|----------|-------------|
| `"RAN_SUCCESSFULLY"` | `COMPLETED` | 100% | Simulation finished successfully |
| `"RAN_WITH_ERRORS"` | `FAILED` | 0% | Simulation encountered errors |
| `"RUNNING"` | `RUNNING` | 50-90% | Simulation actively executing |
| `"QUEUED"` | `QUEUED` | 0% | Waiting to start |
| `null` or unknown | `PROCESSING` | 10% | Initializing or unknown state |

**Code Logic:**
```typescript
switch (runState) {
  case "RAN_SUCCESSFULLY":
    return { status: SimulationStatus.COMPLETED, progress: 100 };
  case "RAN_WITH_ERRORS":
    return { status: SimulationStatus.FAILED, progress: 0 };
  case "RUNNING":
    return { status: SimulationStatus.RUNNING, progress: 70 };
  case "QUEUED":
    return { status: SimulationStatus.QUEUED, progress: 0 };
  default:
    return { status: SimulationStatus.PROCESSING, progress: 10 };
}
```

---

#### Phase 4: Send Status Update

**Message Sent:**
```typescript
router.send('model', {
  id: '',
  type: EnvelopeMessageType.MODEL_RUN_STATUS,
  source: 'host',
  target: 'model-iframe',
  version: '1.0',
  data: {
    jobId,
    documentId,
    scenarioId,
    scenarioName: scenario.scenarioName,
    status: mappedStatus,
    progress: mappedProgress,
    currentStep: 'Running simulation',
    lastChecked: new Date().toISOString(),
    hasResults: scenario.hasResults
  }
});
```

**Enhanced Fields:**
- `documentId` - LucidChart document ID for tracking
- `scenarioId` - Unique scenario identifier
- `scenarioName` - User-friendly scenario name
- `lastChecked` - Timestamp of this status check

**Frequency:** Every 10 seconds until completion

---

#### Phase 5: Completion and Cleanup

**When Status is COMPLETED or FAILED:**

1. **Clear Polling Interval:**
```typescript
const job = SimulationHandler.activeJobs.get(jobId);
if (job?.pollInterval) {
  clearInterval(job.pollInterval);
  job.pollInterval = undefined;
}
```

2. **Send Final Status Message** (with hasResults flag)

3. **Schedule Job Removal:**
```typescript
setTimeout(() => {
  SimulationHandler.activeJobs.delete(jobId);
}, 60000); // Remove after 60 seconds
```

---

### Update Timing (Real Azure)

```
T+0s     Submit job to Azure
T+10s    First poll → QUEUED (0%)
T+20s    Poll → RUNNING (70%)
T+30s    Poll → RUNNING (70%)
...      (continues every 10s)
T+Xs     Poll → RAN_SUCCESSFULLY (100%)
T+Xs+60s Job tracking cleaned up
```

**Polling Interval:** 10 seconds

**Total Duration:** Variable based on simulation complexity (10 seconds to 10+ minutes)

---

## React Message Mapping

### simulation.mapper.ts

**Location:** `quodsim-react/src/messaging/mappers/simulation.mapper.ts:12-97`

**Purpose:** Convert incoming status messages to Redux actions

**Function:**
```typescript
export function mapSimulation(msg: EnvelopeBase): MessagingAction | null
```

### Mapping Logic

#### 1. Message Type Filter (lines 14-20)

```typescript
if (
  msg.type !== EnvelopeMessageType.MODEL_RUN_REQUEST &&
  msg.type !== EnvelopeMessageType.MODEL_RUN_ACK &&
  msg.type !== EnvelopeMessageType.MODEL_RUN_STATUS
) {
  return null; // Not a simulation message
}
```

---

#### 2. MODEL_RUN_ACK Handling (lines 25-37)

```typescript
case EnvelopeMessageType.MODEL_RUN_ACK:
  const ackData = msg.data as {
    jobId: string;
    queuedAt: string;
    estimatedCompletionTime?: string;
  };

  return {
    type: 'SIMULATION_START',
    jobId: ackData.jobId
  };
```

**Action Dispatched:** `SIMULATION_START`

**Effect:** Stores job ID, keeps button disabled

---

#### 3. MODEL_RUN_STATUS Handling (lines 39-83)

**Extract Data:**
```typescript
const statusData = msg.data as {
  jobId: string;
  status: string;
  progress: number;
  currentStep?: string;
  error?: string;
  resultUrl?: string;
  details?: Record<string, unknown>;
};
```

**Error Status (lines 52-56):**
```typescript
if (statusData.status === 'error' || statusData.error) {
  return {
    type: 'SIMULATION_ERROR',
    error: statusData.error || 'Unknown simulation error'
  };
}
```

**Completed Status (lines 57-70):**
```typescript
else if (statusData.status === 'completed') {
  const results = {
    jobId: statusData.jobId,
    resultUrl: statusData.resultUrl,
    currentStep: statusData.currentStep,
    details: statusData.details
  };

  return {
    type: 'SIMULATION_COMPLETE',
    results
  };
}
```

**Running/Processing Status (lines 71-76):**
```typescript
else if (statusData.status === 'running' || statusData.status === 'processing') {
  return {
    type: 'SIMULATION_PROGRESS',
    progress: statusData.progress || 0
  };
}
```

**Fallback (lines 78-83):**
```typescript
return {
  type: 'SIMULATION_PROGRESS',
  progress: 0
};
```

---

## UI Updates

### PanelHeader Component

**Location:** `quodsim-react/src/features/modelPanel/PanelHeader.tsx:58-69, 124-129`

### Effect: Monitor Simulation Status

```typescript
useEffect(() => {
  if (simulationStatus && isSimulating) {
    // Check if simulation completed
    const scenarioStatus = simulationStatus?.pageStatus?.scenarios?.[0];
    if (
      scenarioStatus?.runState === "RAN_SUCCESSFULLY" ||
      scenarioStatus?.runState === "RAN_WITH_ERRORS"
    ) {
      setIsSimulating(false); // Re-enable button
    }
  }
}, [simulationStatus]);
```

**Purpose:** Re-enable "Run Simulation" button when complete

---

### Button States

#### Idle State

```typescript
<button
  className={simulateButtonClasses}
  onClick={handleSimulateClick}
  disabled={false}
>
  {getSimulationState(...).buttonLabel}
</button>
```

**Button Text:** "Run Simulation"

**Enabled:** Yes

---

#### Running State

```typescript
<button
  className={disabledButtonClasses}
  onClick={handleSimulateClick}
  disabled={true}
>
  Running...
</button>
```

**Button Text:** "Running..."

**Enabled:** No

---

#### Completed State

Button returns to idle state, potentially with "View Results" option

---

## Error Handling

### Polling Failures

**Scenarios:**
- Network connectivity issues
- Data connector unavailable
- Invalid response format
- Azure Storage access errors

**Handling:**
```typescript
try {
  const response = await LucidDataActionUtility.performDataAction(/*...*/);
  // Process response
} catch (error) {
  console.error('[SimulationHandler] Polling error:', error);

  // Send FAILED status to React
  router.send('model', {
    type: EnvelopeMessageType.MODEL_RUN_STATUS,
    data: {
      jobId,
      status: SimulationStatus.FAILED,
      progress: 0,
      error: `Failed to check status: ${error.message}`
    }
  });

  // Stop polling
  clearInterval(job.pollInterval);
}
```

---

## Lifecycle Management

### Stopping Polling

**Method:** `SimulationHandler.stopPolling(jobId)`

**Use Cases:**
- User navigates away from page
- User cancels simulation
- Error requires stopping

**Implementation:**
```typescript
public static stopPolling(jobId: string): void {
  const job = SimulationHandler.activeJobs.get(jobId);
  if (job?.pollInterval) {
    clearInterval(job.pollInterval);
    job.pollInterval = undefined;
  }
}
```

---

### Resuming Polling

**Method:** `SimulationHandler.resumePollingIfNeeded(documentId)`

**Use Cases:**
- User returns to page with active simulations
- Panel reopens after being closed

**Implementation:**
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

---

## Performance Considerations

### Network Impact

**Current Implementation:**
- Frequency: Every 10 seconds
- Request size: ~100-200 bytes (performDataAction call)
- Response size: ~200-500 bytes (PageStatus object)
- 10-minute simulation: ~60 requests, ~30-45KB total
- Impact: Low

### Extension Memory

**Job Tracking:**
- ~1KB per job
- Cleaned up 60s after completion
- Max concurrent: Typically 1-5 jobs
- Impact: Negligible

---

## Testing

### Mock Implementation Testing

**Scenarios:**
1. Successful completion (happy path)
2. Verify status progression
3. Check message timing
4. Confirm job cleanup

**Manual Testing:**
1. Run simulation
2. Observe console logs
3. Verify UI updates
4. Check button states

---

### Real Polling Testing (Future)

**Unit Tests:**
- Mock data connector responses
- Test error handling
- Verify retry logic
- Test cleanup on completion

**Integration Tests:**
- Submit real Azure Batch job
- Poll for status
- Verify final status
- Check result availability

---

## Configuration

### Polling Interval

**Current:** 10 seconds

**Rationale:**
- Too frequent: Unnecessary load on data connector and Azure Storage
- Too infrequent: Poor user experience
- 10s balances both concerns while minimizing API calls

**Configurable:** Interval can be adjusted in `pollDocumentStatus()` method

### Timeout/Retry

**Current Implementation:**
- Network timeout: Handled by LucidDataActionUtility (default: ~30s)
- Retry on failure: No automatic retry (sends FAILED status)
- Polling stops on error (manual retry required)

**Error Recovery:**
- User can re-run simulation to restart polling
- `resumePollingIfNeeded()` can restart polling for existing jobs

---

## Future Enhancements

1. **Detailed Progress**
   - Current replication number
   - Estimated time remaining
   - Resource utilization

2. **Push Notifications**
   - WebSocket for real-time updates
   - Eliminate polling overhead
   - Instant completion notification

3. **Progress History**
   - Store all status updates
   - Display progress chart
   - Performance analysis

4. **Cancellation Support**
   - Stop polling when user cancels
   - Clean up resources immediately

5. **Multiple Concurrent Simulations**
   - Track multiple jobs simultaneously
   - Per-job status display
   - Queue management UI

---

## Related Documentation

- [01. Simulation Lifecycle](./01_simulation_lifecycle.md) - Overall context
- [02. Message Flow](./02_message_flow.md) - Status message details
- [03. Extension Handler](./03_extension_handler.md) - Mock implementation
- [troubleshooting.md](./troubleshooting.md) - Polling issues
