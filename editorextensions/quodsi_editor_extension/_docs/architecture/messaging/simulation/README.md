# Simulation Messages

Simulation execution and status tracking messages.

## Messages

### [SIMULATION_RUN](./simulation-run.md)
**Direction:** Bidirectional
**Purpose:** Execute simulation and track progress

**Message Flow:**
```
MODEL_RUN_REQUEST (React → Extension)
    ↓
MODEL_RUN_ACK (Extension → React)
    ↓
MODEL_RUN_STATUS (Extension → React, periodic)
    ↓
RESULTS_PAGE_CREATE (when complete)
```

## Simulation Lifecycle

### 1. Request Phase
```
User clicks "Run Simulation" →
MODEL_VALIDATE (ensure valid) →
MODEL_RUN_REQUEST → Extension
```

**Request Payload:**
```typescript
{
  scenarioId: string,
  numReplications: number,
  randomSeed?: number,
  options?: SimulationOptions
}
```

### 2. Acknowledgment Phase
```
Extension receives request →
Validates model →
Submits to Azure Batch →
MODEL_RUN_ACK → React
```

**ACK Payload:**
```typescript
{
  success: boolean,
  jobId: string,
  estimatedDuration?: number,
  errorMessage?: string
}
```

### 3. Status Updates Phase
```
Extension polls Azure Batch →
MODEL_RUN_STATUS → React (every 5-10s)
```

**Status Payload:**
```typescript
{
  jobId: string,
  status: 'queued' | 'running' | 'completed' | 'failed',
  progress?: number,  // 0-100
  message?: string,
  timestamp: string
}
```

### 4. Completion Phase
```
Simulation completes →
Extension imports results →
RESULTS_PAGE_CREATE → Creates dashboard →
Final MODEL_RUN_STATUS (status='completed')
```

## Simulation States

- **Queued:** Waiting for compute resources
- **Running:** Actively executing
- **Completed:** Finished successfully
- **Failed:** Error during execution
- **Cancelled:** User cancelled

## Error Handling

**Common Errors:**
- Model validation failures
- Azure Batch submission errors
- Compute resource unavailability
- Results import failures

**Recovery:**
- Validation errors: Show messages, allow fixes
- Submission errors: Retry mechanism
- Import errors: Manual result retrieval option

## Integration

**Extension:**
- `SimulationHandler` manages lifecycle
- `LucidSimulationJobSubmissionService` submits to Azure
- `SimulationResultsImporter` retrieves results
- Polling mechanism for status updates

**React:**
- `mapSimulation` processes status updates
- Simulation panel shows progress
- Status indicator shows current state
- Results viewer launches on completion

## Azure Integration

**Data Connector:**
- Receives model definition JSON
- Submits Azure Batch job
- Polls for completion
- Imports results to LucidChart collections

**Collections:**
- `ActivityRepSummary` - Activity statistics
- `ResourceRepSummary` - Resource utilization
- `ScenarioResults` - Overall results
