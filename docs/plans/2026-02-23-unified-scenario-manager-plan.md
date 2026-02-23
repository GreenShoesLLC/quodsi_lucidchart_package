# Unified Scenario Manager Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the separate Scenarios/Runs sub-tabs with a unified scenario manager where each scenario (including a persisted Baseline) has its own play button, and remove the PanelHeader "Run Simulation" button.

**Architecture:** The "scenarios" tab becomes a single unified view with a scenario card list (top) and a detail panel (bottom). Scenario definitions live in `q_scenarios` shapeData. Run status comes from Azure at runtime via `scenarioDefinitionId` matching. No shapeData writes during polling.

**Tech Stack:** TypeScript, React 18, Tailwind CSS, Redux (simulationRunSlice), Lucid SDK (shapeData), existing messaging/polling infrastructure.

**Design doc:** `docs/plans/2026-02-23-unified-scenario-manager-design.md`

---

## Phase 1: Shared Type Changes

### Task 1: Add `isBaseline` to `ISerializedScenario`

**Files:**
- Modify: `shared/src/serialization/interfaces/ISerializedScenario.ts:3-8`

**Step 1: Add isBaseline field**

```typescript
export interface ISerializedScenario {
    id: string;
    name: string;
    description?: string;
    changeRequests: ISerializedScenarioChangeRequest[];
    isBaseline?: boolean;
}
```

**Step 2: Commit**

```bash
git add shared/src/serialization/interfaces/ISerializedScenario.ts
git commit -m "feat: add isBaseline field to ISerializedScenario"
```

### Task 2: Add `isBaseline` to `Scenario` class

**Files:**
- Modify: `shared/src/types/elements/Scenario.ts`

**Step 1: Add isBaseline property and update constructor, toJSON, fromJSON**

```typescript
import { ScenarioChangeRequest } from "./ScenarioChangeRequest";
import { generateUUID } from "../../utils/uuidUtils";

export class Scenario {
    id: string;
    name: string;
    description: string;
    changeRequests: ScenarioChangeRequest[];
    isBaseline: boolean;

    constructor(options?: {
        id?: string;
        name?: string;
        description?: string;
        changeRequests?: ScenarioChangeRequest[];
        isBaseline?: boolean;
    }) {
        this.id = options?.id ?? generateUUID();
        this.name = options?.name ?? "New Scenario";
        this.description = options?.description ?? "";
        this.changeRequests = options?.changeRequests ?? [];
        this.isBaseline = options?.isBaseline ?? false;
    }

    addChangeRequest(changeRequest: ScenarioChangeRequest): void {
        this.changeRequests.push(changeRequest);
    }

    removeChangeRequest(changeRequestId: string): void {
        this.changeRequests = this.changeRequests.filter(cr => cr.id !== changeRequestId);
    }

    toJSON(): any {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            changeRequests: this.changeRequests.map(cr => cr.toJSON()),
            isBaseline: this.isBaseline,
        };
    }

    static fromJSON(data: any): Scenario {
        return new Scenario({
            id: data.id,
            name: data.name ?? "New Scenario",
            description: data.description ?? "",
            changeRequests: (data.changeRequests ?? []).map(
                (cr: any) => ScenarioChangeRequest.fromJSON(cr)
            ),
            isBaseline: data.isBaseline ?? false,
        });
    }
}
```

**Step 2: Add a factory method for creating the Baseline scenario**

Add to `Scenario` class:

```typescript
static createBaseline(): Scenario {
    return new Scenario({
        name: "Baseline",
        description: "No scenario changes",
        changeRequests: [],
        isBaseline: true,
    });
}
```

**Step 3: Build shared library**

Run: `npm run build -w @quodsi/shared` (from `quodsi_lucidchart_package/`)
Expected: Clean build

**Step 4: Commit**

```bash
git add shared/src/types/elements/Scenario.ts
git commit -m "feat: add isBaseline to Scenario class with createBaseline factory"
```

### Task 3: Add `ensureBaseline` utility to shared

**Files:**
- Create: `shared/src/utils/scenarioUtils.ts`
- Modify: `shared/src/utils/index.ts` (add export)

**Step 1: Create scenarioUtils.ts**

This utility ensures a Baseline scenario exists in a scenarios array. Used by both the extension (on model load) and React (as a safety check).

```typescript
import { ISerializedScenario } from "../serialization/interfaces/ISerializedScenario";
import { Scenario } from "../types/elements/Scenario";

/**
 * Ensures a Baseline scenario exists in the given array.
 * If no scenario has isBaseline: true, creates one and prepends it.
 * Returns the (possibly modified) array and whether a Baseline was added.
 */
export function ensureBaselineScenario(
    scenarios: ISerializedScenario[]
): { scenarios: ISerializedScenario[]; baselineAdded: boolean } {
    const hasBaseline = scenarios.some(s => s.isBaseline === true);
    if (hasBaseline) {
        return { scenarios, baselineAdded: false };
    }
    const baseline = Scenario.createBaseline().toJSON();
    return {
        scenarios: [baseline, ...scenarios],
        baselineAdded: true,
    };
}
```

**Step 2: Export from utils/index.ts**

Add to `shared/src/utils/index.ts`:

```typescript
export { ensureBaselineScenario } from './scenarioUtils';
```

**Step 3: Also export from the main shared barrel (`shared/src/index.ts`)**

Check that `utils/index.ts` exports are already re-exported from the main barrel. If not, add:

```typescript
export { ensureBaselineScenario } from './utils/scenarioUtils';
```

**Step 4: Build shared**

Run: `npm run build -w @quodsi/shared`
Expected: Clean build

**Step 5: Commit**

```bash
git add shared/src/utils/scenarioUtils.ts shared/src/utils/index.ts shared/src/index.ts
git commit -m "feat: add ensureBaselineScenario utility"
```

---

## Phase 2: Extension-Side Baseline Migration

### Task 4: Auto-create Baseline on model load

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/src/core/ModelManager.ts:1485-1500`

**Context:** `ModelManager.updateScenarios()` already exists at line 1485. We need to add a method that runs during model initialization to ensure Baseline exists.

**Step 1: Add ensureBaselineScenario call**

Find where scenarios are first loaded in ModelManager. Look for where `getScenarios` is called or where the model is initialized after loading from storage. Add a method:

```typescript
/**
 * Ensures a Baseline scenario exists in q_scenarios.
 * Called during model initialization. Only writes to storage if Baseline was missing.
 */
private ensureBaselineScenario(page: PageProxy): void {
    const scenarios = this.storageAdapter.getScenarios(page);
    const { scenarios: updated, baselineAdded } = ensureBaselineScenario(scenarios);
    if (baselineAdded) {
        this.debug.log('ensureBaselineScenario - Creating Baseline scenario');
        this.storageAdapter.setScenarios(page, updated);
    }
}
```

**Step 2: Call from model initialization**

Find the model initialization flow (where the model is loaded from storage and becomes active). Call `this.ensureBaselineScenario(page)` after the model data is loaded.

Look at methods like `initializeModel()`, `loadModelFromPage()`, or similar. The call should happen after scenarios are loadable but before the UI receives them.

**Step 3: Add import**

```typescript
import { ensureBaselineScenario } from "@quodsi/shared";
```

**Step 4: Commit**

```bash
git add editorextensions/quodsi_editor_extension/src/core/ModelManager.ts
git commit -m "feat: auto-create Baseline scenario on model load"
```

---

## Phase 3: Update `onSimulate` Flow to Support `scenarioDefinitionId`

### Task 5: Update `useModelPanel` to pass `scenarioDefinitionId`

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/messaging/hooks/useModelPanel.ts:212-215`

**Context:** Currently `onSimulate` at line 212 only passes `documentId` and `scenarioName` to `simulationSender.requestSimulation`. The `requestSimulation` function already accepts `scenarioDefinitionId` as its 6th parameter (added in previous session). We need `onSimulate` to accept and forward it.

**Step 1: Update onSimulate signature and call**

```typescript
const onSimulate = (scenarioName?: string, scenarioDefinitionId?: string) => {
    logger.log(`Simulating model with scenario name: ${scenarioName}, scenarioDefinitionId: ${scenarioDefinitionId}`);
    simulationSender.requestSimulation(
        documentContext.documentId,
        scenarioName,
        undefined,  // durationDays
        undefined,  // repetitions
        undefined,  // parameters
        scenarioDefinitionId
    );
};
```

**Step 2: Update return type**

Ensure the return type of the hook reflects the new signature. Check where `onSimulate` is typed in the hook's return object.

**Step 3: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/messaging/hooks/useModelPanel.ts
git commit -m "feat: pass scenarioDefinitionId through onSimulate"
```

### Task 6: Update `ModelPanel.handleSimulate` to forward `scenarioDefinitionId`

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx:91-96`

**Step 1: Update handleSimulate**

```typescript
const handleSimulate = (scenarioName?: string, scenarioDefinitionId?: string) => {
    setPendingSubmission(scenarioName || 'New Simulation');
    onSimulate(scenarioName, scenarioDefinitionId);
    setActiveTab("scenarios");
};
```

**Step 2: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx
git commit -m "feat: forward scenarioDefinitionId in ModelPanel.handleSimulate"
```

---

## Phase 4: Remove PanelHeader "Run Simulation" Button

### Task 7: Remove run button from PanelHeader

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/PanelHeader.tsx`

**Step 1: Remove the Run Simulation button and related state**

Remove from PanelHeader:
- The `onSimulate` prop (from Props interface, lines 19-35)
- The `handleSimulateClick` function (lines 108-132)
- The `isSimulating` state (and its timeout logic)
- The green "Run Simulation" button JSX (lines 251-286)
- The `MAX_SIMULATION_RUNS` constant and `atRunLimit` logic
- Any imports only used by the run button (e.g., `Play` icon if not used elsewhere)

Keep everything else: model header, element header, menu, statistics.

**Step 2: Update ModelPanel to not pass onSimulate to PanelHeader**

In `ModelPanel.tsx`, remove the `onSimulate={handleSimulate}` prop from the `<PanelHeader>` component.

**Note:** `handleSimulate` should NOT be removed from ModelPanel yet — it will be used by the new `ScenariosAndRunsPanel` component in Phase 5.

**Step 3: Verify the React app compiles**

Run from `quodsim-react/`: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/PanelHeader.tsx
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx
git commit -m "feat: remove Run Simulation button from PanelHeader"
```

---

## Phase 5: Build the Unified Scenario Manager UI

### Task 8: Create `ScenarioCard` component

**Files:**
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ScenarioCard.tsx`

**Context:** This replaces `ScenarioDefinitionCard` and `SimulationRunCard`. Each card shows: scenario name, change request count, run status badge, play button, and select/delete actions.

**Step 1: Create the component**

```tsx
import React from "react";
import { ISerializedScenario, RunState } from "@quodsi/shared";
import { Play, Trash2, Loader2 } from "lucide-react";

interface ScenarioRunStatus {
  scenarioId: string;
  status: RunState;
  hasResults: boolean;
}

interface ScenarioCardProps {
  scenario: ISerializedScenario;
  runStatus?: ScenarioRunStatus;
  isSelected: boolean;
  onSelect: () => void;
  onPlay: () => void;
  onDelete?: () => void; // undefined for Baseline (non-deletable)
}

const statusDisplay: Record<string, { label: string; color: string }> = {
  [RunState.NotRun]: { label: "No run", color: "text-gray-400" },
  [RunState.Queued]: { label: "Queued", color: "text-yellow-600" },
  [RunState.Running]: { label: "Running", color: "text-blue-600" },
  [RunState.RanSuccessfully]: { label: "Ready", color: "text-green-600" },
  [RunState.RanWithErrors]: { label: "Error", color: "text-red-600" },
};

export const ScenarioCard: React.FC<ScenarioCardProps> = ({
  scenario,
  runStatus,
  isSelected,
  onSelect,
  onPlay,
  onDelete,
}) => {
  const status = runStatus?.status ?? RunState.NotRun;
  const display = statusDisplay[status] ?? statusDisplay[RunState.NotRun];
  const isActive = status === RunState.Queued || status === RunState.Running;
  const changeCount = scenario.changeRequests?.length ?? 0;

  return (
    <div
      onClick={onSelect}
      className={`flex items-center gap-2 px-3 py-2 cursor-pointer border-b transition-colors ${
        isSelected
          ? "bg-blue-50 border-l-2 border-l-blue-500"
          : "hover:bg-gray-50 border-l-2 border-l-transparent"
      }`}
    >
      {/* Play button */}
      <button
        onClick={(e) => { e.stopPropagation(); onPlay(); }}
        disabled={isActive}
        className={`flex-shrink-0 p-1 rounded transition-colors ${
          isActive
            ? "text-gray-300 cursor-not-allowed"
            : "text-green-600 hover:bg-green-50"
        }`}
        title={isActive ? "Simulation in progress" : "Run simulation"}
      >
        {isActive ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Play className="w-4 h-4" />
        )}
      </button>

      {/* Scenario info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-gray-800 truncate">
            {scenario.name}
          </span>
          {scenario.isBaseline && (
            <span className="text-[10px] px-1 py-0.5 bg-gray-100 text-gray-500 rounded">
              default
            </span>
          )}
        </div>
        {!scenario.isBaseline && changeCount > 0 && (
          <span className="text-[10px] text-gray-400">
            {changeCount} change{changeCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Status badge */}
      <span className={`text-[10px] font-medium ${display.color}`}>
        {display.label}
      </span>

      {/* Delete button (not for Baseline) */}
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="flex-shrink-0 p-1 text-gray-300 hover:text-red-500 transition-colors"
          title="Delete scenario"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};
```

**Note:** Check the exact `RunState` enum values in `@quodsi/shared` and adjust the `statusDisplay` keys accordingly. The enum may use string values like `"NotRun"`, `"Queued"`, etc., or it may be a different shape. Verify by reading `shared/src/types/` or the built output.

**Step 2: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ScenarioCard.tsx
git commit -m "feat: create ScenarioCard component for unified scenario manager"
```

### Task 9: Create `ScenarioDetailPanel` component

**Files:**
- Create: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ScenarioDetailPanel.tsx`

**Context:** Bottom section of the unified view. Shows the change request editor for the selected scenario + a compact run status summary. For Baseline, the change request section is hidden (or shows "No scenario changes").

**Step 1: Create the component**

```tsx
import React from "react";
import { ISerializedScenario, EditorReferenceData, RunState } from "@quodsi/shared";
import { ChangeRequestEditor } from "./ChangeRequestEditor";

interface ScenarioRunStatus {
  scenarioId: string;
  status: RunState;
  hasResults: boolean;
}

interface ScenarioDetailPanelProps {
  scenario: ISerializedScenario;
  referenceData?: EditorReferenceData;
  runStatus?: ScenarioRunStatus;
  onUpdate: (updated: ISerializedScenario) => void;
  onAnalyze?: (scenarioId: string) => void;
}

export const ScenarioDetailPanel: React.FC<ScenarioDetailPanelProps> = ({
  scenario,
  referenceData,
  runStatus,
  onUpdate,
  onAnalyze,
}) => {
  const status = runStatus?.status ?? RunState.NotRun;
  const hasResults = runStatus?.hasResults ?? false;

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...scenario, name: e.target.value });
  };

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onUpdate({ ...scenario, description: e.target.value });
  };

  const handleDeleteChangeRequest = (crId: string) => {
    onUpdate({
      ...scenario,
      changeRequests: scenario.changeRequests.filter((cr) => cr.id !== crId),
    });
  };

  const handleAddChangeRequest = (cr: any) => {
    onUpdate({
      ...scenario,
      changeRequests: [...scenario.changeRequests, cr],
    });
  };

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3 border-t bg-white">
      {/* Scenario Name (not editable for Baseline) */}
      {!scenario.isBaseline ? (
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Name
          </label>
          <input
            type="text"
            value={scenario.name}
            onChange={handleNameChange}
            className="w-full px-2 py-1 text-xs border rounded mt-0.5"
          />
        </div>
      ) : (
        <div className="text-xs text-gray-500 italic">
          Baseline scenario — no parameter changes applied
        </div>
      )}

      {/* Description */}
      {!scenario.isBaseline && (
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Description
          </label>
          <textarea
            value={scenario.description || ""}
            onChange={handleDescriptionChange}
            rows={2}
            className="w-full px-2 py-1 text-xs border rounded mt-0.5 resize-none"
            placeholder="Optional description"
          />
        </div>
      )}

      {/* Change Requests (not for Baseline) */}
      {!scenario.isBaseline && (
        <div>
          <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
            Change Requests
          </label>
          {/* Reuse existing ChangeRequestEditor component */}
          {/* Pass scenario.changeRequests, referenceData, and handlers */}
          {/* The exact props depend on ChangeRequestEditor's interface — check its file */}
          <ChangeRequestEditor
            changeRequests={scenario.changeRequests}
            referenceData={referenceData}
            onAdd={handleAddChangeRequest}
            onDelete={handleDeleteChangeRequest}
          />
        </div>
      )}

      {/* Run Status Summary */}
      <div className="pt-2 border-t">
        <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">
          Run Status
        </label>
        <div className="mt-1 flex items-center gap-2">
          <RunStatusBadge status={status} />
          {hasResults && onAnalyze && runStatus?.scenarioId && (
            <button
              onClick={() => onAnalyze(runStatus.scenarioId)}
              className="text-[10px] text-blue-600 hover:underline"
            >
              View Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

/** Compact status badge */
const RunStatusBadge: React.FC<{ status: RunState }> = ({ status }) => {
  const config: Record<string, { label: string; bg: string; text: string }> = {
    [RunState.NotRun]: { label: "Not run", bg: "bg-gray-100", text: "text-gray-500" },
    [RunState.Queued]: { label: "Queued", bg: "bg-yellow-100", text: "text-yellow-700" },
    [RunState.Running]: { label: "Running", bg: "bg-blue-100", text: "text-blue-700" },
    [RunState.RanSuccessfully]: { label: "Completed", bg: "bg-green-100", text: "text-green-700" },
    [RunState.RanWithErrors]: { label: "Error", bg: "bg-red-100", text: "text-red-700" },
  };
  const c = config[status] ?? config[RunState.NotRun];
  return (
    <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
};
```

**Important:** The `ChangeRequestEditor` import and props will need to be verified against the actual component. Read `ChangeRequestEditor.tsx` to confirm its interface before implementing.

**Step 2: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ScenarioDetailPanel.tsx
git commit -m "feat: create ScenarioDetailPanel component"
```

### Task 10: Create the unified `ScenariosAndRunsPanel` (replace existing)

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx:108-155`

**Context:** The existing `ScenariosAndRunsPanel` inline component at lines 113-155 in ModelEditor.tsx renders two sub-tabs (Scenarios | Runs). We replace this with the unified view that combines `ScenarioCard` list + `ScenarioDetailPanel` + smart polling.

This is the largest task. The new component needs to:
1. Render scenario cards from `referenceData.scenarios`
2. Track selected scenario
3. Match Azure run statuses to scenarios via `scenarioDefinitionId`
4. Include smart polling logic (migrated from `SimulationRunEditor.tsx`)
5. Handle play button clicks (with confirm dialog for re-runs)
6. Pass scenario edits up via `onScenariosChange`

**Step 1: Rewrite the ScenariosAndRunsPanel**

Replace the inline `ScenariosAndRunsPanel` component (lines 113-155) with a full implementation. The component should:

- Accept props: `documentId`, `referenceData`, `onScenariosChange`, `onSimulate` (the `handleSimulate` from ModelPanel)
- Manage state: `selectedScenarioId`, `autoRefreshMode`, `runStatuses` (in-memory map from scenarioDefinitionId to run status)
- Render: `ScenarioCard` list at top, `ScenarioDetailPanel` at bottom, auto-refresh control
- Migrate polling logic from `SimulationRunEditor.tsx`: the `loadSimulationRuns` function, interval setup, smart/on/off modes, message listener for `SIMULATION_RUNS_LIST_RESULT` and `MODEL_RUN_STATUS`
- On play: call `onSimulate(scenario.name, scenario.id)` which flows through `ModelPanel.handleSimulate` → `useModelPanel.onSimulate` → `simulationSender.requestSimulation`

**Key integration details:**
- The polling message listener should use `useMessaging()` hook and listen for envelope messages
- Run statuses come back as `SimulationRunInfo` objects with `scenarioDefinitionId` field
- Match run to scenario: `runInfo.scenarioDefinitionId === scenario.id`
- For re-run confirmation: use `window.confirm()` or a simple inline dialog
- Auto-refresh dropdown: reuse the same Off/Smart/On pattern from `SimulationRunEditor`

**Step 2: Update `ScenariosAndRunsPanel` props in ModelEditor**

The `ScenariosAndRunsPanel` usage at line 666 in ModelEditor.tsx needs to also receive `onSimulate`. This requires threading `onSimulate` from `ModelPanel` → `ModelEditor` → `ScenariosAndRunsPanel`.

Add `onSimulate` to ModelEditor's Props interface and pass it through.

**Step 3: Pass `onSimulate` from ModelPanel to ModelEditor**

In `ModelPanel.tsx`, add `onSimulate={handleSimulate}` to the `<ElementEditor>` or `<ModelEditor>` props (check the prop chain).

**Step 4: Verify compilation**

Run: `npx tsc --noEmit` from quodsim-react/
Expected: No type errors

**Step 5: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/ModelPanel.tsx
git commit -m "feat: unified ScenariosAndRunsPanel with play buttons and smart polling"
```

---

## Phase 6: Wire Up Analysis Navigation

### Task 11: Connect "Analyze" from ScenarioDetailPanel to Analysis Dashboard

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx`

**Context:** The current `SimulationRunsPanel` has sub-tabs for "List" and "Analysis". With the unified view, analysis needs to be accessible from the `ScenarioDetailPanel`'s "View Results" link.

**Step 1: Determine analysis navigation approach**

Two options:
1. Keep a "sub-view" toggle within the unified panel (default view vs. analysis view)
2. Use the existing `SimulationRunAnalysisDashboard` as a separate overlay or sub-tab

**Recommendation:** Add a simple state toggle in `ScenariosAndRunsPanel`:
- Default: show scenario cards + detail panel
- When "View Results" is clicked: show `SimulationRunAnalysisDashboard` with a "Back to Scenarios" link

```typescript
const [analysisScenarioId, setAnalysisScenarioId] = useState<string | null>(null);

// In render:
{analysisScenarioId ? (
  <div>
    <button onClick={() => setAnalysisScenarioId(null)}>
      ← Back to Scenarios
    </button>
    <SimulationRunAnalysisDashboard
      documentId={documentId}
      selectedRunId={analysisScenarioId}
    />
  </div>
) : (
  // ... normal scenario cards + detail panel
)}
```

**Step 2: Verify `SimulationRunAnalysisDashboard` props**

Read `SimulationRunAnalysisDashboard.tsx` to confirm what props it expects (likely `documentId` and a run/scenario ID).

**Step 3: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx
git commit -m "feat: wire analysis navigation from scenario detail panel"
```

---

## Phase 7: Cleanup

### Task 12: Remove or deprecate old components

**Files:**
- Consider removing: `SimulationRunsPanel.tsx`, `SimulationRunEditor.tsx`, `SimulationRunCard.tsx`
- Consider removing: `ScenarioDefinitionEditor.tsx` (if fully replaced by ScenarioDetailPanel)
- Keep: `ScenarioDefinitionCard.tsx` only if still referenced; otherwise remove
- Keep: `ChangeRequestEditor.tsx` (reused by ScenarioDetailPanel)

**Step 1: Check for remaining imports**

Search for imports of the old components across the codebase. Only remove files that are no longer imported anywhere.

```bash
# Check each file for remaining references
grep -r "SimulationRunsPanel" --include="*.tsx" --include="*.ts" quodsim-react/src/
grep -r "SimulationRunEditor" --include="*.tsx" --include="*.ts" quodsim-react/src/
grep -r "SimulationRunCard" --include="*.tsx" --include="*.ts" quodsim-react/src/
grep -r "ScenarioDefinitionEditor" --include="*.tsx" --include="*.ts" quodsim-react/src/
grep -r "ScenarioDefinitionCard" --include="*.tsx" --include="*.ts" quodsim-react/src/
```

**Step 2: Remove unused files**

Delete files that have zero remaining imports.

**Step 3: Update tab label**

In ModelEditor.tsx `TAB_CONFIG` (line 88), the "scenarios" tab is currently labeled `"Simulation Runs"`. Update to `"Scenarios"` or `"Scenario Manager"`.

**Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove old SimulationRunEditor and ScenarioDefinitionEditor components"
```

### Task 13: Version bump

**Files:**
- Modify: `shared/src/constants/version.ts`

**Step 1: Bump version**

Update `QUODSI_VERSION` and `QUODSIM_VERSION` to reflect the new build date.

**Step 2: Build shared**

Run: `npm run build -w @quodsi/shared`

**Step 3: Commit**

```bash
git add shared/src/constants/version.ts
git commit -m "chore: bump version for unified scenario manager"
```

---

## Phase 8: Manual Testing Checklist

After all tasks are complete, manually verify:

1. **Baseline migration**: Open an existing model that has no Baseline in q_scenarios. Verify Baseline appears as the first scenario card.
2. **New model**: Create a new model. Verify Baseline is auto-created.
3. **Play Baseline**: Click play on Baseline. Verify simulation submits with no change requests. Verify status updates from Queued → Running → Completed.
4. **Play scenario**: Create a scenario with change requests. Click play. Verify change requests are embedded in model.json.
5. **Re-run confirmation**: Click play on a scenario with completed results. Verify confirmation dialog appears.
6. **Smart polling**: Submit a run. Verify polling activates. After completion, verify polling stops.
7. **Scenario editing**: Select a scenario, edit name/description/change requests in detail panel. Verify changes persist.
8. **Analysis**: Click "View Results" on a completed scenario. Verify Analysis dashboard loads.
9. **PanelHeader**: Verify the old "Run Simulation" button is gone from the header.
10. **Baseline protection**: Verify Baseline cannot be deleted or renamed.
