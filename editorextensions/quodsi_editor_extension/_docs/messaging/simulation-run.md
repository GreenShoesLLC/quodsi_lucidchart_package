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
  modelId?: string,
  priority?: number,
  options?: object
}
```

**Sender:** 
- File: `quodsim-react/src/messaging/senders/simulationSender.ts`
- Function: `simulationSender.runSimulation`

**Handler:**
- File: `src/core/messaging/handlers/simulationHandler.ts`
- Function: `SimulationHandler.handleRunRequest`

**Response:** `MODEL_RUN_ACK`

---

### MODEL_RUN_ACK: Extension → React

**Direction:** Extension → React  
**Purpose:** Acknowledge simulation request received and processed  
**Auth Required:** Yes  

**Payload:**
```typescript
{
  success: boolean,
  jobId?: string,
  documentId: string,
  errorMessage?: string
}
```

**Sender:** 
- File: `src/core/messaging/handlers/simulationHandler.ts`
- Function: `SimulationHandler.handleRunRequest`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/simulation.mapper.ts`
- Function: `simulation.mapper.mapMessageToAction`

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
  status: 'pending' | 'running' | 'completed' | 'failed',
  progress?: number,
  errorMessage?: string,
  hasResults?: boolean
}
```

**Sender:** 
- File: `src/core/messaging/handlers/simulationHandler.ts`
- Function: `SimulationHandler.checkAndUpdateStatus`

**Handler:**
- File: `quodsim-react/src/messaging/mappers/simulation.mapper.ts`
- Function: `simulation.mapper.mapMessageToAction`

## Handler Analysis

| Message Type | React Sender | Extension Handler | Extension Sender | React Handler |
|--------------|--------------|-------------------|------------------|---------------|
| MODEL_RUN_REQUEST | ✅ simulationSender.runSimulation | ✅ SimulationHandler.handleRunRequest | ➖ N/A | ➖ N/A |
| MODEL_RUN_ACK | ➖ N/A | ➖ N/A | ✅ SimulationHandler.handleRunRequest | ✅ simulation.mapper.mapMessageToAction |
| MODEL_RUN_STATUS | ➖ N/A | ➖ N/A | ✅ SimulationHandler.checkAndUpdateStatus | ✅ simulation.mapper.mapMessageToAction |

## Complete Simulation Sequence

1. User clicks "Run Simulation" button
2. **MODEL_RUN_REQUEST** sent to extension
3. Extension validates model is ready for simulation
4. Extension submits job to Azure Data Connector
5. **MODEL_RUN_ACK** sent to React (with jobId)
6. React shows "simulation in progress" UI
7. Extension starts periodic status polling
8. **MODEL_RUN_STATUS** updates sent to React:
   - `status: 'pending'` - Job queued
   - `status: 'running'` - Simulation executing
   - `status: 'completed'` - Finished successfully
   - `status: 'failed'` - Error occurred
9. React updates progress indicator
10. When completed, React enables "View Results" button
11. User clicks "View Results"
12. React sends **RESULTS_PAGE_CREATE** request

## Implementation Details

### Simulation Request Handler
```typescript
async handleRunRequest(msg: EnvelopeBase): Promise<void> {
    try {
        const data = msg.data as ModelRunRequestPayload;
        
        // Validate model before submission
        const validationResult = await this.modelManager.validateModel();
        if (!validationResult.isValid) {
            throw new Error('Model validation failed');
        }
        
        // Submit to data connector
        const jobResponse = await this.dataConnectorService.submitSimulation({
            documentId: data.documentId,
            modelData: await this.modelManager.serializeModel(),
            options: data.options
        });
        
        // Send acknowledgment
        this.router.sendToChannel(msg.source, EnvelopeMessageType.MODEL_RUN_ACK, {
            success: true,
            jobId: jobResponse.jobId,
            documentId: data.documentId
        });
        
        // Start status polling
        this.startStatusPolling(jobResponse.jobId, data.documentId);
        
    } catch (error) {
        // Send error response
        this.router.sendToChannel(msg.source, EnvelopeMessageType.MODEL_RUN_ACK, {
            success: false,
            documentId: data.documentId,
            errorMessage: error.message
        });
    }
}
```

### Status Polling
```typescript
private async startStatusPolling(jobId: string, documentId: string): Promise<void> {
    const pollInterval = setInterval(async () => {
        try {
            const status = await this.dataConnectorService.getJobStatus(jobId);
            
            // Send status update
            this.router.broadcastToAllChannels(EnvelopeMessageType.MODEL_RUN_STATUS, {
                jobId,
                documentId,
                status: status.state,
                progress: status.progress,
                hasResults: status.hasResults
            });
            
            // Stop polling if job is complete
            if (status.state === 'completed' || status.state === 'failed') {
                clearInterval(pollInterval);
            }
            
        } catch (error) {
            // Send error status
            this.router.broadcastToAllChannels(EnvelopeMessageType.MODEL_RUN_STATUS, {
                jobId,
                documentId,
                status: 'failed',
                errorMessage: error.message
            });
            clearInterval(pollInterval);
        }
    }, 5000); // Poll every 5 seconds
}
```

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