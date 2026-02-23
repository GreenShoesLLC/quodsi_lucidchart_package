# Unified Scenario Manager Design

**Date**: 2026-02-23
**Branch**: feature/scenario-change-requests (continuation)

## Problem

The current UI has separate sub-tabs for scenario definitions ("Scenarios") and simulation runs ("Runs"), plus a "Run Simulation" button in PanelHeader that runs a baseline simulation with no scenario association. This creates confusion about which scenario a run belongs to and splits the run-a-simulation workflow across multiple UI locations.

## Design Decisions

1. **Single run per scenario** — each scenario (including Baseline) has at most one active simulation run at a time
2. **Replace before re-run** — clicking play on a scenario with existing results shows a confirmation dialog before replacing
3. **Persisted Baseline** — Baseline is a real `ScenarioDefinition` with `isBaseline: true` and empty `changeRequests`, auto-created on model load
4. **No shapeData writes during polling** — `q_scenarios` stores definitions only; run status comes from Azure at runtime via `scenarioDefinitionId` matching in `status.json`
5. **Remove PanelHeader run button** — all simulation runs are launched from the scenarios tab
6. **Output viewing is independent** — Analysis dashboard stays as a separate view, accessed via "Analyze" link from the scenario detail panel

## Data Model

### q_scenarios (shapeData) — definitions only

```typescript
[
  {
    id: "baseline-uuid",
    name: "Baseline",
    description: "No scenario changes",
    changeRequests: [],
    isBaseline: true       // Prevents deletion/renaming
  },
  {
    id: "user-uuid",
    name: "High Volume",
    description: "Double bed capacity",
    changeRequests: [...]
    // No run info stored here
  }
]
```

**Write frequency**: Only on user edits to scenario definitions. Zero writes during run lifecycle or polling.

### q_data (shapeData) — no changes

No new fields. The existing `q_data` structure is unchanged.

### In-memory run status (React state, not persisted)

```typescript
interface ScenarioRunStatus {
  scenarioDefinitionId: string;  // Matches scenario.id in q_scenarios
  scenarioId: string;            // Azure blob folder ID
  status: RunState;              // From Azure status.json
  scenarioName: string;
  submittedAt?: string;
  completedAt?: string;
  hasResults: boolean;
}
```

Populated from Azure on each poll via `ListScenarios` data connector action. Matched to scenario definitions by `scenarioDefinitionId` field in `status.json` (added in prior session).

### ISerializedScenario (shared type) — add isBaseline

```typescript
interface ISerializedScenario {
  id: string;
  name: string;
  description?: string;
  changeRequests: ISerializedScenarioChangeRequest[];
  isBaseline?: boolean;  // NEW — prevents deletion/renaming in UI
}
```

## UI Layout

```
┌─────────────────────────────────────┐
│ Scenarios Tab                       │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Scenario Cards (scrollable)     │ │
│ │                                 │ │
│ │  [▶] Baseline        ● Ready   │ │
│ │  [▶] High Volume     ◌ No run  │ │
│ │  [▶] Low Staffing    ⟳ Running │ │
│ │                                 │ │
│ │  [+ Add Scenario]              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Detail Panel (selected scenario)│ │
│ │                                 │ │
│ │  Name: [High Volume        ]   │ │
│ │  Desc: [Double bed capacity ]   │ │
│ │                                 │ │
│ │  Change Requests:               │ │
│ │  • Resource "CPPUBed" x2 cap   │ │
│ │  [+ Add Change Request]        │ │
│ │                                 │ │
│ │  -- Run Status ──────────────  │ │
│ │  Status: Not run               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Auto-refresh: [Smart ▾]            │
└─────────────────────────────────────┘
```

## Component Hierarchy

```
ScenariosAndRunsPanel (new — replaces old sub-tab container)
├── ScenarioCardList
│   ├── ScenarioCard (Baseline — non-deletable)
│   ├── ScenarioCard (user scenario N)
│   └── "Add Scenario" button
├── ScenarioDetailPanel (for selected scenario)
│   ├── ScenarioEditForm (name, description, change requests)
│   │   └── ChangeRequestEditor (existing, reused)
│   └── RunStatusSummary (status badge, timestamps, "Analyze" link)
└── AutoRefreshControl (Off/Smart/On dropdown)
```

## Interaction Flows

### Migration: Baseline auto-creation

```
Model opens → ModelManager.initializeModel()
  → Reads q_scenarios
  → No entry with isBaseline: true?
    → Creates Baseline ScenarioDefinition
    → Prepends to q_scenarios
    → Writes to shapeData (one-time migration)
```

### Run a scenario

```
User clicks ▶ on scenario card
  → Existing completed run? → Confirm dialog: "Replace existing results?"
    → Cancel: abort
    → Confirm: proceed
  → Send MODEL_RUN_REQUEST { documentId, scenarioName, scenarioDefinitionId }
  → Extension serializes model + embeds changeRequests (existing logic)
  → Submit to Azure Batch
  → Optimistic UI: card shows "Queued" spinner
  → Smart polling auto-activates
```

### Smart polling

```
Every 10s (when any scenario has active run):
  → SIMULATION_RUNS_LIST_REQUEST → extension → ListScenarios data connector
  → Returns runs with scenarioDefinitionId in status.json
  → React matches runs to scenarios by scenarioDefinitionId
  → Updates in-memory status per card
  → All terminal? → smart polling stops
```

### Analyze results

```
Selected scenario has completed run
  → Detail panel shows "Analyze" button
  → Click opens Analysis dashboard with scenarioId for result loading
```

## Scope of Changes

### Removed

- **PanelHeader "Run Simulation" button** — removed from `PanelHeader.tsx`
- **SimulationRunsPanel sub-tabs** — "Scenarios | Runs" toggle removed
- **SimulationRunEditor component** — replaced by unified card list + polling
- **SimulationRunCard component** — replaced by ScenarioCard

### Retained / Migrated

- **ChangeRequestEditor** — reused as-is
- **Auto-refresh dropdown** (Off/Smart/On) — migrated to ScenariosAndRunsPanel
- **Smart polling logic** — migrated, same 10s interval + smart skip
- **Optimistic submission UI** — migrated
- **SimulationRunAnalysisDashboard** — stays, accessed via "Analyze" link
- **Redux simulationRunSlice** — retained for in-memory run status
- **Extension-side code** — simulationHandler.ts, simulationRunHandler.ts, data connector actions unchanged

### Changed

- **ModelEditor.tsx** — scenarios tab renders ScenariosAndRunsPanel
- **ModelPanel.tsx** — handleSimulate removed
- **StorageAdapter / ModelManager** — Baseline migration logic
- **ISerializedScenario** (shared) — add `isBaseline?: boolean`
- **ScenarioDefinition** (shared) — add `isBaseline` property
