# 06. Status Polling

Documentation of the status update mechanism that keeps the UI synchronized with simulation execution progress.

## Overview

The status polling system provides real-time feedback to users about simulation progress. Currently implemented as a mock for development, it's designed to be replaced with real Azure Batch status polling in production.

**Key Files:**
- **Extension:** `src/core/messaging/handlers/simulationHandler.ts:407-506` (mock implementation)
- **React Mapper:** `quodsim-react/src/messaging/mappers/simulation.mapper.ts:12-97`
- **React UI:** `quodsim-react/src/features/modelPanel/PanelHeader.tsx:58-69`

## Current Implementation: Mock Polling

### Purpose

Provide realistic status updates during development without requiring actual Azure Batch execution.

### mockSimulationProgress()

**Location:** `simulationHandler.ts:407-506`

**Signature:**
```typescript
private static mockSimulationProgress(jobId: string): void
```

**Called After:** Job submission to data connector

### Update Sequence

#### Phase 1: Processing (1s delay)

```typescript
setTimeout(() => {
  status = SimulationStatus.PROCESSING;
  progress = 5;

  router.send('model', {
    id: '',
    type: EnvelopeMessageType.MODEL_RUN_STATUS,
    source: 'host',
    target: 'model-iframe',
    version: '1.0',
    data: {
      jobId,
      status,
      progress,
      currentStep: 'Initializing simulation'
    }
  });
}, 1000);
```

**Message:**
- Status: `PROCESSING`
- Progress: 5%
- Step: "Initializing simulation"

---

#### Phase 2: Validating (2s delay)

```typescript
setTimeout(() => {
  status = SimulationStatus.VALIDATING;
  progress = 15;

  router.send('model', {
    // ...
    data: {
      jobId,
      status,
      progress,
      currentStep: 'Validating model structure'
    }
  });
}, 2000);
```

**Message:**
- Status: `VALIDATING`
- Progress: 15%
- Step: "Validating model structure"

---

#### Phase 3: Running (every 2s)

```typescript
const interval = setInterval(() => {
  if (progress >= 95) {
    clearInterval(interval);
    // Move to completion
    return;
  }

  status = SimulationStatus.RUNNING;
  progress += Math.floor(Math.random() * 10) + 5; // +5-15%
  progress = Math.min(progress, 95); // Cap at 95%

  router.send('model', {
    // ...
    data: {
      jobId,
      status,
      progress,
      currentStep: `Running simulation (${progress}%)`
    }
  });
}, 2000);
```

**Messages:**
- Status: `RUNNING`
- Progress: Incrementally increases by 5-15% each interval
- Step: "Running simulation (X%)"
- Cap: Progress stops at 95% until completion

**Frequency:** Every 2 seconds

---

#### Phase 4: Completion (1s delay after 95%)

```typescript
setTimeout(() => {
  status = SimulationStatus.COMPLETED;
  progress = 100;

  router.send('model', {
    // ...
    data: {
      jobId,
      status,
      progress,
      currentStep: 'Simulation complete',
      resultUrl: `/results/${jobId}`
    }
  });

  // Clean up job tracking after 60s
  setTimeout(() => {
    SimulationHandler.activeJobs.delete(jobId);
  }, 60000);
}, 1000);
```

**Message:**
- Status: `COMPLETED`
- Progress: 100%
- Step: "Simulation complete"
- ResultUrl: `/results/{jobId}`

**Cleanup:** Job removed from tracking 60 seconds later

---

### Update Timing

```
T+0s     Submit job
T+1s     PROCESSING (5%)
T+2s     VALIDATING (15%)
T+4s     RUNNING (25%)
T+6s     RUNNING (40%)
T+8s     RUNNING (55%)
T+10s    RUNNING (70%)
T+12s    RUNNING (85%)
T+14s    RUNNING (95%)
T+15s    COMPLETED (100%)
T+75s    Job tracking cleaned up
```

**Total Duration:** ~15 seconds (development speed)

**Production Duration:** Variable, 10 seconds to 10+ minutes

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

## Planned Implementation: Real Polling

### Architecture

```
Extension                    Data Connector           Azure Batch
    │                              │                        │
    │  Poll every 5-10s            │                        │
    ├──────────────────────────────>│                        │
    │  GET /api/status/{jobId}     │                        │
    │                              │  Get job status        │
    │                              ├───────────────────────>│
    │                              │                        │
    │                              │<───────────────────────┤
    │<──────────────────────────────┤  {status, progress}    │
    │  Send MODEL_RUN_STATUS       │                        │
    │                              │                        │
```

### Data Connector Endpoint (Planned)

**Endpoint:** `GET /api/dataConnector/status/{jobId}`

**Response:**
```typescript
{
  jobId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;           // 0-100
  startTime?: string;
  endTime?: string;
  error?: string;
  hasResults: boolean;
}
```

---

### Extension Polling (Planned)

**Location:** Add to `simulationHandler.ts`

**Implementation:**
```typescript
private static async pollSimulationStatus(
  jobId: string,
  documentId: string
): Promise<void> {
  const pollInterval = setInterval(async () => {
    try {
      // Call data connector status endpoint
      const response = await fetch(
        `${config.dataConnectorUrl}/status/${jobId}`
      );
      const status = await response.json();

      // Send status update
      router.send('model', {
        id: '',
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId,
          documentId,
          status: status.status,
          progress: status.progress,
          error: status.error,
          hasResults: status.hasResults
        }
      });

      // Stop polling if complete or failed
      if (status.status === 'completed' || status.status === 'failed') {
        clearInterval(pollInterval);

        // Clean up job tracking
        setTimeout(() => {
          SimulationHandler.activeJobs.delete(jobId);
        }, 60000);
      }

    } catch (error) {
      console.error('[SimulationHandler] Polling error:', error);

      // Send error status
      router.send('model', {
        id: '',
        type: EnvelopeMessageType.MODEL_RUN_STATUS,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          jobId,
          documentId,
          status: 'failed',
          progress: 0,
          error: `Polling failed: ${error.message}`
        }
      });

      clearInterval(pollInterval);
    }
  }, 5000); // Poll every 5 seconds
}
```

**Polling Interval:** 5 seconds (configurable)

**Stop Conditions:**
- Status becomes `completed`
- Status becomes `failed`
- Polling error occurs

---

### Azure Batch Status Mapping

**Azure Batch Task States:**
- `active` → `queued`
- `preparing` → `processing`
- `running` → `running`
- `completed` → `completed` (if exit code 0) or `failed` (if exit code != 0)

**Progress Calculation Options:**
1. **Task Progress API:** If available from simulation runner
2. **Time-based Estimation:** Based on historical data
3. **Fixed Milestones:** 25% (started), 50% (midpoint), 75% (finalizing), 100% (complete)

---

## Performance Considerations

### Network Impact

**Mock Implementation:**
- Messages: 10-15 per simulation
- Total data: < 5KB
- Impact: Negligible

**Real Polling:**
- Frequency: Every 5-10s
- Request size: < 100 bytes
- Response size: 200-500 bytes
- 10-minute simulation: ~60-120 requests, ~30-60KB total
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

**Current (Mock):** 2 seconds

**Planned (Production):** 5-10 seconds

**Rationale:**
- Too frequent: Unnecessary load on data connector
- Too infrequent: Poor user experience
- 5-10s balances both concerns

### Timeout/Retry

**Current:** None (mock always succeeds)

**Planned:**
- Network timeout: 10 seconds
- Retry on failure: 3 attempts
- Exponential backoff: 1s, 2s, 4s
- Give up after: 3 consecutive failures

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
