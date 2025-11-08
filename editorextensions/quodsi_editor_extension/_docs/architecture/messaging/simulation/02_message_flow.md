# 02. Message Flow

Detailed documentation of message sequencing, payloads, and timing for simulation execution.

## Overview

The simulation flow involves two message types exchanged between React and the Extension in a request-status pattern. The initial MODEL_RUN_STATUS message with status "QUEUED" serves as the acknowledgment. This document details each message's structure, timing, and purpose.

## Message Sequence Diagram

```
React UI                    Extension                   Azure Function              Azure Batch
   │                            │                              │                         │
   │  MODEL_RUN_REQUEST         │                              │                         │
   ├───────────────────────────>│                              │                         │
   │                            │  1. Validate model           │                         │
   │                            │  2. Serialize                │                         │
   │                            │  3. Capture SVG              │                         │
   │                            │  4. Track job                │                         │
   │  MODEL_RUN_STATUS [QUEUED] │                              │                         │
   │<───────────────────────────┤                              │                         │
   │  (Initial ack, progress 0%)│                              │                         │
   │                            │  performDataAction()         │                         │
   │                            ├─────────────────────────────>│                         │
   │                            │                              │  Upload to Blob         │
   │                            │                              │  Storage                │
   │                            │                              │                         │
   │                            │                              │  submitJob()            │
   │                            │                              ├────────────────────────>│
   │                            │                              │                         │
   │                            │                              │  Create job             │
   │                            │                              │  Create task            │
   │                            │                              │<────────────────────────┤
   │                            │<─────────────────────────────┤  (jobId, taskId)        │
   │                            │                              │                         │
   │  MODEL_RUN_STATUS          │                              │                         │
   │<───────────────────────────┤  [QUEUED]                    │                         │
   │  (progress: 0%)            │                              │                         │
   │                            │                              │                         │
   │  MODEL_RUN_STATUS          │                              │                         │
   │<───────────────────────────┤  [PROCESSING]                │                         │
   │  (progress: 5%)            │                              │                         │
   │                            │                              │                         │
   │  MODEL_RUN_STATUS          │                              │                         │
   │<───────────────────────────┤  [VALIDATING]                │                         │
   │  (progress: 15%)           │                              │                         │
   │                            │                              │                         │
   │  MODEL_RUN_STATUS          │                              │                         │
   │<───────────────────────────┤  [RUNNING]                   │                    [Executing]
   │  (progress: 30%)           │                              │                         │
   │                            │  (every 2-5s)                │                         │
   │  MODEL_RUN_STATUS          │                              │                         │
   │<───────────────────────────┤  [RUNNING]                   │                         │
   │  (progress: 60%)           │                              │                         │
   │                            │                              │                         │
   │  MODEL_RUN_STATUS          │                              │                         │
   │<───────────────────────────┤  [COMPLETED]                 │                         │
   │  (progress: 100%, results) │                              │                         │
```

## Message Details

### 1. MODEL_RUN_REQUEST

**Direction:** React → Extension
**Purpose:** Initiate simulation execution
**Trigger:** User clicks "Run Simulation" button

#### Sender

**File:** `quodsim-react/src/messaging/senders/simulationSender.ts:21-35`

**Function:** `useSimulationSender().requestSimulation()`

**Implementation:**
```typescript
const requestSimulation = (
  documentId: string,
  scenarioName?: string,
  durationDays?: number,
  repetitions?: number,
  parameters?: Record<string, unknown>
) => {
  send(EnvelopeMessageType.MODEL_RUN_REQUEST, {
    documentId,
    scenarioName,
    durationDays,
    repetitions,
    parameters
  });
};
```

#### Payload Schema

```typescript
{
  documentId: string;          // LucidChart document ID
  scenarioName?: string;        // Name for this simulation run (auto-generated timestamp: "YY-MM-DD HH:MM:SS")
  durationDays?: number;        // Simulation duration (DEPRECATED)
  repetitions?: number;         // Number of replications (DEPRECATED)
  parameters?: Record<string, unknown>;  // Additional simulation parameters
}
```

#### Envelope Structure

```typescript
{
  id: string;                   // Generated message ID (e.g., "msg_1634567890123_abc123")
  type: "MODEL_RUN_REQUEST";
  source: "model-iframe";       // Panel source
  target: "host";               // Extension host
  version: "1.0";
  data: {/* payload above */}
}
```

#### Handler

**File:** `src/core/messaging/handlers/simulationHandler.ts:43-62, 70-340`

**Method:** `SimulationHandler.handleMessage()` → `handleRunRequest()`

**Processing Time:** 2-5 seconds (depends on model size and complexity)

---

### 2. MODEL_RUN_STATUS

**Direction:** Extension → React
**Purpose:** Acknowledge submission (initial message with QUEUED status) and provide periodic updates on simulation execution progress
**Timing:**
- **Initial:** Sent immediately after job tracking created (serves as acknowledgment)
- **Subsequent:** Every 10 seconds during simulation via Azure polling
**Count:** Multiple messages (typically 6-60 depending on duration)

**Note:** The initial MODEL_RUN_STATUS message with status "QUEUED" replaces the previous MODEL_RUN_ACK message pattern, providing both acknowledgment and initial status in a single message type.

#### Sender

**File:** `src/core/messaging/handlers/simulationHandler.ts:408-551`

**Context:**
- Initial status after submission
- Periodic updates via `pollDocumentStatus()` (real Azure polling)

**Implementation (Real Azure Polling):**
```typescript
// Query Azure via Data Connector
const response = await LucidDataActionUtility.performDataAction(client, {
  dataConnectorName: 'quodsi_data_connector',
  actionName: 'GetDocumentStatus',
  actionData: { documentId },
  asynchronous: false
});

// Map RunState to status
const status = mapRunStateToStatus(scenario.runState);

// Send update
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
    currentStep: 'Running simulation',
    hasResults: scenario.hasResults
  }
});
```

#### Payload Schema

```typescript
{
  jobId: string;                // Job identifier for tracking
  documentId: string;           // LucidChart document ID
  scenarioId: string;           // Unique UUID for this simulation run
  scenarioName: string;         // User-friendly scenario name (timestamp format)
  status: string;               // Current status (see Status Values below)
  progress: number;             // 0-100 percentage
  currentStep?: string;         // Human-readable step description
  lastChecked: string;          // ISO timestamp of last status check
  queuedAt: string;             // ISO timestamp when job was queued (initial message only)
  error?: string;               // Error message (if status is 'failed')
  resultUrl?: string;           // Results URL (if status is 'completed')
  hasResults?: boolean;         // Whether results are available
  details?: Record<string, unknown>;  // Additional status details
}
```

#### Status Values

| Value | Meaning | Typical Progress | Azure RunState |
|-------|---------|-----------------|----------------|
| `queued` | Job submitted, waiting | 0% | `"QUEUED"` |
| `processing` | Initializing | 10% | Unknown/null |
| `running` | Executing simulation | 70% | `"RUNNING"` |
| `completed` | Finished successfully | 100% | `"RAN_SUCCESSFULLY"` |
| `failed` | Error occurred | 0% | `"RAN_WITH_ERRORS"` |

**Note:** Status values are mapped from Azure Storage RunState via GetDocumentStatus data action.

#### Envelope Structure

```typescript
{
  id: string;                   // New ID for each status message
  type: "MODEL_RUN_STATUS";
  source: "host";
  target: "model-iframe";
  version: "1.0";
  data: {/* payload above */}
}
```

#### Handler

**File:** `quodsim-react/src/messaging/mappers/simulation.mapper.ts:39-83`

**Method:** `mapSimulation()`

**Action Dispatching Logic:**

```typescript
// Error status
if (statusData.status === 'error' || statusData.error) {
  return {
    type: 'SIMULATION_ERROR',
    error: statusData.error || 'Unknown simulation error'
  };
}

// Completed status
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

// Running/Processing status
if (statusData.status === 'running' || statusData.status === 'processing') {
  return {
    type: 'SIMULATION_PROGRESS',
    progress: statusData.progress || 0
  };
}
```

**UI Effects:**
- **SIMULATION_PROGRESS:** Updates progress indicator
- **SIMULATION_COMPLETE:** Re-enables button, shows "View Results" option
- **SIMULATION_ERROR:** Shows error message, re-enables button

---

## Message Timing

### Typical Sequence Timing

```
T+0ms      User clicks "Run Simulation"
T+10ms     MODEL_RUN_REQUEST sent
T+20ms     Extension receives message
T+500ms    Model serialized, SVG captured
T+520ms    MODEL_RUN_STATUS sent (QUEUED, progress 0%) - Initial acknowledgment
T+540ms    React receives STATUS, updates UI
T+1000ms   Azure submission starts
T+10000ms  MODEL_RUN_STATUS (QUEUED or PROCESSING)
T+20000ms  MODEL_RUN_STATUS (RUNNING, 70%)
T+30000ms  MODEL_RUN_STATUS (RUNNING, 70%)
...        (every 10s)
T+60000ms  MODEL_RUN_STATUS (RUNNING, 70%)
T+70000ms  MODEL_RUN_STATUS (COMPLETED, 100%)
```

### Message Frequency

| Message Type | Count | Frequency |
|-------------|-------|-----------|
| MODEL_RUN_REQUEST | 1 | One-time (per simulation) |
| MODEL_RUN_STATUS | 7-61 | Initial (acknowledgment) + Every 10s until completion |

---

## Message Ordering Guarantees

### Guaranteed Ordering

1. `MODEL_RUN_REQUEST` always precedes all `MODEL_RUN_STATUS` messages
2. First `MODEL_RUN_STATUS` (QUEUED) is sent immediately after request processing
3. Status updates typically progress forward (QUEUED → RUNNING → COMPLETED)

### No Ordering Guarantees

- Multiple `MODEL_RUN_STATUS` messages may arrive out of order due to async polling
- Status messages may be dropped (network issues) - UI should handle missing updates gracefully
- Progress values may not increase monotonically (Azure may report same status multiple times)

### Correlation

- All `MODEL_RUN_STATUS` messages include the same `jobId` and `scenarioId` for tracking
- React components use `jobId` to match status updates to the initiated simulation

---

## Error Scenarios

### Request Phase Errors

**Scenario:** Model validation fails, serialization error, no EditorClient

**Response:**
```typescript
{
  id: msg.id,
  type: "MODEL_RUN_STATUS",  // Note: STATUS not ACK
  source: "host",
  target: "model-iframe",
  version: "1.0",
  data: {
    jobId: 'error',
    status: SimulationStatus.FAILED,
    progress: 0,
    error: 'No active page found'  // or other error message
  }
}
```

**Handler:** Dispatches `SIMULATION_ERROR` action

### Submission Phase Errors

**Scenario:** Azure Function error, OAuth failure, network error

**Response:**
```typescript
{
  id: '',
  type: "MODEL_RUN_STATUS",
  source: "host",
  target: "model-iframe",
  version: "1.0",
  data: {
    jobId,
    status: SimulationStatus.FAILED,
    progress: 0,
    error: 'Failed to submit simulation: {error.message}'
  }
}
```

**Handler:** Dispatches `SIMULATION_ERROR` action

---

## Message Validation

### Required Fields

All messages must include:
- `id` - Message identifier
- `type` - One of the three message types
- `source` - Originating component
- `target` - Destination component
- `version` - Protocol version (currently "1.0")
- `data` - Message payload (object)

### Validation Points

1. **MessageRouter.receive()** (`MessageRouter.ts:204-207`)
   - Validates envelope structure with `isEnvelope(msg)`
   - Rejects invalid messages silently

2. **SimulationHandler.handleMessage()** (`simulationHandler.ts:43-62`)
   - Checks message type
   - Delegates to appropriate handler

3. **simulation.mapper()** (`simulation.mapper.ts:14-20`)
   - Early return `null` for non-simulation messages
   - Validates status data structure

---

## Performance Considerations

### Message Size

- **MODEL_RUN_REQUEST:** ~200 bytes (small payload)
- **MODEL_RUN_ACK:** ~150 bytes (minimal payload)
- **MODEL_RUN_STATUS:** ~200-500 bytes (varies with status details)

### Network Impact

- **Request/ACK:** Negligible (single round-trip)
- **Status Updates:** Low (< 1KB/sec during simulation)
- **Total for 30s simulation:** < 10KB

### Processing Time

- **Message routing:** < 1ms
- **Status mapping:** < 1ms
- **UI updates:** 5-10ms (React rendering)

---

## Future Enhancements

### Planned Features

1. **Enhanced Progress Details**
   - Current replication number
   - Estimated time remaining
   - Resource utilization metrics
   - Detailed step-by-step progress

2. **Cancellation Support**
   - New message type: `MODEL_RUN_CANCEL`
   - Cancel Azure Batch job via data connector
   - Send final status: `cancelled`
   - Clean up resources on cancellation

3. **Result Notifications**
   - Push notification when simulation completes (browser notifications)
   - Include result summary in completion status message
   - Preview of key metrics in notification

4. **Configurable Polling**
   - User-adjustable polling interval (5s - 30s)
   - Adaptive polling (faster when near completion)
   - Pause/resume polling capability

---

## Related Documentation

- [01. Simulation Lifecycle](./01_simulation_lifecycle.md) - End-to-end flow
- [03. Extension Handler](./03_extension_handler.md) - Handler implementation
- [06. Status Polling](./06_status_polling.md) - Status update mechanism
- [simulation-run.md](./simulation-run.md) - Original message protocol doc
