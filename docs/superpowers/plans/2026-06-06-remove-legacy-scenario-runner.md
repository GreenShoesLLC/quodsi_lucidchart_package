# Remove Legacy Scenario Runner — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Delete the legacy in-extension scenario runner UI and the `SCENARIOS_DB_AUTHORITATIVE` flag, leaving the embedded-Studio scenarios path as the only way to edit/run scenarios.

**Architecture:** This is a removal, not a feature. Scenario editing already runs through the embedded Studio iframe (`studio-embed` modal); the legacy React panel only rendered in the `false` branch of a flag that is hardcoded `true`. We delete the dead UI top-down (consumers before files), strip the now-orphaned messaging plumbing, collapse the flag's three sync read-sites to the DB-authoritative branch, and remove the dead message types — keeping every code path the embed still depends on.

**Tech Stack:** TypeScript, React 18 (quodsim-react), Lucid extension SDK, Jest (react-scripts test), `@quodsi/shared` (built via `npm run build -w @quodsi/shared`).

**Verification model (not TDD):** Each task ends with a typecheck/test/build gate that must pass, then a commit. There is no new behavior to test-drive; the proof is "compiles green, existing suite green, bundle builds."

**Paths:** All relative to repo root `C:\_source\quodsi\quodsi_lucidchart_package`.
- React app: `editorextensions/quodsi_editor_extension/quodsim-react/`
- Extension: `editorextensions/quodsi_editor_extension/`
- Shared: `shared/`

**KEEP — do not touch (embed still depends on these):** `ScenariosLaunchButton`, `SimulationRunHandler.handleOpenScenariosModal`, `StudioEmbedModal`, `SyncHandler`, **both** `upsertModelAndSyncScenarios` and `upsertModelAndSeedScenariosIfEmpty`, `StorageAdapter.getScenarios/setScenarios/clearScenarios`, `ModelManager.ensureBaselineScenario/syncBaselineAfterCreate/updateScenarios`, `RightDockPanel.upsertAndSyncOnPanelInit`, message types `OPEN_SCENARIOS_MODAL` / `RUN_SCENARIO` / `RUN_SCENARIO_RESULT` / `SIMULATION_RUNS_LIST_REQUEST`, and the `StaleScenario*` results-analysis components.

---

### Task 0: Branch + baseline

**Files:** none (git only)

- [ ] **Step 1: Create the working branch off main**

```bash
cd /c/_source/quodsi/quodsi_lucidchart_package
git checkout main
git checkout -b chore/remove-legacy-scenario-runner
```

- [ ] **Step 2: Record the baseline build state**

```bash
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/quodsim-react/tsconfig.json; echo "REACT EXIT: $?"
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/tsconfig.json; echo "EXT EXIT: $?"
```
Expected: both `EXIT: 0`. (Known stale red: `shared/src/config/scenariosMode.test.ts` asserts the flag is `false` while it is `true` — it gets deleted in Task 5; ignore it until then.)

---

### Task 1: Unwire the legacy UI from `ModelEditor` + `PanelHeader`

Removing the consumers first means the orphaned component files in Task 2 delete cleanly.

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx`
- Modify: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/PanelHeader.tsx`

- [ ] **Step 1: ModelEditor.tsx — remove the three legacy imports**

Delete the `SCENARIOS_DB_AUTHORITATIVE,` line from the `@quodsi/shared` import block:
```tsx
  generateUUID,
  SCENARIOS_DB_AUTHORITATIVE,   // ← delete this line
} from "@quodsi/shared";
```
Delete the `ScenarioCard` import line:
```tsx
import { ScenarioCard, ScenarioRunStatus } from "./ScenarioCard";
```
> NOTE: `ScenarioRunStatus` — before deleting, confirm it is not referenced outside `ScenariosAndRunsPanel`. Run:
> ```bash
> grep -rn "ScenarioRunStatus" editorextensions/quodsi_editor_extension/quodsim-react/src --include=*.tsx --include=*.ts
> ```
> If every hit is inside the `ScenariosAndRunsPanel` body (lines ~151–597) or this import, the whole import line goes. If `ScenarioRunStatus` is used elsewhere, keep a `import { ScenarioRunStatus } from "./ScenarioCard";` until Task 2 resolves it.

Delete the `useScenariosSender` import line:
```tsx
import { useScenariosSender } from "../../messaging/senders/scenariosSender";
```

- [ ] **Step 2: ModelEditor.tsx — remove the `scenarios` tab entry from `TAB_CONFIG`**

In the `TAB_CONFIG` array, delete this entry:
```tsx
  {
    id: "scenarios" as const,
    title: "Scenarios",
    icon: PlaySquare,
    tooltip: "Configure and manage scenarios with different parameter sets and run configurations"
  },
```
If `PlaySquare` (lucide-react icon) is now unused, remove it from its import. Confirm:
```bash
grep -n "PlaySquare" editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx
```
Expected after edit: only the import line remains → remove it from the import.

- [ ] **Step 3: ModelEditor.tsx — collapse `scenariosModalEnabled` / `visibleTabs`**

Delete these two lines:
```tsx
  const scenariosModalEnabled = SCENARIOS_DB_AUTHORITATIVE;
  const visibleTabs = scenariosModalEnabled ? TAB_CONFIG.filter((t) => t.id !== 'scenarios') : TAB_CONFIG;
```
Then change the tab map consumer from `visibleTabs.map(` to `TAB_CONFIG.map(`:
```tsx
        {TAB_CONFIG.map((tab) => {
```

- [ ] **Step 4: ModelEditor.tsx — delete the legacy conditional render block**

Delete this entire block:
```tsx
      {!scenariosModalEnabled && activeTab === "scenarios" && (
        <ScenariosAndRunsPanel
          documentId={selection.documentContext?.documentId}
          pageId={selection.documentContext?.pageId}
          modelName={localModelDraft.name}
          referenceData={referenceData}
          onScenariosChange={updateScenarioDefinitions}
          onSimulate={onSimulate ?? (() => {})}
        />
      )}
```

- [ ] **Step 5: ModelEditor.tsx — delete the `ScenariosAndRunsPanel` component**

Delete the doc comment + the entire exported component (from the comment above `export const ScenariosAndRunsPanel` through its closing `};`). The signature to find:
```tsx
export const ScenariosAndRunsPanel: React.FC<{
  documentId?: string;
  pageId?: string;
  modelName: string;
  referenceData?: EditorReferenceData;
  onScenariosChange: (scenarios: ISerializedScenario[]) => void;
  onSimulate: (scenarioName?: string, scenarioDefinitionId?: string, enableAnimation?: boolean) => void;
}> = ({ documentId, pageId, modelName, referenceData, onScenariosChange, onSimulate }) => {
```
Delete from its preceding doc comment down to the matching closing `};` of this arrow component (~440 lines). Also delete the now-stale explanatory comment block above it that references `SCENARIOS_DB_AUTHORITATIVE` / `ScenariosLaunchButton`.

- [ ] **Step 6: ModelEditor.tsx — drop the now-unused `updateScenarioDefinitions`**

The outer `ModelEditor` destructures it but its only consumer was the deleted block (Step 4). Change:
```tsx
  const { updateResourceRequirements, updateScenarioDefinitions } = useModelOpsSender();
```
to:
```tsx
  const { updateResourceRequirements } = useModelOpsSender();
```

- [ ] **Step 7: PanelHeader.tsx — un-gate the launcher**

Remove the `SCENARIOS_DB_AUTHORITATIVE,` line from its `@quodsi/shared` import block. Then change the gated render:
```tsx
        {/* Row 3: Scenarios launcher (primary action; replaces the old labeled
            Scenarios "tab" in ModelEditor when the DB-authoritative modal is on) */}
        {SCENARIOS_DB_AUTHORITATIVE && <ScenariosLaunchButton />}
```
to (drop the gate; keep the launcher and a trimmed comment):
```tsx
        {/* Row 3: Scenarios launcher (primary action; opens the embedded Studio modal) */}
        <ScenariosLaunchButton />
```
Keep `import { ScenariosLaunchButton } from "./ScenariosLaunchButton";`.

- [ ] **Step 8: Typecheck the React app**

```bash
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/quodsim-react/tsconfig.json; echo "EXIT: $?"
```
Expected: `EXIT: 0`. (`ScenarioCard.tsx`, `ChangeRequestEditor.tsx`, `scenariosSender.ts` still exist but are now unimported — that's fine; unused files don't fail tsc. They're deleted in Tasks 2–3.)

- [ ] **Step 9: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ModelEditor.tsx editorextensions/quodsi_editor_extension/quodsim-react/src/features/modelPanel/PanelHeader.tsx
git commit -m "refactor(quodsim-react): drop legacy Scenarios tab; launcher always on"
```

---

### Task 2: Delete the orphaned legacy component files + their tests

**Files:**
- Delete: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ScenarioCard.tsx`
- Delete: `editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ChangeRequestEditor.tsx`
- Delete: `.../features/editors/__tests__/ScenarioCard.test.tsx`
- Delete: `.../features/editors/__tests__/ChangeRequestEditor.actionScoped.test.tsx`
- Delete: `.../features/editors/__tests__/ChangeRequestEditorDuration.test.tsx`
- Delete: `.../features/editors/__tests__/ModelEditor.test.tsx`

- [ ] **Step 1: Confirm `ScenarioCard` and `ChangeRequestEditor` have no remaining importers**

```bash
grep -rn "from \"./ScenarioCard\"\|from './ScenarioCard'\|ChangeRequestEditor" editorextensions/quodsi_editor_extension/quodsim-react/src --include=*.tsx --include=*.ts
```
Expected: hits ONLY inside `ScenarioCard.tsx`, `ChangeRequestEditor.tsx`, and the three test files being deleted. If anything else imports them, stop and reassess.

- [ ] **Step 2: Delete the files**

```bash
git rm \
  editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ScenarioCard.tsx \
  editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/ChangeRequestEditor.tsx \
  editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/ScenarioCard.test.tsx \
  editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/ChangeRequestEditor.actionScoped.test.tsx \
  editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/ChangeRequestEditorDuration.test.tsx \
  editorextensions/quodsi_editor_extension/quodsim-react/src/features/editors/__tests__/ModelEditor.test.tsx
```

- [ ] **Step 3: Typecheck + run the React test suite**

```bash
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/quodsim-react/tsconfig.json; echo "TSC EXIT: $?"
npm test --workspace editorextensions/quodsi_editor_extension/quodsim-react -- --watchAll=false 2>&1 | tail -25
```
Expected: TSC `EXIT: 0`; Jest suite passes with no references to the deleted files.

- [ ] **Step 4: Commit**

```bash
git commit -m "refactor(quodsim-react): delete orphaned ScenarioCard/ChangeRequestEditor + tests"
```

---

### Task 3: Remove orphaned React messaging plumbing

**Files:**
- Delete: `.../quodsim-react/src/messaging/senders/scenariosSender.ts`
- Modify: `.../quodsim-react/src/messaging/senders/index.ts`
- Delete: `.../quodsim-react/src/messaging/state/scenarioDefinitionSlice.ts`
- Modify: `.../quodsim-react/src/messaging/state/rootReducer.ts`
- Modify: `.../quodsim-react/src/messaging/state/types.ts`
- Modify: `.../quodsim-react/src/messaging/MessageContext.ts`
- Modify: `.../quodsim-react/src/messaging/senders/modelOpsSender.ts`

- [ ] **Step 1: Delete `scenariosSender.ts` and its barrel export**

```bash
git rm editorextensions/quodsi_editor_extension/quodsim-react/src/messaging/senders/scenariosSender.ts
```
In `senders/index.ts`, delete:
```ts
export { useScenariosSender } from './scenariosSender';
```

- [ ] **Step 2: Delete the dead `scenarioDefinitionSlice` and unwire `rootReducer.ts`**

```bash
git rm editorextensions/quodsi_editor_extension/quodsim-react/src/messaging/state/scenarioDefinitionSlice.ts
```
In `state/rootReducer.ts`, delete all four lines:
```ts
import { ScenarioDefinitionState, initialScenarioDefinitionState, scenarioDefinitionReducer, ScenarioDefinitionAction } from './scenarioDefinitionSlice';
```
```ts
  scenarioDefinitions: ScenarioDefinitionState;
```
```ts
  scenarioDefinitions: initialScenarioDefinitionState,
```
```ts
    scenarioDefinitions: scenarioDefinitionReducer(state.scenarioDefinitions, action as ScenarioDefinitionAction),
```

- [ ] **Step 3: Remove `ScenarioDefinitionAction` wiring from `types.ts`**

Delete the import line:
```ts
import { ScenarioDefinitionAction } from './scenarioDefinitionSlice';
```
Delete the re-export line (inside the `export type {...}` block):
```ts
  ScenarioDefinitionAction,
```
Delete the union member (inside `MessagingAction`):
```ts
  | ScenarioDefinitionAction
```

- [ ] **Step 4: Remove the dead `useScenarioDefinitions` accessor from `MessageContext.ts`**

Delete:
```ts
/**
 * Hook to access scenario definitions state
 */
export function useScenarioDefinitions() {
  const { scenarioDefinitions } = useMessaging();
  return scenarioDefinitions;
}
```
> Confirm zero call sites first:
> ```bash
> grep -rn "useScenarioDefinitions" editorextensions/quodsi_editor_extension/quodsim-react/src
> ```
> Expected: only the definition above.

- [ ] **Step 5: Remove `updateScenarioDefinitions` from `modelOpsSender.ts`**

Delete the definition:
```ts
  /**
   * Send a request to update the scenario definitions array
   *
   * @param scenarios Array of serialized scenario definitions
   */
  const updateScenarioDefinitions = useCallback((scenarios: ISerializedScenario[]) => {
    send(EnvelopeMessageType.SCENARIOS_DEFINITION_UPDATE, {
      scenarios
    });
  }, [send]);
```
Delete `    updateScenarioDefinitions,` from BOTH the `useMemo` return object and its deps array. If `ISerializedScenario` is now unused in this file, drop it from the import on line 2 (verify with `grep -n "ISerializedScenario" .../modelOpsSender.ts` → expect no remaining uses).

- [ ] **Step 6: Typecheck + test**

```bash
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/quodsim-react/tsconfig.json; echo "TSC EXIT: $?"
npm test --workspace editorextensions/quodsi_editor_extension/quodsim-react -- --watchAll=false 2>&1 | tail -25
```
Expected: TSC `EXIT: 0`; tests pass. (`SCENARIOS_DEFINITION_UPDATE` is still a valid enum member at this point — it's removed in Task 6.)

- [ ] **Step 7: Commit**

```bash
git add editorextensions/quodsi_editor_extension/quodsim-react/src/messaging
git commit -m "refactor(quodsim-react): remove dead scenario-definition slice/sender/accessor"
```

---

### Task 4: Remove the legacy extension handler

**Files:**
- Delete: `editorextensions/quodsi_editor_extension/src/core/messaging/handlers/scenarioDefinitionHandler.ts`
- Modify: `editorextensions/quodsi_editor_extension/src/core/messaging/handlers/index.ts`

- [ ] **Step 1: Delete the handler file**

```bash
git rm editorextensions/quodsi_editor_extension/src/core/messaging/handlers/scenarioDefinitionHandler.ts
```

- [ ] **Step 2: Unregister it in `handlers/index.ts`**

Delete the import:
```ts
import { ScenarioDefinitionHandler } from './scenarioDefinitionHandler';
```
Delete the dispatch registration:
```ts
    // Scenario definition operations messages
    if (ScenarioDefinitionHandler.handleMessage(msg)) {
      return true;
    }
```
Delete the re-export line (inside the `export {...}` block):
```ts
  ScenarioDefinitionHandler,
```

- [ ] **Step 3: Typecheck the extension**

```bash
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/tsconfig.json; echo "EXIT: $?"
```
Expected: `EXIT: 0`.

- [ ] **Step 4: Commit**

```bash
git add editorextensions/quodsi_editor_extension/src/core/messaging/handlers
git commit -m "refactor(extension): remove legacy scenarioDefinitionHandler"
```

---

### Task 5: Collapse the `SCENARIOS_DB_AUTHORITATIVE` flag

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/src/core/messaging/handlers/simulationHandler.ts`
- Modify: `editorextensions/quodsi_editor_extension/src/core/ModelManager.ts`
- Modify: `editorextensions/quodsi_editor_extension/src/panels/RightDockPanel.ts`
- Delete: `shared/src/config/scenariosMode.ts`
- Delete: `shared/src/config/scenariosMode.test.ts`
- Modify: `shared/src/index.ts`

- [ ] **Step 1: simulationHandler.ts — collapse the ternary**

Replace:
```ts
        const sync = SCENARIOS_DB_AUTHORITATIVE
          ? upsertModelAndSeedScenariosIfEmpty
          : upsertModelAndSyncScenarios;
```
with:
```ts
        const sync = upsertModelAndSeedScenariosIfEmpty;
```
Then remove the `SCENARIOS_DB_AUTHORITATIVE` import line, and drop `upsertModelAndSyncScenarios` from the `scenarioSync` import in THIS file only (keep `upsertModelAndSeedScenariosIfEmpty`). Confirm no other use:
```bash
grep -n "upsertModelAndSyncScenarios\|SCENARIOS_DB_AUTHORITATIVE" editorextensions/quodsi_editor_extension/src/core/messaging/handlers/simulationHandler.ts
```
Expected after edit: no matches.

- [ ] **Step 2: ModelManager.ts — collapse the ternary**

Replace:
```ts
            const sync = SCENARIOS_DB_AUTHORITATIVE
                ? upsertModelAndSeedScenariosIfEmpty
                : upsertModelAndSyncScenarios;
```
with:
```ts
            const sync = upsertModelAndSeedScenariosIfEmpty;
```
Remove the `SCENARIOS_DB_AUTHORITATIVE` import; drop `upsertModelAndSyncScenarios` from the `scenarioSync` import in this file. Confirm:
```bash
grep -n "upsertModelAndSyncScenarios\|SCENARIOS_DB_AUTHORITATIVE" editorextensions/quodsi_editor_extension/src/core/ModelManager.ts
```
Expected after edit: no matches.

- [ ] **Step 3: RightDockPanel.ts — collapse the ternary**

Replace:
```ts
            const sync = SCENARIOS_DB_AUTHORITATIVE
                ? upsertModelAndSeedScenariosIfEmpty
                : upsertModelAndSyncScenarios;
```
with:
```ts
            const sync = upsertModelAndSeedScenariosIfEmpty;
```
Remove the `SCENARIOS_DB_AUTHORITATIVE` import; drop `upsertModelAndSyncScenarios` from the `scenarioSync` import in this file. Confirm:
```bash
grep -n "upsertModelAndSyncScenarios\|SCENARIOS_DB_AUTHORITATIVE" editorextensions/quodsi_editor_extension/src/panels/RightDockPanel.ts
```
Expected after edit: no matches.

- [ ] **Step 4: Delete the flag + its test; drop the shared export**

```bash
git rm shared/src/config/scenariosMode.ts shared/src/config/scenariosMode.test.ts
```
In `shared/src/index.ts`, delete:
```ts
export * from './config/scenariosMode';
```

- [ ] **Step 5: Confirm the flag is gone everywhere, then rebuild shared + typecheck**

```bash
grep -rn "SCENARIOS_DB_AUTHORITATIVE\|scenariosMode" editorextensions shared --include=*.ts --include=*.tsx
```
Expected: no matches (docs excluded).
```bash
npm run build -w @quodsi/shared 2>&1 | tail -5
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/tsconfig.json; echo "EXT EXIT: $?"
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/quodsim-react/tsconfig.json; echo "REACT EXIT: $?"
```
Expected: shared build succeeds; both `EXIT: 0`.

- [ ] **Step 6: Commit**

```bash
git add editorextensions shared
git commit -m "refactor: remove SCENARIOS_DB_AUTHORITATIVE flag; sync is always DB-authoritative"
```

---

### Task 6: Remove the dead legacy message types

**Files:**
- Modify: `shared/src/quodsi-messaging/envelope/envelopeMessageTypes.ts`
- Modify: `shared/src/quodsi-messaging/index.ts`
- Modify: `editorextensions/quodsi_editor_extension/src/core/messaging/handlers/simulationRunHandler.ts`

- [ ] **Step 1: Confirm remaining references are only the four to be removed**

```bash
grep -rn "SCENARIOS_DEFINITION_UPDATE\|SCENARIOS_DEFINITION_RESULT\|SCENARIOS_LIST_REQUEST\|SCENARIOS_LIST_RESULT" editorextensions shared --include=*.ts --include=*.tsx
```
Expected hits ONLY in: `envelopeMessageTypes.ts` (declarations), `shared/src/quodsi-messaging/index.ts` (payload map, 2 lines), and `simulationRunHandler.ts` (the `SCENARIOS_LIST_REQUEST` case + log label). If `SCENARIOS_DEFINITION_*` appear anywhere else, a prior task left a reference — fix it before deleting the enum entries.

- [ ] **Step 2: Delete the enum entries**

In `envelopeMessageTypes.ts`, delete:
```ts
  // Scenario Definition Management (shapeData)
  SCENARIOS_DEFINITION_UPDATE = "SCENARIOS_DEFINITION_UPDATE",
  SCENARIOS_DEFINITION_RESULT = "SCENARIOS_DEFINITION_RESULT",
  SCENARIOS_LIST_REQUEST = "SCENARIOS_LIST_REQUEST",
  SCENARIOS_LIST_RESULT = "SCENARIOS_LIST_RESULT",
```

- [ ] **Step 3: Delete the payload-map entries in `quodsi-messaging/index.ts`**

```ts
  [EnvelopeMessageType.SCENARIOS_DEFINITION_UPDATE]: { scenarios: any[] };
  [EnvelopeMessageType.SCENARIOS_DEFINITION_RESULT]: { success: boolean; errorMessage?: string };
```

- [ ] **Step 4: simulationRunHandler.ts — drop the `SCENARIOS_LIST_REQUEST` case + log label**

Remove the aliased case line so only the live one remains:
```ts
      case EnvelopeMessageType.SIMULATION_RUNS_LIST_REQUEST:
      case EnvelopeMessageType.SCENARIOS_LIST_REQUEST:   // ← delete this line
```
Collapse the log-label ternary:
```ts
    const messageType = msg.type === EnvelopeMessageType.SCENARIOS_LIST_REQUEST
      ? 'Scenarios list'
      : 'Simulation runs list';
```
to:
```ts
    const messageType = 'Simulation runs list';
```

- [ ] **Step 5: Rebuild shared + typecheck both projects**

```bash
npm run build -w @quodsi/shared 2>&1 | tail -5
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/tsconfig.json; echo "EXT EXIT: $?"
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/quodsim-react/tsconfig.json; echo "REACT EXIT: $?"
```
Expected: shared build succeeds; both `EXIT: 0`.

- [ ] **Step 6: Commit**

```bash
git add shared editorextensions
git commit -m "refactor(shared): remove dead legacy scenario message types"
```

---

### Task 7: Version bump + full verification + bundle dry run

**Files:**
- Modify: `shared/src/constants/version.ts`

- [ ] **Step 1: Bump `QUODSI_VERSION`**

In `shared/src/constants/version.ts`, change:
```ts
export const QUODSI_VERSION = "2026.06.06";
```
to the next identifier (pick the next unused date, e.g.):
```ts
export const QUODSI_VERSION = "2026.06.07";
```
> If `2026.06.06` was never bundled, this bump is still worth it so the cleaned build is distinct. Check existing tags: `git tag -l "lucid/v*/Dev"`.

- [ ] **Step 2: Full verification sweep**

```bash
npm run build -w @quodsi/shared 2>&1 | tail -3
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/tsconfig.json; echo "EXT EXIT: $?"
npx tsc --noEmit -p editorextensions/quodsi_editor_extension/quodsim-react/tsconfig.json; echo "REACT EXIT: $?"
npm run lint:hooks --workspace editorextensions/quodsi_editor_extension/quodsim-react 2>&1 | tail -5
npm test --workspace editorextensions/quodsi_editor_extension/quodsim-react -- --watchAll=false 2>&1 | tail -25
```
Expected: shared builds; both tsc `EXIT: 0`; rules-of-hooks clean; Jest suite green.

- [ ] **Step 3: Bundle dry run (the real ship gate — no CI)**

```powershell
./deploy/lucid-package/build-bundle.ps1 -TargetEnvironment Dev
```
Expected: completes through "Lucid Package Bundle process ... completed successfully", producing `../package.zip` and `../package_v2026.06.07.zip`. (This also force-creates the `lucid/vX/Dev` git tag — fine.)

- [ ] **Step 4: Commit the version bump**

```bash
git add shared/src/constants/version.ts
git commit -m "chore: bump QUODSI_VERSION for legacy-scenario-runner removal"
```

- [ ] **Step 5: Manual smoke on dev (after upload)**

Upload `package.zip` to the Lucid dev app, hard-reload, then verify:
1. Model panel shows the **Scenarios launcher** in the PanelHeader and **no** "Scenarios" tab.
2. Clicking the launcher opens the embedded Studio scenarios modal.
3. Running a scenario from the embed works (RUN_SCENARIO round-trips).
4. Creating a fresh model still seed-syncs the baseline scenario to the DB (panel-init sync).

---

## Notes for the executor

- **Commit cadence:** this repo allows direct commits, but the human owner reviews before commits land in practice. Confirm cadence with the owner before auto-committing each task.
- **Two `@quodsi/shared` libs exist** — this work touches ONLY the Lucid-repo `shared/` (built with `npm run build -w @quodsi/shared`). Do not touch the monorepo `quodsi_shared/`.
- **Rebuild `@quodsi/shared` after any `shared/` edit** (Tasks 5–7) before typechecking the extension/React, or they'll see stale types.
- **Rollback** = redeploy the prior versioned package zip; there is no runtime flag after this.
