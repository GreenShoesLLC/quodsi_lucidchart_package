# Simulation Run Exchange

## Overview
Simulation run messages handle the complete lifecycle of running a simulation: request submission, acknowledgment, and status updates throughout execution.

## Message Flow

### MODEL_RUN_REQUEST: React → Extension

**Direction:** React → Extension  
**Purpose:** Request execution of simulation run for current model  
**Auth Required:** Yes  

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

**Sender:**
- File: `quodsim-react/src/messaging/senders/simulationSender.ts`
- Hook: `useSimulationSender()` returns `requestSimulation()` function
- Implementation: Hook-based sender using `MessageProvider` context

**Handler:**
- File: `src/core/messaging/handlers/simulationHandler.ts`
- Function: `SimulationHandler.handleRunRequest`

**Response:** `MODEL_RUN_STATUS` (initial status with QUEUED)

---

### MODEL_RUN_STATUS: Extension → React

**Direction:** Extension → React  
**Purpose:** Provide periodic updates on simulation execution status  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  jobId: string,
  documentId: string,
  scenarioId: string,
  scenarioName: string,
  status: 'queued' | 'processing' | 'running' | 'completed' | 'failed',
  progress: number,
  currentStep?: string,
  lastChecked: string,
  queuedAt?: string,
  errorMessage?: string,
  hasResults?: boolean
}
```

**Enhanced Fields:**
- `scenarioId` - Unique UUID for this simulation run
- `scenarioName` - User-friendly name (timestamp format: "YY-MM-DD HH:MM:SS")
- `currentStep` - Human-readable description of current execution phase
- `lastChecked` - ISO timestamp of last status check
- `queuedAt` - ISO timestamp when job was first queued (initial message only)

**Sender:** 
- File: `src/core/messaging/handlers/simulationHandler.ts`
- Function: `SimulationHandler.checkAndUpdateStatus`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/simulation.mapper.ts`
- Function: `mapSimulation`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| MODEL_RUN_REQUEST | ✅ simulationSender.requestSimulation | ✅ SimulationHandler.handleRunRequest | ➖ N/A | ➖ N/A |
| MODEL_RUN_STATUS | ➖ N/A | ➖ N/A | ✅ SimulationHandler.handleRunRequest + pollDocumentStatus | ✅ mapSimulation |

**Note:** The initial MODEL_RUN_STATUS message (with status QUEUED) is sent from handleRunRequest and serves as the acknowledgment. Subsequent STATUS messages are sent by pollDocumentStatus every 10 seconds.

## Complete Simulation Sequence

1. User clicks "Run Simulation" button (generates timestamp-based scenario name)
2. **MODEL_RUN_REQUEST** sent to extension with documentId and scenarioName
3. Extension validates model is ready for simulation
4. Extension generates unique scenarioId (UUID)
5. Extension serializes model and captures SVG
6. **MODEL_RUN_STATUS** sent to React with status 'queued' (serves as acknowledgment)
7. React shows "simulation in progress" UI
8. Extension submits job to Azure Data Connector
9. Extension starts periodic status polling (every 10s via GetDocumentStatus data action)
10. **MODEL_RUN_STATUS** updates sent to React:
    - `status: 'queued'` - Job queued, waiting to start
    - `status: 'processing'` - Initializing
    - `status: 'running'` - Simulation actively executing
    - `status: 'completed'` - Finished successfully (hasResults: true)
    - `status: 'failed'` - Error occurred
11. React updates progress indicator with each status message
12. When completed, React enables "View Results" button
13. User clicks "View Results"
14. React sends **RESULTS_PAGE_CREATE** request

## Implementation Details

### React Sender: useSimulationSender Hook

**File:** `quodsim-react/src/messaging/senders/simulationSender.ts`

```typescript
export const useSimulationSender = () => {
  const { send } = useContext(MessageProvider);

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

  return { requestSimulation };
};
```

**Usage in Components:**
```typescript
const { requestSimulation } = useSimulationSender();

// Trigger simulation
const handleSimulate = () => {
  requestSimulation(documentId, "LucidChart");
};
```

---

### Extension Simulation Handler

**File:** `src/core/messaging/handlers/simulationHandler.ts`

```typescript
async handleRunRequest(msg: EnvelopeBase): Promise<void> {
    try {
        const data = msg.data as ModelRunRequestPayload;

        // Load and serialize model
        const modelDefinition = await this.modelManager.getModelDefinition();
        const serializer = ModelSerializerFactory.create(modelDefinition);
        const serializedModel = serializer.serialize(modelDefinition);

        // Capture SVG
        const diagramSvg = await activePageProxy.getSvg(undefined, true);

        // Generate job ID
        const jobId = `job-${documentId}-${Date.now()}`;

        // Send acknowledgment
        router.send('model', {
            type: EnvelopeMessageType.MODEL_RUN_ACK,
            data: {
                jobId,
                queuedAt: new Date().toISOString()
            }
        });

        // Submit to Azure via data connector
        await LucidDataActionUtility.performDataAction(client, {
            dataConnectorName: 'quodsi_data_connector',
            actionName: 'SaveAndSubmitSimulation',
            actionData: {
                documentId,
                scenarioId: BASELINE_SCENARIO_ID,
                model: serializedModel,
                scenarioName: data.scenarioName || 'New Scenario',
                diagramSvg,
                appVersion: '1.0'
            },
            asynchronous: true
        });

        // Start real Azure polling
        SimulationHandler.pollDocumentStatus(documentId, scenarioId, jobId);

    } catch (error) {
        // Send error status
        router.send('model', {
            type: EnvelopeMessageType.MODEL_RUN_STATUS,
            data: {
                jobId: 'error',
                status: SimulationStatus.FAILED,
                error: error.message
            }
        });
    }
}
```

### Status Polling

**Method:** `SimulationHandler.pollDocumentStatus()`

**Implementation:**
```typescript
private static async pollDocumentStatus(
    documentId: string,
    scenarioId: string,
    jobId: string
): Promise<void> {
    // Create polling interval (10 seconds)
    const intervalId = setInterval(async () => {
        try {
            // Query Azure via data connector
            const response = await LucidDataActionUtility.performDataAction(client, {
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'GetDocumentStatus',
                actionData: { documentId },
                asynchronous: false
            });

            // Extract scenario status
            const scenario = response.pageStatus.scenarios.find(
                s => s.scenarioId === scenarioId
            );

            // Map RunState to SimulationStatus
            const status = this.mapRunStateToStatus(scenario?.runState);

            // Send status update
            router.send('model', {
                type: EnvelopeMessageType.MODEL_RUN_STATUS,
                data: {
                    jobId,
                    status,
                    progress: this.calculateProgress(status),
                    hasResults: scenario?.hasResults || false
                }
            });

            // Stop polling if complete or failed
            if (status === SimulationStatus.COMPLETED ||
                status === SimulationStatus.FAILED) {
                clearInterval(intervalId);

                // Clean up after 60s
                setTimeout(() => {
                    SimulationHandler.activeJobs.delete(jobId);
                }, 60000);
            }

        } catch (error) {
            // Send error and stop polling
            router.send('model', {
                type: EnvelopeMessageType.MODEL_RUN_STATUS,
                data: {
                    jobId,
                    status: SimulationStatus.FAILED,
                    error: error.message
                }
            });
            clearInterval(intervalId);
        }
    }, 10000); // Poll every 10 seconds

    // Store interval handle for cleanup
    const job = SimulationHandler.activeJobs.get(jobId);
    if (job) {
        job.pollInterval = intervalId;
    }
}
```

**Polling Interval:** 10 seconds (changed from 5 seconds)

## Status Transitions

```
[Request] → [Pending] → [Running] → [Completed]
                                 ↘ [Failed]
```

- **Pending**: Job submitted to Azure Batch queue
- **Running**: Simulation engine executing
- **Completed**: Results available for viewing
- **Failed**: Error occurred during execution

## Error Handling

### Submission Errors
- Model validation failures
- Authentication issues
- Data connector API errors
- Network connectivity problems

### Execution Errors
- Simulation engine errors
- Resource allocation failures
- Timeout conditions
- Data processing errors

### Recovery Mechanisms
- Retry logic for transient failures
- Graceful degradation for partial results
- Clear error messaging to user
- Status polling continues until definitive result

## Integration with Data Connector

The simulation system integrates with Azure-based data connector:
- **Submission**: POST to `/api/dataConnector/simulate`
- **Status**: GET to `/api/dataConnector/status/{jobId}`
- **Results**: GET to `/api/dataConnector/results/{jobId}`

## UI State Management

React UI updates based on status:
- **Request sent**: Show loading spinner
- **ACK received**: Display job ID, enable cancel
- **Running**: Show progress bar
- **Completed**: Enable "View Results" button
- **Failed**: Show error message, enable retry

## Related Messages
- **MODEL_VALIDATE** - May precede simulation request
- **RESULTS_PAGE_CREATE** - Follows successful completion
- **AUTH_STATUS** - Required for authenticated operations