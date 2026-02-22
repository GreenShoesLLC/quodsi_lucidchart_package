# Scenario Change Requests — Frontend Design

**Date:** 2026-02-22
**Status:** Approved

## Problem

The Python simulation engine supports declarative "what-if" modifications via `ScenarioChangeRequest` (double a resource's capacity, exclude an activity, etc.). The frontend has no equivalent. Users cannot define or manage scenario variants from the LucidChart UI.

Additionally, the frontend uses "Scenario" to mean a simulation run record, colliding with the standard simulation term where a scenario is a named model variant.

## Decisions

| Decision | Choice |
|----------|--------|
| **Scenario** | Named set of change requests = a model variant, stored in shapeData |
| **SimulationRun** | Renamed from old "Scenario" = execution record, stays in blob |
| **Base model** | Implicit "Baseline" scenario (no change requests) |
| **Persistence** | LucidChart page shapeData via dedicated `q_scenarios` key |
| **Run persistence** | Blob storage only (unchanged) |
| **UX** | Scenario-first flow: manage scenarios, add changes, then run |
| **Timing** | Pre-simulation changes only (MVP); `startDatetime` deferred |
| **Implementation order** | Rename first (Scenario → SimulationRun), then add new functionality |

## Design

### 1. Data Model (TypeScript Types)

New types in `shared/src/types/elements/`:

**Enums (mirroring Python):**
- `ScenarioObjectType` — ENTITY, ACTIVITY, RESOURCE, GENERATOR, CONNECTOR, MODEL
- `ScenarioPropertyName` — CAPACITY, DURATION, ACTIVITY_CAPACITY, INBOUND_QUEUE_CAPACITY, OUTBOUND_QUEUE_CAPACITY, WEIGHT, INTERVAL, MAX_ENTITIES, ENTITIES_PER_CREATION, INCLUDE, NAME, REPS, SEED, RUN_PERIOD
- `ScenarioSetterType` — EQUAL, ADD, SUBTRACT, MULTIPLY, DIVIDE, MINIMUM, MAXIMUM

**Modification classes:**
- `NumericPropertyModification` — `{ propertyName, setterType, newValue }`
- `BooleanPropertyModification` — `{ propertyName, newValue }`

**Core types:**
- `ScenarioChangeRequest` — `{ id, objectType, objectMatchCriteria, modificationDetails, description? }`
  - No `startDatetime` for MVP
- `Scenario` (new) — `{ id, name, description?, changeRequests: ScenarioChangeRequest[] }`

**Serialized interfaces:**
- `ISerializedScenario`
- `ISerializedScenarioChangeRequest`

**Rename:**
- `Scenario` → `SimulationRun`
- `ScenarioEditor` → `SimulationRunEditor`
- `ScenarioCard` → `SimulationRunCard`
- All related senders, slices, hooks, message types

### 2. Storage & Persistence

Follows the established pattern used by States and ResourceRequirements.

**StorageAdapter** gains:
```
SCENARIOS_KEY = 'q_scenarios'
setScenarios(page, scenarios: ISerializedScenario[]): void
getScenarios(page): ISerializedScenario[]
clearScenarios(page): void
```

**ModelManager** gains:
```
updateScenarios(scenarios: ISerializedScenario[], page): Promise<void>
```

**ModelDefinitionPageBuilder** gains:
```
loadScenarios(page, modelDefinition): void
```

**ModelDefinition.ts** gains:
```
public readonly scenarios: ScenarioListManager;
```

### 3. Messaging

**New message types:**
- `SCENARIOS_DEFINITION_UPDATE` — React → Extension: save definitions to shapeData
- `SCENARIOS_DEFINITION_RESULT` — Extension → React: confirm save

**Renamed message types:**
- `SCENARIOS_LIST_REQUEST` → `SIMULATION_RUNS_LIST_REQUEST`
- `SCENARIOS_LIST_RESULT` → `SIMULATION_RUNS_LIST_RESULT`
- `SCENARIO_DELETE_RESULT` → `SIMULATION_RUN_DELETE_RESULT`

**New handler:** `scenarioDefinitionHandler.ts` — receives update, persists via ModelManager, validates, sends refresh.

**React sender** gains `updateScenarioDefinitions()`.

### 4. Rename Scope (Scenario → SimulationRun)

**Shared library:**
- `Scenario.ts` → `SimulationRun.ts`
- `PageStatus.scenarios` → `PageStatus.simulationRuns`
- `MAX_SCENARIOS` → `MAX_SIMULATION_RUNS`
- EnvelopeMessageType values renamed

**React:**
- `ScenarioEditor.tsx` → `SimulationRunEditor.tsx`
- `ScenarioCard.tsx` → `SimulationRunCard.tsx`
- `scenarioSender.ts` → `simulationRunSender.ts`
- `scenarioSlice.ts` → `simulationRunSlice.ts`
- `useScenarios` → `useSimulationRuns`

**Extension:**
- Message handler files and route registrations

**Not renamed:**
- Azure blob storage structure
- Data connector API routes
- Python codebase

### 5. React UI

**New components:**
- `ScenarioDefinitionEditor.tsx` — main panel listing scenario definitions
- `ScenarioDefinitionCard.tsx` — card per scenario with change request list and Run button
- `ChangeRequestEditor.tsx` — form for adding/editing a change request (dropdowns for object type, target object, property, setter type; input for value)

**Tab organization:**
- **Scenarios tab** — scenario definitions, change requests, run button per scenario
- **Runs tab** — SimulationRunEditor (execution history, results, downloads)

**PanelHeader.tsx:**
- "Run Simulation" button runs Baseline
- Scenarios tab for what-if runs

### 6. Data Connector & Python Integration

When running with change requests:
1. Extension attaches `scenarioChangeRequests` array to model JSON payload
2. Data connector passes to Python runner
3. Python runner deserializes into `ScenarioChangeRequest` objects, applies via `ScenarioChangeApplicator`

Backwards compatible: absent or empty `scenarioChangeRequests` = Baseline run.

SimulationRun records in blob gain a `scenarioId` field to associate runs with their source scenario.

## Implementation Order

1. **Rename Scenario → SimulationRun** — dedicated step, confirm everything works
2. **TypeScript types** — new enums, classes, serialized interfaces (sync guide layers 1-2)
3. **Storage layer** — StorageAdapter, ModelManager, ModelDefinitionPageBuilder
4. **Messaging layer** — new message types, handler, sender
5. **React UI** — ScenarioDefinitionEditor, ChangeRequestEditor, tab reorganization
6. **Data connector integration** — pass change requests to Python runner
7. **Version transforms** — for existing documents without scenarios
