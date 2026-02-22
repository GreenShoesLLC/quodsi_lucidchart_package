# Scenario Change Requests Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add scenario change request management to the Quodsi frontend, enabling users to create named "what-if" scenario variants and run simulations with declarative model modifications.

**Architecture:** Scenarios (named sets of change requests) are stored in LucidChart page shapeData via a dedicated `q_scenarios` key, following the same pattern as States and ResourceRequirements. The existing "Scenario" concept (simulation run records) is renamed to "SimulationRun" to resolve naming collision. New TypeScript types mirror the Python `scenario_changes` module.

**Tech Stack:** TypeScript, React 18, Tailwind CSS, LucidChart SDK, Azure Functions v4

**Design doc:** `docs/plans/2026-02-22-scenario-change-requests-design.md`

**Branch:** `feature/scenario-change-requests` (both repos)

---

## Phase 1: Rename Scenario → SimulationRun

This phase is a mechanical rename with zero behavior change. The goal is to free up the "Scenario" name for the new concept. Every file, type, variable, message type, hook, and selector that refers to a simulation run record must be renamed.

**Validation after this phase:** `npm run build -w @quodsi/shared`, React app compiles, data connector compiles, extension bundles. The running app behaves identically to before.

### Task 1.1: Rename shared library type and exports

**Files:**
- Rename: `shared/src/types/elements/Scenario.ts` → `shared/src/types/elements/SimulationRun.ts`
- Modify: `shared/src/types/elements/SimulationRun.ts` (rename interface)
- Modify: `shared/src/types/elements/index.ts` (update export)
- Modify: `shared/src/index.ts` (update export)
- Modify: `shared/src/types/PageStatus.ts` (rename field + import)

**Step 1: Rename the file and interface**

Rename `Scenario.ts` → `SimulationRun.ts`. Update the interface:

```typescript
// SimulationRun.ts
import { SimulationObjectType } from "./SimulationObjectType";
import { SimulationObject } from "./SimulationObject";
import { RunState } from "./RunState";

export interface SimulationRun extends SimulationObject {
    reps: number;
    forecastDays: number;
    runState: RunState;
    type: SimulationObjectType.Scenario;  // Keep enum value — it's the wire format
    currentReplication?: number;
    error?: string;
    errorType?: string;
    errorDetails?: string;
    errorSuggestions?: string[];
    startTime?: string;
    endTime?: string;
    metrics?: Record<string, any>;
}
```

Note: `SimulationObjectType.Scenario` enum value stays unchanged — it's the serialized wire format used in blob storage. Only the TypeScript interface name changes.

**Step 2: Update barrel exports**

In `shared/src/types/elements/index.ts`, change:
```
export * from './Scenario'  →  export * from './SimulationRun'
```

In `shared/src/index.ts`, change:
```
export * from './types/elements/Scenario'  →  export * from './types/elements/SimulationRun'
```

**Step 3: Update PageStatus.ts**

```typescript
import { SimulationRun } from "./elements/SimulationRun";

export interface PageStatus {
    hasContainer: boolean;
    simulationRuns: SimulationRun[];
    statusDateTime: string;
}
```

**Step 4: Build shared library to find any remaining references**

Run: `cd quodsi_lucidchart_package && npm run build -w @quodsi/shared`
Expected: Build succeeds (or reveals imports to fix in next tasks)

**Step 5: Commit**

```bash
git add -A && git commit -m "rename: Scenario interface → SimulationRun in shared library"
```

---

### Task 1.2: Rename EnvelopeMessageType values and message interfaces

**Files:**
- Modify: `shared/src/quodsi-messaging/envelope/envelopeMessageTypes.ts`
- Modify: `shared/src/quodsi-messaging/scenario/messages.ts` (rename file later, update types first)
- Modify: `shared/src/quodsi-messaging/index.ts`

**Step 1: Rename enum values in envelopeMessageTypes.ts**

Change these enum values (lines ~73-80):
```
SCENARIOS_LIST_REQUEST       → SIMULATION_RUNS_LIST_REQUEST
SCENARIOS_LIST_RESULT        → SIMULATION_RUNS_LIST_RESULT
SCENARIO_DELETE              → SIMULATION_RUN_DELETE
SCENARIO_DELETE_RESULT       → SIMULATION_RUN_DELETE_RESULT
SCENARIO_RESIMULATE_REQUEST  → SIMULATION_RUN_RESIMULATE_REQUEST
```

Keep `CROSS_REP_DATA_REQUEST` and `CROSS_REP_DATA_RESULT` unchanged (they reference scenarioId as a parameter but aren't "Scenario" concepts).

**Step 2: Rename message interfaces in messages.ts**

Rename all interfaces and type references:
```
ScenarioListRequestMessage    → SimulationRunListRequestMessage
ScenarioInfo                  → SimulationRunInfo
ScenarioDownloadInfo          → SimulationRunDownloadInfo
ScenarioListResultMessage     → SimulationRunListResultMessage
ScenarioDeleteMessage         → SimulationRunDeleteMessage
ScenarioDeleteResultMessage   → SimulationRunDeleteResultMessage
ScenarioResimulateRequestMessage → SimulationRunResimulateRequestMessage
ScenarioMessage               → SimulationRunMessage
```

Update all `type:` fields to use the renamed enum values.

**Step 3: Rename the file**

Rename: `shared/src/quodsi-messaging/scenario/messages.ts` → `shared/src/quodsi-messaging/scenario/simulationRunMessages.ts`

Consider also renaming the `scenario/` directory to `simulationRun/` for consistency.

**Step 4: Update quodsi-messaging/index.ts**

Update all imports and re-exports to use new names. Update the message type mappings and union types.

**Step 5: Build shared library**

Run: `cd quodsi_lucidchart_package && npm run build -w @quodsi/shared`

**Step 6: Commit**

```bash
git add -A && git commit -m "rename: Scenario message types → SimulationRun in shared messaging"
```

---

### Task 1.3: Rename MAX_SCENARIOS constant

**Files:**
- Modify: `shared/src/constants/limits.ts`
- Modify: `dataconnectors/quodsi_data_connector_lucidchart_v2/src/config.ts`

**Step 1: Rename in shared**

```typescript
export const MAX_SIMULATION_RUNS = 5;
```

**Step 2: Rename in data connector config**

```typescript
export const MAX_SIMULATION_RUNS = 5;
```

**Step 3: Build shared**

Run: `cd quodsi_lucidchart_package && npm run build -w @quodsi/shared`

**Step 4: Commit**

```bash
git add -A && git commit -m "rename: MAX_SCENARIOS → MAX_SIMULATION_RUNS"
```

---

### Task 1.4: Rename React state management (slice + context)

**Files:**
- Rename: `quodsim-react/src/messaging/state/scenarioSlice.ts` → `simulationRunSlice.ts`
- Modify: all type names, action types, selectors inside the renamed file
- Rename: hook in `quodsim-react/src/messaging/MessageContext.ts`
- Modify: `quodsim-react/src/messaging/MessageProvider.tsx`

**Step 1: Rename scenarioSlice.ts → simulationRunSlice.ts**

Rename all internals:
```
Scenario (type alias)         → SimulationRun
ScenarioState                 → SimulationRunState
scenarioReducer               → simulationRunReducer
SCENARIOS_LOADING             → SIMULATION_RUNS_LOADING
SCENARIOS_SUCCESS             → SIMULATION_RUNS_SUCCESS
SCENARIOS_ERROR               → SIMULATION_RUNS_ERROR
SCENARIO_UPDATE_STATUS        → SIMULATION_RUN_UPDATE_STATUS
selectScenarios               → selectSimulationRuns
selectScenariosLoading        → selectSimulationRunsLoading
selectScenariosError          → selectSimulationRunsError
selectHasActiveJobs           → selectHasActiveJobs (keep — generic name)
```

Import `SimulationRunInfo` instead of `ScenarioInfo` from shared.

**Step 2: Rename hook in MessageContext.ts**

```typescript
export function useSimulationRuns() {
    const { simulationRuns } = useMessaging();
    return simulationRuns;
}
```

This requires also updating the messaging context shape — the `scenarios` key in the context state becomes `simulationRuns`.

**Step 3: Update MessageProvider.tsx**

Update the context provider to use `simulationRuns` key and `simulationRunReducer`. Update the export of the hook.

**Step 4: Commit**

```bash
git add -A && git commit -m "rename: scenario slice/hooks → simulationRun in React state"
```

---

### Task 1.5: Rename React sender hook

**Files:**
- Rename: `quodsim-react/src/messaging/senders/scenarioSender.ts` → `simulationRunSender.ts`
- Modify: all function and variable names inside

**Step 1: Rename file and internals**

```
useScenarioSender()      → useSimulationRunSender()
listScenarios()          → listSimulationRuns()
deleteScenario()         → deleteSimulationRun()
resimulateScenario()     → resimulateSimulationRun()
getCrossRepData()        → getCrossRepData() (keep)
```

Update all `EnvelopeMessageType` references to the renamed values.

**Step 2: Commit**

```bash
git add -A && git commit -m "rename: scenarioSender → simulationRunSender"
```

---

### Task 1.6: Rename React UI components

**Files:**
- Rename: `ScenarioEditor.tsx` → `SimulationRunEditor.tsx`
- Rename: `ScenarioCard.tsx` → `SimulationRunCard.tsx`
- Rename: `ScenarioAnalysisDashboard.tsx` → `SimulationRunAnalysisDashboard.tsx`
- Rename: `ScenariosPanel.tsx` → `SimulationRunsPanel.tsx`
- Modify: all internal names, imports, and references

**Step 1: Rename ScenarioEditor.tsx → SimulationRunEditor.tsx**

Rename component, props interface, and all internal variable names:
```
ScenarioEditor          → SimulationRunEditor
ScenarioEditorProps     → SimulationRunEditorProps
Scenario (local interface) → SimulationRun (local interface, or import from shared)
scenarios (variable)    → simulationRuns
scenario (variable)     → simulationRun
```

Update all hook calls: `useSimulationRunSender()`, `useSimulationRuns()`, `selectSimulationRuns()`, etc.

Update all `EnvelopeMessageType` references to renamed values.

Update all Redux dispatch action type strings.

**Step 2: Rename ScenarioCard.tsx → SimulationRunCard.tsx**

Same pattern: rename component, props, local types, and imports.

**Step 3: Rename ScenarioAnalysisDashboard.tsx → SimulationRunAnalysisDashboard.tsx**

Same pattern.

**Step 4: Rename ScenariosPanel.tsx → SimulationRunsPanel.tsx**

Update component name, imports, sub-tab types.

**Step 5: Update PanelHeader.tsx**

Update imports and references:
```
useScenarios → useSimulationRuns
selectScenarios → selectSimulationRuns
MAX_SCENARIOS → MAX_SIMULATION_RUNS
scenarios variable → simulationRuns
atScenarioLimit → atRunLimit
```

**Step 6: Update any remaining React imports**

Search for any remaining references to old names across all `.tsx` and `.ts` files in `quodsim-react/src/`.

**Step 7: Verify React compiles**

Run: `cd quodsim-react && npm run build` (or `npm start` and check for errors)

**Step 8: Commit**

```bash
git add -A && git commit -m "rename: Scenario UI components → SimulationRun"
```

---

### Task 1.7: Rename extension handler

**Files:**
- Rename: `src/core/messaging/handlers/scenarioHandler.ts` → `simulationRunHandler.ts`
- Modify: class name, method names, message type references
- Modify: wherever `ScenarioHandler` is registered in the message routing

**Step 1: Rename file and class**

```
ScenarioHandler              → SimulationRunHandler
handleScenariosListRequest   → handleSimulationRunsListRequest
handleScenarioDelete         → handleSimulationRunDelete
handleResimulateRequest      → handleResimulateRequest (keep)
```

Update all `EnvelopeMessageType` references.

**Step 2: Update handler registration**

Search for where `ScenarioHandler` is imported and registered (likely in a central handler registry or MessageRouter configuration). Update to `SimulationRunHandler`.

**Step 3: Commit**

```bash
git add -A && git commit -m "rename: ScenarioHandler → SimulationRunHandler in extension"
```

---

### Task 1.8: Rename data connector action files

**Files:**
- Rename: `src/actions/listScenariosAction.ts` → `listSimulationRunsAction.ts`
- Rename: `src/actions/deleteScenarioAction.ts` → `deleteSimulationRunAction.ts`
- Rename: `src/actions/checkScenarioTaskStatusAction.ts` → `checkSimulationRunTaskStatusAction.ts`
- Rename: `src/actions/getScenarioCrossRepDataAction.ts` → `getSimulationRunCrossRepDataAction.ts`
- Modify: `src/types/scenarios.ts` → rename types
- Modify: wherever these actions are imported (likely `src/actions/index.ts` or route handlers)

**Step 1: Rename type definitions**

In `src/types/scenarios.ts`, rename:
```
ScenarioDownloadInfo → SimulationRunDownloadInfo
ScenarioInfo         → SimulationRunInfo
```

**Step 2: Rename action files and their exports**

Rename each file and update internal function names, variable names, and imports.

**Step 3: Update action imports in route handlers**

Search for all imports of the old action names and update.

**Step 4: Build data connector**

Run: `cd dataconnectors/quodsi_data_connector_lucidchart_v2 && npm run build`

**Step 5: Commit**

```bash
git add -A && git commit -m "rename: Scenario actions → SimulationRun in data connector"
```

---

### Task 1.9: Full build verification

**Step 1: Build shared**
Run: `cd quodsi_lucidchart_package && npm run build -w @quodsi/shared`

**Step 2: Build React**
Run: `cd quodsim-react && npm run build`

**Step 3: Build data connector**
Run: `cd dataconnectors/quodsi_data_connector_lucidchart_v2 && npm run build`

**Step 4: Run shared tests**
Run: `cd shared && npm test`

**Step 5: Fix any remaining references**

Search across the entire codebase for any remaining "Scenario" references that should have been renamed (excluding `SimulationObjectType.Scenario` which stays):

```bash
grep -r "Scenario" --include="*.ts" --include="*.tsx" | grep -v "SimulationRun" | grep -v "SimulationObjectType" | grep -v "node_modules" | grep -v "ScenarioObjectType" | grep -v "ScenarioChangeRequest" | grep -v "ScenarioPropertyName" | grep -v "ScenarioSetterType"
```

**Step 6: Commit if fixes needed**

```bash
git add -A && git commit -m "fix: remaining Scenario → SimulationRun references"
```

---

## Phase 2: New TypeScript Types (Sync Guide Layers 1-2)

Create the new Scenario types that mirror the Python `scenario_changes` module.

### Task 2.1: Create ScenarioObjectType enum

**Files:**
- Create: `shared/src/types/elements/ScenarioObjectType.ts`
- Modify: `shared/src/types/elements/index.ts` (add export)
- Modify: `shared/src/index.ts` (add export)

**Step 1: Create the enum**

```typescript
// ScenarioObjectType.ts
export enum ScenarioObjectType {
    ENTITY = "ENTITY",
    ACTIVITY = "ACTIVITY",
    RESOURCE = "RESOURCE",
    GENERATOR = "GENERATOR",
    CONNECTOR = "CONNECTOR",
    MODEL = "MODEL"
}
```

**Step 2: Add barrel exports**

Add to both `index.ts` files:
```typescript
export * from './ScenarioObjectType';
```

**Step 3: Build and commit**

```bash
cd quodsi_lucidchart_package && npm run build -w @quodsi/shared
git add -A && git commit -m "feat: add ScenarioObjectType enum"
```

---

### Task 2.2: Create ScenarioPropertyName enum

**Files:**
- Create: `shared/src/types/elements/ScenarioPropertyName.ts`
- Modify: barrel exports

**Step 1: Create the enum**

```typescript
// ScenarioPropertyName.ts
export enum ScenarioPropertyName {
    // Resource properties
    CAPACITY = "CAPACITY",

    // Activity properties
    DURATION = "DURATION",
    ACTIVITY_CAPACITY = "ACTIVITY_CAPACITY",
    INBOUND_QUEUE_CAPACITY = "INBOUND_QUEUE_CAPACITY",
    OUTBOUND_QUEUE_CAPACITY = "OUTBOUND_QUEUE_CAPACITY",

    // Connector properties
    WEIGHT = "WEIGHT",

    // Generator properties
    INTERVAL = "INTERVAL",
    MAX_ENTITIES = "MAX_ENTITIES",
    ENTITIES_PER_CREATION = "ENTITIES_PER_CREATION",

    // Universal properties
    INCLUDE = "INCLUDE",
    NAME = "NAME",

    // Model-level properties
    REPS = "REPS",
    SEED = "SEED",
    RUN_PERIOD = "RUN_PERIOD"
}
```

**Step 2: Add barrel exports, build, commit**

```bash
git add -A && git commit -m "feat: add ScenarioPropertyName enum"
```

---

### Task 2.3: Create ScenarioSetterType enum

**Files:**
- Create: `shared/src/types/elements/ScenarioSetterType.ts`
- Modify: barrel exports

**Step 1: Create the enum**

```typescript
// ScenarioSetterType.ts
export enum ScenarioSetterType {
    EQUAL = "EQUAL",
    ADD = "ADD",
    SUBTRACT = "SUBTRACT",
    MULTIPLY = "MULTIPLY",
    DIVIDE = "DIVIDE",
    MINIMUM = "MINIMUM",
    MAXIMUM = "MAXIMUM"
}
```

**Step 2: Add barrel exports, build, commit**

```bash
git add -A && git commit -m "feat: add ScenarioSetterType enum"
```

---

### Task 2.4: Create modification classes

**Files:**
- Create: `shared/src/types/elements/NumericPropertyModification.ts`
- Create: `shared/src/types/elements/BooleanPropertyModification.ts`
- Modify: barrel exports

**Step 1: Create NumericPropertyModification**

```typescript
// NumericPropertyModification.ts
import { ScenarioPropertyName } from "./ScenarioPropertyName";
import { ScenarioSetterType } from "./ScenarioSetterType";

export class NumericPropertyModification {
    propertyName: ScenarioPropertyName;
    setterType: ScenarioSetterType;
    newValue: number;

    constructor(options: {
        propertyName: ScenarioPropertyName;
        setterType?: ScenarioSetterType;
        newValue?: number;
    }) {
        this.propertyName = options.propertyName;
        this.setterType = options.setterType ?? ScenarioSetterType.EQUAL;
        this.newValue = options.newValue ?? 0;
    }

    apply(currentValue: number): number {
        switch (this.setterType) {
            case ScenarioSetterType.EQUAL: return this.newValue;
            case ScenarioSetterType.ADD: return currentValue + this.newValue;
            case ScenarioSetterType.SUBTRACT: return currentValue - this.newValue;
            case ScenarioSetterType.MULTIPLY: return currentValue * this.newValue;
            case ScenarioSetterType.DIVIDE:
                if (this.newValue === 0) throw new Error("Division by zero");
                return currentValue / this.newValue;
            case ScenarioSetterType.MINIMUM: return Math.min(currentValue, this.newValue);
            case ScenarioSetterType.MAXIMUM: return Math.max(currentValue, this.newValue);
            default: return this.newValue;
        }
    }

    toJSON(): any {
        return {
            type: "numeric",
            propertyName: this.propertyName,
            setterType: this.setterType,
            newValue: this.newValue,
        };
    }

    static fromJSON(data: any): NumericPropertyModification {
        return new NumericPropertyModification({
            propertyName: data.propertyName as ScenarioPropertyName,
            setterType: data.setterType as ScenarioSetterType ?? ScenarioSetterType.EQUAL,
            newValue: data.newValue ?? 0,
        });
    }
}
```

**Step 2: Create BooleanPropertyModification**

```typescript
// BooleanPropertyModification.ts
import { ScenarioPropertyName } from "./ScenarioPropertyName";

export class BooleanPropertyModification {
    propertyName: ScenarioPropertyName;
    newValue: boolean;

    constructor(options: {
        propertyName: ScenarioPropertyName;
        newValue?: boolean;
    }) {
        this.propertyName = options.propertyName;
        this.newValue = options.newValue ?? true;
    }

    apply(_currentValue: boolean): boolean {
        return this.newValue;
    }

    toJSON(): any {
        return {
            type: "boolean",
            propertyName: this.propertyName,
            newValue: this.newValue,
        };
    }

    static fromJSON(data: any): BooleanPropertyModification {
        return new BooleanPropertyModification({
            propertyName: data.propertyName as ScenarioPropertyName,
            newValue: data.newValue ?? true,
        });
    }
}
```

**Step 3: Add barrel exports, build, commit**

```bash
git add -A && git commit -m "feat: add NumericPropertyModification and BooleanPropertyModification"
```

---

### Task 2.5: Create ScenarioChangeRequest class

**Files:**
- Create: `shared/src/types/elements/ScenarioChangeRequest.ts`
- Modify: barrel exports

**Step 1: Create the class**

```typescript
// ScenarioChangeRequest.ts
import { ScenarioObjectType } from "./ScenarioObjectType";
import { NumericPropertyModification } from "./NumericPropertyModification";
import { BooleanPropertyModification } from "./BooleanPropertyModification";
import { v4 as uuidv4 } from "uuid";

export type ModificationType = NumericPropertyModification | BooleanPropertyModification;

export interface ObjectMatchCriteria {
    name?: string;
    nameContains?: string;
    nameStartsWith?: string;
    nameEndsWith?: string;
}

export class ScenarioChangeRequest {
    id: string;
    objectType: ScenarioObjectType;
    objectMatchCriteria: ObjectMatchCriteria;
    modificationDetails: ModificationType;
    description?: string;

    constructor(options: {
        id?: string;
        objectType: ScenarioObjectType;
        objectMatchCriteria: ObjectMatchCriteria;
        modificationDetails: ModificationType;
        description?: string;
    }) {
        this.id = options.id ?? uuidv4();
        this.objectType = options.objectType;
        this.objectMatchCriteria = options.objectMatchCriteria;
        this.modificationDetails = options.modificationDetails;
        this.description = options.description;
    }

    toJSON(): any {
        return {
            id: this.id,
            objectType: this.objectType,
            objectMatchCriteria: this.objectMatchCriteria,
            modificationDetails: this.modificationDetails.toJSON(),
            description: this.description,
        };
    }

    static fromJSON(data: any): ScenarioChangeRequest {
        const modData = data.modificationDetails;
        const modification = modData.type === "boolean"
            ? BooleanPropertyModification.fromJSON(modData)
            : NumericPropertyModification.fromJSON(modData);

        return new ScenarioChangeRequest({
            id: data.id,
            objectType: data.objectType as ScenarioObjectType,
            objectMatchCriteria: data.objectMatchCriteria,
            modificationDetails: modification,
            description: data.description,
        });
    }
}
```

Note: Check if `uuid` is already a dependency. If not, the `id` can default to a simpler unique string or use the existing ID generation pattern in the codebase.

**Step 2: Add barrel exports, build, commit**

```bash
git add -A && git commit -m "feat: add ScenarioChangeRequest class"
```

---

### Task 2.6: Create Scenario class (new concept)

**Files:**
- Create: `shared/src/types/elements/Scenario.ts` (reuses the filename freed up by the rename)
- Create: `shared/src/types/elements/ScenarioListManager.ts`
- Modify: barrel exports

**Step 1: Create Scenario class**

```typescript
// Scenario.ts
import { ScenarioChangeRequest } from "./ScenarioChangeRequest";
import { v4 as uuidv4 } from "uuid";

export class Scenario {
    id: string;
    name: string;
    description: string;
    changeRequests: ScenarioChangeRequest[];

    constructor(options?: {
        id?: string;
        name?: string;
        description?: string;
        changeRequests?: ScenarioChangeRequest[];
    }) {
        this.id = options?.id ?? uuidv4();
        this.name = options?.name ?? "New Scenario";
        this.description = options?.description ?? "";
        this.changeRequests = options?.changeRequests ?? [];
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
        });
    }
}
```

**Step 2: Create ScenarioListManager**

Follow the pattern from `StateListManager.ts`:

```typescript
// ScenarioListManager.ts
import { Scenario } from "./Scenario";

export class ScenarioListManager {
    private scenarios: Map<string, Scenario> = new Map();

    add(scenario: Scenario): void {
        this.scenarios.set(scenario.id, scenario);
    }

    remove(scenarioId: string): boolean {
        return this.scenarios.delete(scenarioId);
    }

    get(scenarioId: string): Scenario | undefined {
        return this.scenarios.get(scenarioId);
    }

    getAll(): Scenario[] {
        return Array.from(this.scenarios.values());
    }

    size(): number {
        return this.scenarios.size;
    }

    clear(): void {
        this.scenarios.clear();
    }
}
```

**Step 3: Add barrel exports, build, commit**

```bash
git add -A && git commit -m "feat: add Scenario class and ScenarioListManager"
```

---

### Task 2.7: Create serialized interfaces

**Files:**
- Create: `shared/src/serialization/interfaces/ISerializedScenario.ts`
- Create: `shared/src/serialization/interfaces/ISerializedScenarioChangeRequest.ts`
- Modify: `shared/src/serialization/interfaces/index.ts` (add exports)

**Step 1: Create ISerializedScenarioChangeRequest**

```typescript
// ISerializedScenarioChangeRequest.ts
export interface ISerializedScenarioChangeRequest {
    id: string;
    objectType: string;
    objectMatchCriteria: {
        name?: string;
        nameContains?: string;
        nameStartsWith?: string;
        nameEndsWith?: string;
    };
    modificationDetails: {
        type: "numeric" | "boolean";
        propertyName: string;
        setterType?: string;
        newValue: number | boolean;
    };
    description?: string;
}
```

**Step 2: Create ISerializedScenario**

```typescript
// ISerializedScenario.ts
import { ISerializedScenarioChangeRequest } from "./ISerializedScenarioChangeRequest";

export interface ISerializedScenario {
    id: string;
    name: string;
    description?: string;
    changeRequests: ISerializedScenarioChangeRequest[];
}
```

**Step 3: Add to barrel exports, build, commit**

```bash
git add -A && git commit -m "feat: add serialized scenario interfaces"
```

---

### Task 2.8: Add Scenario to ModelDefinition

**Files:**
- Modify: `shared/src/types/elements/ModelDefinition.ts`

**Step 1: Add ScenarioListManager to ModelDefinition**

Add import and property:
```typescript
import { ScenarioListManager } from "./ScenarioListManager";

// In the class, add alongside other list managers:
public readonly scenarios: ScenarioListManager;

// In the constructor, initialize:
this.scenarios = new ScenarioListManager();
```

**Step 2: Build and commit**

```bash
git add -A && git commit -m "feat: add scenarios to ModelDefinition"
```

---

## Phase 3: Storage Layer

### Task 3.1: Add scenario storage to StorageAdapter

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/src/core/StorageAdapter.ts`

**Step 1: Add storage key and methods**

Add alongside existing keys:
```typescript
private static readonly SCENARIOS_KEY = 'q_scenarios';
```

Add methods following the `q_states` pattern:
```typescript
public setScenarios(page: ElementProxy, scenarios: ISerializedScenario[]): void {
    const serialized = JSON.stringify(scenarios);
    page.shapeData.set(StorageAdapter.SCENARIOS_KEY, serialized);
}

public getScenarios(page: ElementProxy): ISerializedScenario[] {
    const str = page.shapeData.get(StorageAdapter.SCENARIOS_KEY);
    if (!str || typeof str !== 'string') {
        return [];
    }
    return JSON.parse(str) as ISerializedScenario[];
}

public clearScenarios(page: ElementProxy): void {
    page.shapeData.delete(StorageAdapter.SCENARIOS_KEY);
}
```

Import `ISerializedScenario` from shared.

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add scenario storage methods to StorageAdapter"
```

---

### Task 3.2: Add scenario loading to ModelDefinitionPageBuilder

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/src/core/ModelDefinitionPageBuilder.ts`

**Step 1: Add loadScenarios method**

Following the `loadStates` pattern:
```typescript
private loadScenarios(page: PageProxy, modelDefinition: ModelDefinition): void {
    this.log('Loading scenarios from storage');

    const serializedScenarios = this.storageAdapter.getScenarios(page);
    this.log(`Found ${serializedScenarios.length} scenarios in storage`);

    for (const serializedScenario of serializedScenarios) {
        try {
            const scenario = Scenario.fromJSON(serializedScenario);
            modelDefinition.scenarios.add(scenario);
            this.log(`Added scenario: ${scenario.name}`);
        } catch (error) {
            this.log(`Error deserializing scenario: ${error}`, 'error');
        }
    }

    this.log(`Final scenarios count: ${modelDefinition.scenarios.size()}`);
}
```

**Step 2: Call loadScenarios from the build method**

Find where `loadStates` is called and add `loadScenarios` nearby.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: load scenarios in ModelDefinitionPageBuilder"
```

---

### Task 3.3: Add updateScenarios to ModelManager

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/src/core/ModelManager.ts`

**Step 1: Add updateScenarios method**

Following `updateStates` pattern (but simpler — no reference cleanup needed):
```typescript
public async updateScenarios(scenarios: ISerializedScenario[], page: PageProxy): Promise<void> {
    this.debug.log('updateScenarios - Start', {
        scenariosCount: scenarios.length,
        pageId: page.id,
    });

    try {
        this.storageAdapter.setScenarios(page, scenarios);
        this.markModelDirty();

        this.debug.log('updateScenarios - Complete');
    } catch (error) {
        this.debug.error('Error in updateScenarios:', error);
        throw error;
    }
}
```

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add updateScenarios to ModelManager"
```

---

## Phase 4: Messaging Layer

### Task 4.1: Add new message types for scenario definitions

**Files:**
- Modify: `shared/src/quodsi-messaging/envelope/envelopeMessageTypes.ts`

**Step 1: Add new enum values**

```typescript
// Scenario Definition Management (shapeData)
SCENARIOS_DEFINITION_UPDATE = "SCENARIOS_DEFINITION_UPDATE",
SCENARIOS_DEFINITION_RESULT = "SCENARIOS_DEFINITION_RESULT",
```

**Step 2: Build and commit**

```bash
git add -A && git commit -m "feat: add scenario definition message types"
```

---

### Task 4.2: Create scenario definition message handler

**Files:**
- Create: `editorextensions/quodsi_editor_extension/src/core/messaging/handlers/scenarioDefinitionHandler.ts`
- Modify: handler registry (wherever handlers are registered in the message routing)

**Step 1: Create the handler**

Follow the `statesHandler.ts` pattern:
```typescript
import { EnvelopeMessageType, ISerializedScenario } from "@quodsi/shared";
import { ModelManager } from "../../ModelManager";
import { Viewport } from "../../Viewport";
import { SelectionHandler } from "../SelectionHandler";

export class ScenarioDefinitionHandler {
    public static canHandle(messageType: string): boolean {
        return messageType === EnvelopeMessageType.SCENARIOS_DEFINITION_UPDATE;
    }

    public static async handleMessage(msg: any): Promise<boolean> {
        switch (msg.type) {
            case EnvelopeMessageType.SCENARIOS_DEFINITION_UPDATE:
                await ScenarioDefinitionHandler.handleScenariosUpdate(msg);
                return true;
            default:
                return false;
        }
    }

    private static async handleScenariosUpdate(msg: any): Promise<boolean> {
        const data = msg.data as { scenarios: ISerializedScenario[] };
        const client = ModelManager.getClient();
        const modelManager = ModelManager.getInstance();
        const viewport = new Viewport(client);
        const currentPage = viewport.getCurrentPage();

        if (!currentPage) {
            throw new Error('Current page not available');
        }

        await modelManager.updateScenarios(data.scenarios, currentPage);
        await modelManager.validateModel();
        await SelectionHandler.sendSelectionChangedMessage(true);
        return true;
    }
}
```

**Step 2: Register the handler**

Add to the handler registry so messages are routed to this handler.

**Step 3: Commit**

```bash
git add -A && git commit -m "feat: add ScenarioDefinitionHandler for scenario persistence"
```

---

### Task 4.3: Add React sender for scenario definitions

**Files:**
- Modify: `quodsim-react/src/messaging/senders/modelOpsSender.ts`

**Step 1: Add sender method**

```typescript
const updateScenarioDefinitions = useCallback((scenarios: ISerializedScenario[]) => {
    send(EnvelopeMessageType.SCENARIOS_DEFINITION_UPDATE, {
        scenarios
    });
}, [send]);
```

Add to the return object.

**Step 2: Commit**

```bash
git add -A && git commit -m "feat: add scenario definition sender to React"
```

---

## Phase 5: React UI

### Task 5.1: Create ChangeRequestEditor component

**Files:**
- Create: `quodsim-react/src/features/editors/ChangeRequestEditor.tsx`

This is a form component for adding/editing a single change request. It uses dropdowns populated from the model's reference data (actual activity names, resource names, etc.).

Key elements:
- Object type dropdown (Activity, Resource, Generator, Connector)
- Target object dropdown (populated from referenceData based on selected type)
- Property dropdown (filtered by object type)
- Setter type dropdown (Equal, Add, Multiply, etc.) — shown for numeric properties
- Value input (number for numeric, checkbox for boolean)
- Description text field (optional)
- Save/Cancel buttons

**Commit:**

```bash
git add -A && git commit -m "feat: add ChangeRequestEditor component"
```

---

### Task 5.2: Create ScenarioDefinitionCard component

**Files:**
- Create: `quodsim-react/src/features/editors/ScenarioDefinitionCard.tsx`

Card component showing a single scenario definition:
- Scenario name (editable)
- Description (editable)
- List of change requests with delete buttons
- "Add Change Request" button (opens ChangeRequestEditor)
- "Run" button to run this scenario
- "Delete Scenario" button with confirmation

**Commit:**

```bash
git add -A && git commit -m "feat: add ScenarioDefinitionCard component"
```

---

### Task 5.3: Create ScenarioDefinitionEditor component

**Files:**
- Create: `quodsim-react/src/features/editors/ScenarioDefinitionEditor.tsx`

Main panel component:
- Shows list of ScenarioDefinitionCards
- "Add Scenario" button to create a new scenario
- Implicit "Baseline" scenario shown at top (no change requests, not editable, has Run button)
- Sends SCENARIOS_DEFINITION_UPDATE when scenarios are modified
- Reads current scenarios from the messaging context/props

**Commit:**

```bash
git add -A && git commit -m "feat: add ScenarioDefinitionEditor component"
```

---

### Task 5.4: Add scenario definitions to messaging context

**Files:**
- Modify: `quodsim-react/src/messaging/MessageContext.ts` (add scenario definition state)
- Modify: `quodsim-react/src/messaging/MessageProvider.tsx` (add reducer/provider)
- Create: `quodsim-react/src/messaging/state/scenarioDefinitionSlice.ts`

Add state management for scenario definitions received from the extension (loaded from shapeData). This is separate from the simulationRunSlice which manages blob-based run records.

**Commit:**

```bash
git add -A && git commit -m "feat: add scenario definition state management"
```

---

### Task 5.5: Wire up tab/panel organization

**Files:**
- Modify: `SimulationRunsPanel.tsx` (formerly ScenariosPanel)
- Modify: whatever parent component manages tabs

Add a "Scenarios" tab alongside the existing "Runs" tab:
- **Scenarios tab** → ScenarioDefinitionEditor
- **Runs tab** → SimulationRunEditor (existing, renamed)

Update PanelHeader.tsx if needed for the "Run Simulation" button to run Baseline.

**Commit:**

```bash
git add -A && git commit -m "feat: wire up Scenarios and Runs tab organization"
```

---

## Phase 6: Data Connector Integration

### Task 6.1: Pass change requests in simulation payload

**Files:**
- Modify: the extension code that builds the model JSON payload for simulation submission
- Modify: the data connector action that receives and forwards the payload

When running a scenario:
1. Extension looks up the scenario by ID in shapeData
2. Serializes its change requests as `scenarioChangeRequests` in the model payload
3. Data connector passes the array through to the Python runner

For Baseline runs (no scenario or scenario with empty change requests), the field is omitted.

**Commit:**

```bash
git add -A && git commit -m "feat: pass scenario change requests in simulation payload"
```

---

### Task 6.2: Add scenarioId to SimulationRun records

**Files:**
- Modify: `SimulationRunInfo` interface in shared
- Modify: data connector list action to include scenarioId
- Modify: React SimulationRunCard to show which scenario a run belongs to

Add optional `scenarioId` and `scenarioName` fields to SimulationRunInfo so the UI can display which scenario was used for each run.

**Commit:**

```bash
git add -A && git commit -m "feat: associate SimulationRuns with their source Scenario"
```

---

## Phase 7: Python Integration

### Task 7.1: Handle scenarioChangeRequests in Python runner

**Files:**
- Modify: `quodsim/quodsim/readers/lucid_model_definition_json_reader.py`

When the JSON model payload contains `scenarioChangeRequests`, deserialize them into `ScenarioChangeRequest` objects and add to the model definition:

```python
if "scenarioChangeRequests" in json_data:
    for cr_data in json_data["scenarioChangeRequests"]:
        change = ScenarioChangeRequest.from_dict(cr_data)
        model_def.scenario_changes.append(change)
```

Then before running, apply them:
```python
model_def.apply_scenario_changes()
```

**Note:** Check if `ScenarioChangeRequest` already has a `from_dict()` method. If not, add one following the dual-key pattern from the sync guide.

**Commit (in quodsim repo):**

```bash
git add -A && git commit -m "feat: handle scenarioChangeRequests from frontend JSON payload"
```

---

## Phase 8: Version Transform

### Task 8.1: Add version transform for existing documents

**Files:**
- Modify: `shared/src/constants/version.ts` (bump QUODSI_VERSION)
- Add transform if needed (existing documents without `q_scenarios` key simply return empty array from `getScenarios()`, so no transform may be needed)

The StorageAdapter already returns `[]` when the key is missing, so existing documents work without modification. A version bump is still good practice to mark the schema change.

**Commit:**

```bash
git add -A && git commit -m "chore: bump version for scenario change requests feature"
```

---

## Verification Checklist

After all phases:

- [ ] `npm run build -w @quodsi/shared` — passes
- [ ] `cd shared && npm test` — passes
- [ ] React app compiles and starts
- [ ] Data connector compiles
- [ ] Extension bundles (`npm run bundle`)
- [ ] Existing documents open without errors (no `q_scenarios` key = empty array)
- [ ] Can create a new scenario definition with change requests
- [ ] Scenario definitions persist across page reloads (stored in shapeData)
- [ ] Can run Baseline (no change requests) — identical to current behavior
- [ ] Can run a named scenario with change requests — Python applies them
- [ ] SimulationRun history shows which scenario was used
- [ ] Can delete scenario definitions and simulation runs independently
