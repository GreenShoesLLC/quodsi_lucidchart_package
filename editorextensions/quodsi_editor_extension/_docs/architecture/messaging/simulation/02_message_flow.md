# 02. Message Flow

Detailed documentation of message sequencing, payloads, and timing for simulation execution.

## Overview

The simulation flow involves three message types exchanged between React and the Extension in a request-acknowledgment-status pattern. This document details each message's structure, timing, and purpose.

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
   │  MODEL_RUN_ACK             │                              │                         │
   │<───────────────────────────┤                              │                         │
   │  (jobId, queuedAt)         │                              │                         │
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
  scenarioName?: string;        // Name for this simulation run (default: "LucidChart")
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

### 2. MODEL_RUN_ACK

**Direction:** Extension → React
**Purpose:** Acknowledge simulation request received and job submitted
**Timing:** Sent immediately after job tracking created, before Azure submission completes

#### Sender

**File:** `src/core/messaging/handlers/simulationHandler.ts:226-236`

**Context:** Within `handleRunRequest()` after model serialization and job ID generation

**Implementation:**
```typescript
router.send('model', {
  id: msg.id,
  type: EnvelopeMessageType.MODEL_RUN_ACK,
  source: 'host',
  target: 'model-iframe',
  version: '1.0',
  data: {
    jobId,
    queuedAt: new Date().toISOString()
  }
});
```

#### Payload Schema

```typescript
{
  jobId: string;                // Format: "job-{documentId}-{timestamp}"
  queuedAt: string;             // ISO 8601 timestamp
  estimatedCompletionTime?: string;  // Future feature
}
```

#### Envelope Structure

```typescript
{
  id: string;                   // Same as request message ID (for correlation)
  type: "MODEL_RUN_ACK";
  source: "host";
  target: "model-iframe";
  version: "1.0";
  data: {/* payload above */}
}
```

#### Handler

**File:** `quodsim-react/src/messaging/mappers/simulation.mapper.ts:25-37`

**Method:** `mapSimulation()`

**Action Dispatched:**
```typescript
{
  type: 'SIMULATION_START',
  jobId: ackData.jobId
}
```

**UI Effect:**
- Stores `jobId` in simulation state
- Keeps button in "Running..." state
- Prepares for status updates

---

### 3. MODEL_RUN_STATUS

**Direction:** Extension → React
**Purpose:** Provide periodic updates on simulation execution progress
**Timing:** Every 10 seconds during simulation
**Count:** Multiple messages (typically 6-60 depending on duration)

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
  status: string;               // Current status (see Status Values below)
  progress: number;             // 0-100 percentage
  currentStep?: string;         // Human-readable step description
  error?: string;               // Error message (if status is 'failed')
  resultUrl?: string;           // Results URL (if status is 'completed')
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
T+520ms    MODEL_RUN_ACK sent
T+540ms    React receives ACK, updates UI
T+1000ms   Azure submission starts
T+3000ms   First MODEL_RUN_STATUS (QUEUED)
T+4000ms   MODEL_RUN_STATUS (PROCESSING)
T+5000ms   MODEL_RUN_STATUS (VALIDATING)
T+7000ms   MODEL_RUN_STATUS (RUNNING, 20%)
T+9000ms   MODEL_RUN_STATUS (RUNNING, 35%)
...        (every 2s)
T+30000ms  MODEL_RUN_STATUS (RUNNING, 95%)
T+31000ms  MODEL_RUN_STATUS (COMPLETED, 100%)
```

### Message Frequency

| Message Type | Count | Frequency |
|-------------|-------|-----------|
| MODEL_RUN_REQUEST | 1 | One-time (per simulation) |
| MODEL_RUN_ACK | 1 | One-time (immediate response) |
| MODEL_RUN_STATUS | 6-60 | Every 10s until completion |

---

## Message Ordering Guarantees

### Guaranteed Ordering

1. `MODEL_RUN_REQUEST` always precedes `MODEL_RUN_ACK`
2. `MODEL_RUN_ACK` always precedes first `MODEL_RUN_STATUS`
3. Status updates are monotonically increasing in progress (never decrease)

### No Ordering Guarantees

- Multiple `MODEL_RUN_STATUS` messages may arrive out of order (use progress % to detect)
- Status messages may be dropped (network issues) - UI should handle missing updates gracefully

### Correlation

- `MODEL_RUN_ACK` uses same `id` as `MODEL_RUN_REQUEST` for correlation
- All `MODEL_RUN_STATUS` messages include the same `jobId` for tracking

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

1. **Real Azure Batch Polling**
   - Replace mock status with actual batch job status
   - Poll Azure Function endpoint: `GET /api/status/{jobId}`
   - Configurable polling interval

2. **Progress Details**
   - Current replication number
   - Estimated time remaining
   - Resource utilization

3. **Cancellation Support**
   - New message type: `MODEL_RUN_CANCEL`
   - Cancel Azure Batch job
   - Send final status: `cancelled`

4. **Result Notifications**
   - Push notification when simulation completes
   - Include result summary in status message

---

## Related Documentation

- [01. Simulation Lifecycle](./01_simulation_lifecycle.md) - End-to-end flow
- [03. Extension Handler](./03_extension_handler.md) - Handler implementation
- [06. Status Polling](./06_status_polling.md) - Status update mechanism
- [simulation-run.md](./simulation-run.md) - Original message protocol doc
