# Remove the legacy in-extension scenario runner

**Date:** 2026-06-06
**Repo:** `quodsi_lucidchart_package` (extension + quodsim-react + lucid `@quodsi/shared`)
**Status:** Design approved; ready for implementation plan

## Context

Scenario editing has moved out of the Lucid extension's React panel and into an
**embedded Studio iframe** (the `studio-embed` modal). That embedded path is now
live and confirmed working on dev (the token-relay reopen bug was fixed in
`9480a49` / v2026.06.06 and verified by a second user).

Today the legacy in-extension scenario UI is **dead at runtime**: the global flag
`SCENARIOS_DB_AUTHORITATIVE = true` (in `shared/src/config/scenariosMode.ts`)
hides the legacy "Scenarios" tab and shows the embed launcher instead, and routes
the extension's scenario sync to the DB-authoritative "seed-if-empty" strategy.
The legacy components only render in the `false` branch, which is never taken.

## Goal

**Full collapse.** Delete the legacy React scenario UI, remove the
`SCENARIOS_DB_AUTHORITATIVE` flag entirely, and hardcode the embed-only +
seed-if-empty behavior. No dead branches, no flag, no legacy runner.

Because deleting the legacy UI makes the flag's `false`/legacy-UI branch
unrenderable, keeping the flag as a "roll back to the legacy tab" switch would be
illusory. Real rollback is redeploying the prior package — unchanged by this work.

## Out of scope

- The embedded Studio scenarios surface itself (quodsi_studio) — untouched.
- Results / animation embed modals — untouched.
- The `StaleScenario*` analysis components (they belong to the results modal).
- The `q_scenarios` shapeData baseline seed (still needed; see Keep list).

## Removal inventory

### Delete entirely (React / quodsim-react)
- `features/editors/ScenarioCard.tsx` + `__tests__/ScenarioCard.test.tsx`
- `features/editors/ChangeRequestEditor.tsx`
  + `__tests__/ChangeRequestEditor.actionScoped.test.tsx`
  + `__tests__/ChangeRequestEditorDuration.test.tsx`
  *(verify-then-delete: confirm only `ScenarioCard` imports `ChangeRequestEditor`)*
- `messaging/state/scenarioDefinitionSlice.ts`
- `messaging/senders/scenariosSender.ts`
  *(verify-then-delete: confirm only the legacy panel calls `listScenarios`)*
- `features/editors/__tests__/ModelEditor.test.tsx` (targets the legacy panel)

### Edit (React / quodsim-react)
- `features/editors/ModelEditor.tsx`
  - Remove the `ScenariosAndRunsPanel` inner component (the legacy tab body).
  - Remove the `"scenarios"` entry from `TAB_CONFIG` and its conditional render.
  - Remove the `SCENARIOS_DB_AUTHORITATIVE` import + the `scenariosModalEnabled`
    gate (tab is simply gone now).
  - Remove `useScenariosSender`/`loadFromServer` wiring.
- `features/modelPanel/PanelHeader.tsx`
  - Render `ScenariosLaunchButton` **unconditionally** (drop the flag gate).
- `messaging/state/rootReducer.ts`
  - Remove `scenarioDefinitionSlice` import + reducer wiring.

### Delete entirely (extension, non-React)
- `core/messaging/handlers/scenarioDefinitionHandler.ts`
  + unregister it from the handler switch/registry.

### Edit (extension, non-React)
- `core/sync/scenarioSync.ts` — **KEEP both functions unchanged.**
  `upsertModelAndSyncScenarios` (replace-all) is still used by `syncHandler`
  (SYNC_ALL) and `simulationRunHandler` (embed OPEN_SCENARIOS_MODAL upsert), so it
  is NOT legacy. Only the three flag ternaries below stop selecting it.
- Collapse the 3 flag read-sites to the seed-if-empty branch (drop the
  `SCENARIOS_DB_AUTHORITATIVE` import and the `upsertModelAndSyncScenarios` import
  from these 3 files only):
  - `core/messaging/handlers/simulationHandler.ts` (pre-run sync, ~line 423)
  - `ModelManager.ts` (post-baseline-create sync, ~line 1742)
  - `panels/RightDockPanel.ts` (panel-init sync, ~line 341)

### Delete (shared / flag)
- `shared/src/config/scenariosMode.ts` (remove the flag; all read-sites collapsed).
- Legacy-only message types — *verify-then-delete, low-risk to leave as dead enum
  entries if any consumer is ambiguous:*
  `SCENARIOS_DEFINITION_UPDATE`, `SCENARIOS_DEFINITION_RESULT`,
  `SCENARIO_DEFINITIONS_*`, and `SCENARIOS_LIST_REQUEST` (only if confirmed unused
  by the embed/server path).

### Keep (do not touch)
- Embed path: `ScenariosLaunchButton`, `SimulationRunHandler.handleOpenScenariosModal`,
  `StudioEmbedModal`, and the `OPEN_SCENARIOS_MODAL` / `RUN_SCENARIO` /
  `RUN_SCENARIO_RESULT` message types.
- `StorageAdapter.getScenarios` / `setScenarios` / `clearScenarios` + `q_scenarios`
  shapeData — still read to seed the DB baseline on create/run. (`setScenarios` is
  KEPT: live callers remain in `ModelManager` — `ensureBaselineScenario`,
  `syncBaselineAfterCreate`, `updateScenarios`.)
- `StaleScenario*` analysis components (results modal).
- **`upsertModelAndSyncScenarios` AND `upsertModelAndSeedScenariosIfEmpty`** — both
  stay; the replace-all helper still serves the embed Sync + OPEN_SCENARIOS_MODAL paths.

## Sharp edges / risks

1. **`PanelHeader` launcher gate.** Currently conditional on the flag; after
   collapse it must render unconditionally. Easy to leave the launcher hidden.
2. **`ChangeRequestEditor` / `scenariosSender`** are the two verify-then-delete
   items — grep for stray importers before deleting, don't assume.
3. **Shared message-type removal** touches the Lucid `@quodsi/shared` lib. Keep it
   minimal and reversible; skip a given type if any consumer is unclear.
4. **`setScenarios` write path** — once the legacy editor is gone, confirm whether
   anything still writes q_scenarios before removing the writer.

## Sequencing

Branch `chore/remove-legacy-scenario-runner` off `main`. Typecheck after each layer.

1. React UI: delete legacy components + tests; edit `ModelEditor` + `PanelHeader`.
2. React wiring: unwire `scenarioDefinitionSlice` from `rootReducer`; delete
   `scenariosSender` (after grep).
3. Extension: delete `scenarioDefinitionHandler` + unregister; trim `scenarioSync`.
4. Flag collapse: remove `scenariosMode.ts`; collapse the 3 sync read-sites + the
   `ModelEditor` UI gate.
5. Shared message types: verify-then-delete the legacy-only types.
6. Bump `QUODSI_VERSION` (in `shared/src/constants/version.ts`).

## Verification gates (no CI — the bundle is the ship gate)

- Root `npm run typecheck` (catches cross-package breakage).
- quodsim-react test suite + `lint:hooks`.
- `deploy/lucid-package/build-bundle.ps1 -TargetEnvironment Dev` dry run (must
  build clean).
- Manual smoke on dev: model panel shows the launcher and **no** Scenarios tab;
  open the scenarios modal; run a scenario via the embed; confirm panel-init still
  seed-syncs the baseline.

## Rollback

Redeploy the prior package (the pre-removal versioned `package_v<ver>.zip`). No
runtime flag — the flag is removed by this work.
