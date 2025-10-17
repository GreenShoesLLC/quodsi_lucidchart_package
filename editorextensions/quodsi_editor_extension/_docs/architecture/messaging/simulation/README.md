# Simulation Messages

Comprehensive documentation of the simulation execution system, covering the complete flow from user interaction to Azure Batch completion.

## Overview

The simulation system orchestrates the execution of discrete event simulation models through a multi-tier architecture:

1. **React UI** - User interaction and status display
2. **Extension** - Model preparation, serialization, and coordination
3. **Azure Function** - Storage upload and batch job submission
4. **Azure Batch** - Actual simulation execution via Python runner

## Documentation Structure

### Core Flow Documentation

#### [01. Simulation Lifecycle](./01_simulation_lifecycle.md)
Complete end-to-end flow from button click to results display.

**Contents:**
- Visual flow diagram
- Component responsibilities
- State transitions
- Step-by-step breakdown with file references

**Start here for:** Understanding the complete simulation pipeline

---

#### [02. Message Flow](./02_message_flow.md)
Detailed message sequencing and payload schemas.

**Contents:**
- MODEL_RUN_REQUEST → MODEL_RUN_ACK → MODEL_RUN_STATUS
- Message timing and ordering
- Payload structures
- React sender → Extension handler → React mapper chains

**Start here for:** Understanding inter-component communication

---

### Component Documentation

#### [03. Extension Handler](./03_extension_handler.md)
Deep dive into the SimulationHandler class.

**Contents:**
- Model loading and validation
- ModelDefinition serialization
- SVG diagram capture
- Job tracking mechanism
- Mock vs production polling

**File reference:** `src/core/messaging/handlers/simulationHandler.ts`

---

#### [04. Data Connector Integration](./04_data_connector_integration.md)
Azure Function orchestration and storage.

**Contents:**
- OAuth workaround implementation
- Blob storage upload process
- Batch job submission
- Performance metrics and logging

**File references:**
- `dataconnectors/.../functions/saveAndSubmitSimulation.ts`
- `src/utils/LucidDataActionUtility.ts`

---

#### [05. Batch Service](./05_batch_service.md)
Azure Batch job creation and execution.

**Contents:**
- Batch configuration
- Job and task creation
- Retry logic
- Python CLI command construction
- Environment variables

**File reference:** `dataconnectors/.../services/lucidSimulationJobSubmissionService.ts`

---

#### [06. Status Polling](./06_status_polling.md)
Status update mechanism and UI synchronization.

**Contents:**
- Mock implementation details
- Planned real polling mechanism
- Status message mapping
- UI updates and button states
- Completion detection

**File references:**
- `quodsim-react/src/messaging/mappers/simulation.mapper.ts`
- `quodsim-react/src/features/modelPanel/PanelHeader.tsx`

---

### Supporting Documentation

#### [07. Error Handling](./07_error_handling.md)
Error types, recovery strategies, and debugging.

**Contents:**
- Error types by phase
- Custom error classes
- User-facing messages
- Recovery strategies
- Debugging approaches

---

#### [Troubleshooting Guide](./troubleshooting.md)
Common issues and solutions.

**Contents:**
- OAuth problems
- Model serialization failures
- Batch submission errors
- Status polling issues
- Environment configuration
- Debug commands

---

## Message Types

This subsystem handles three primary message types:

| Message Type | Direction | Purpose |
|--------------|-----------|---------|
| `MODEL_RUN_REQUEST` | React → Extension | Initiate simulation |
| `MODEL_RUN_ACK` | Extension → React | Acknowledge submission |
| `MODEL_RUN_STATUS` | Extension → React | Progress updates |

For detailed message protocol, see [simulation-run.md](./simulation-run.md)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERACTION                          │
│                   (PanelHeader - "Run Simulation")               │
└────────────────────────────┬────────────────────────────────────┘
                             │ MODEL_RUN_REQUEST
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTENSION (Host Process)                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ SimulationHandler                                         │  │
│  │  • Validate & serialize model                            │  │
│  │  • Capture diagram SVG                                   │  │
│  │  • Send MODEL_RUN_ACK ────────────┐                     │  │
│  │  • Track job                       │                     │  │
│  └────────────────┬───────────────────┘                     │  │
│                   │                                          │  │
│  ┌────────────────▼───────────────────────────────────────┐ │  │
│  │ LucidDataActionUtility                                  │ │  │
│  │  • OAuth workaround                                     │ │  │
│  │  • performDataAction(SaveAndSubmitSimulation)           │ │  │
│  └────────────────┬───────────────────────────────────────┘ │  │
└───────────────────┼─────────────────────────────────────────┘  │
                    │                                             │
                    ▼                                             │
┌─────────────────────────────────────────────────────────────────┤
│              AZURE FUNCTION (Data Connector)                    │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ saveAndSubmitSimulation                                   │  │
│  │  Phase 1: Upload model JSON to Blob Storage              │  │
│  │  Phase 2: Submit to Azure Batch                          │  │
│  └────────────────┬───────────────────────────────────────┘  │  │
└───────────────────┼─────────────────────────────────────────┘  │
                    │                                             │
                    ▼                                             │
┌─────────────────────────────────────────────────────────────────┤
│              AZURE BATCH SERVICE                                │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ LucidSimulationJobSubmissionService                       │  │
│  │  • Create batch job                                       │  │
│  │  • Create task with Python CLI                           │  │
│  │  • Execute: python -m quodsim_runner.lucidchart.cli      │  │
│  └────────────────────────────────────────────────────────┘  │  │
└─────────────────────────────────────────────────────────────────┘
                    │
                    │ (Periodic status checks)
                    │ MODEL_RUN_STATUS
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                      REACT UI UPDATE                             │
│  • simulation.mapper.ts maps to actions                         │
│  • PanelHeader updates button states                            │
│  • Progress indicator shows status                              │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Reference

### Key Files by Layer

**React UI:**
- `quodsim-react/src/features/modelPanel/PanelHeader.tsx:124` - Button click
- `quodsim-react/src/messaging/senders/simulationSender.ts:21` - Message sender
- `quodsim-react/src/messaging/mappers/simulation.mapper.ts:12` - Status mapper

**Extension:**
- `src/core/messaging/handlers/simulationHandler.ts:70` - Main handler
- `src/utils/LucidDataActionUtility.ts:31` - OAuth utility
- `src/core/messaging/MessageRouter.ts:201` - Message routing

**Data Connector:**
- `dataconnectors/.../functions/saveAndSubmitSimulation.ts:33` - Azure Function
- `dataconnectors/.../services/lucidSimulationJobSubmissionService.ts:111` - Batch service
- `dataconnectors/.../services/azureStorageService.ts` - Blob storage

### Status Values

| Status | Meaning | Source |
|--------|---------|--------|
| `QUEUED` | Waiting to start | Extension mock |
| `PROCESSING` | Initializing | Extension mock |
| `VALIDATING` | Model validation | Extension mock |
| `RUNNING` | Executing simulation | Extension mock |
| `COMPLETED` | Finished successfully | Extension mock |
| `FAILED` | Error occurred | Extension mock |

**Note:** Current implementation uses mock status updates. Real Azure Batch polling is planned.

## For Developers

**Prerequisites:**
- Understanding of message-passing architecture
- Familiarity with Azure Batch concepts
- Access to Azure Function configuration

**Common Tasks:**
- Adding status types: See [06_status_polling.md](./06_status_polling.md)
- Implementing real polling: See [03_extension_handler.md](./03_extension_handler.md)
- Error handling: See [07_error_handling.md](./07_error_handling.md)
- Debugging: See [troubleshooting.md](./troubleshooting.md)

## For LLMs

This documentation uses:
- File path references in format: `path/to/file.ts:line`
- ASCII diagrams for visual flow
- Table summaries for quick reference
- Cross-references between related documents
- Minimal code blocks (refer to source files)
