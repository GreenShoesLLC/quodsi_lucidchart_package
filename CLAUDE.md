# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quodsi is a LucidChart extension that transforms diagrams into discrete event simulation models. This repo is an npm workspace with three components. It is a nested working copy inside the `quodsi` monorepo (`C:\_source\quodsi\`), which owns the domain types (`quodsi_shared/`, consumed here as `@quodsi/shared` via `file:../../quodsi_shared`), the FastAPI backend (`quodsi_api/`, reached via the `quodsi_api_data_connector` declared in the manifests), and the Studio components this extension bundles. See the monorepo's root `CLAUDE.md` for the cross-repo layout.

## Architecture

### Component Structure
1. **Shared Library** (`/lucid-shared`, `@quodsi/lucid-shared`) - Lucid-only layer: messaging protocol, Lucid serialization/validation services, platform adapters, logging. Domain models (`Activity`, `Resource`, `ModelDefinition`, ...) come from the monorepo's `@quodsi/shared` and are re-exported here, so extension and panel code imports everything from `@quodsi/lucid-shared`.
2. **Editor Extension** (`/editorextensions/quodsi_editor_extension`) - TypeScript-based LucidChart extension that manages the model lifecycle
3. **React UI** (`/editorextensions/quodsi_editor_extension/quodsim-react`) - Embedded React app for model editing and simulation controls

### Key Architectural Patterns

#### Messaging System
The project uses a postMessage-based protocol for communication between the extension and React panels:
- **Envelope Structure**: Messages contain `id`, `type`, `source`, `target`, `version`, and `data`
- **MessageRouter**: Central singleton in the extension that manages all message routing
- **MessageProvider**: React component that handles all postMessage traffic
- **Type Guards**: Always validate messages before processing

#### State Management
- Extension maintains authoritative state in ModelManager
- React panels maintain local state via reducers
- Synchronization happens through message passing
- Selection changes are broadcast to all interested components

#### Logging System

A shared, level-based logger replaced the legacy `ExtensionDebugService` /
`ComponentLogger`-as-primary-path setup (2026-08-17). It lives in `quodsi_shared/src/logging/` (`registry.ts`, `consoleSink.ts`,
`runtimeOverride.ts`, `levels.ts`, `types.ts`), is exported from
`@quodsi/shared`, and is re-exported unchanged from `@quodsi/lucid-shared`
(`export { configureLogger, getLogger, consoleSink, installDebugGlobal,
resetLoggerForTests } from '@quodsi/shared';` in `lucid-shared/src/index.ts`)
so both the extension and the React panel import it from
`@quodsi/lucid-shared`.

**`QuodsiLogger` and `ComponentLogger`** (`lucid-shared/src/core/logging/`)
are legacy and deliberately NOT migrated — they still call `console.*`
directly. `QuodsiLogger`'s abstract base plus its concrete subclasses
(`ModelValidationService`, `ModelDataSource`, `ModelDefinitionRepository`,
`LucidPageAnalyzer`, `LucidPageConversionService`) survive by design; do not
route new code through them.

**Host configuration.** Each host calls `configureLogger({ level, sinks:
[consoleSink()], namespaceLevels: {...} })` once at startup, then
`installDebugGlobal()`:
- **Extension** (`editorextensions/quodsi_editor_extension/src/extension.ts`):
  level comes from `__QUODSI_LOG_LEVEL__`, a build-time constant injected by
  `webpack.config.js` via `DefinePlugin` — `JSON.stringify(mode ===
  "production" ? "warn" : "debug")`. This is NOT `process.env.NODE_ENV`: the
  extension's `tsconfig.json` sets `"types": []`, so `@types/node`'s
  `process` global is never in scope there, and adding it back would leak
  Node globals (`Buffer`, `__dirname`, ...) into code that actually runs in
  a Lucid sandbox. See `src/interop.d.ts` for the ambient declaration.
- **React panel** (`quodsim-react/src/index.tsx`): level is
  `import.meta.env.DEV ? 'debug' : 'warn'` (Vite's own dev/prod flag, not
  the webpack constant — the two hosts are built by different tools).
- **Defaults**: production ships at `warn`; development at `debug`.
- Both hosts pass a `namespaceLevels` map that mutes historically-noisy
  components to `'error'` (e.g. `MessageRouter`, `ChannelManager`,
  `StorageAdapter`) — this is the former
  `ExtensionDebugService.noisyComponents` mute list, now config data instead
  of code.

**`window.QUODSI_DEBUG`** (installed by `installDebugGlobal()` in
`quodsi_shared/src/logging/runtimeOverride.ts`) gives support a runtime
override surface:
- `setLevel(level)` — sets the global level (`silent | error | warn | info |
  debug | trace`); rejects an unknown level with a `console.warn` listing
  valid values.
- `setNamespaceLevel(namespace, level)` — overrides one namespace only.
- `namespaces()` — lists namespaces currently known to the registry.
- `reset()` — clears both overrides (`console.info`'s a confirmation).
- Overrides persist in `localStorage` (`quodsi.log.level`,
  `quodsi.log.namespaces`) and are re-applied on every `configureLogger`
  call, so a support-enabled level survives a page reload mid-repro.
  Storage access is fully feature-detected and failure-tolerant: a missing
  or throwing `localStorage` (or a corrupt stored value) degrades silently
  to "no override" rather than breaking logging.

**Two-realm limitation (UNRESOLVED).** The extension context and the panel
iframe are separate JS realms that share neither `window` nor `localStorage`,
so a level set in one does not affect the other. Which devtools frame
(`top` vs the Quodsi panel iframe) exposes `window.QUODSI_DEBUG` has never
been checked against a real Lucid document. To settle it: with the local
test extension running, evaluate `typeof window.QUODSI_DEBUG` in devtools
with the panel iframe selected, then with `top` selected; whichever answers
`"object"` is the realm the override controls (both may). Until someone
records that result, do not guess which frame support should tell a
customer to select.

**The `no-console` ship gate.** `quodsim-react/scripts/lint-hooks.js`
(invoked as `npm run lint:hooks --workspace
editorextensions/quodsi_editor_extension/quodsim-react`) runs two ESLint
passes and fails on any `no-console` (or `react-hooks/rules-of-hooks`)
violation: pass 1 covers `quodsim-react/src` via `.eslintrc.js`; pass 2
covers the editor extension's own `src` via an inline `overrideConfig`
(that package has no ESLint config or devDependency of its own — eslint is
only resolvable there because it hoists from `quodsim-react`'s
devDependency). This gate is `deploy/lucid-package/build-bundle.ps1`'s Step
1.4 and blocks the bundle if either pass finds a violation.

> **Warning:** the gate reads config via ESLint 8's legacy `.eslintrc.js`
> system (pinned `^8.57.0`). ESLint 9 defaults to flat config and ignores
> `.eslintrc.js` entirely — bumping past ESLint 8 without migrating to
> `eslint.config.js` (or explicitly forcing eslintrc mode) would make this
> gate report "clean" forever while linting against an empty ruleset.

## Development Commands

### Initial Setup
```bash
# Install dependencies for all workspaces
npm install

# Build shared library first (required by other components)
cd lucid-shared && npm run build
```

### Local Development
```bash
# Start the extension in test mode (from root)
npm start

# Start React app development server (with hot reload)
cd editorextensions/quodsi_editor_extension/quodsim-react && npm start
```

### Building
```bash
# Build shared library
cd lucid-shared && npm run build

# Build React app for production
cd editorextensions/quodsi_editor_extension/quodsim-react && npm run build

# Bundle extension for deployment (from root)
npm run bundle
```

### Testing
```bash
# Run shared library tests
cd lucid-shared && npm test

# Update test snapshots
cd lucid-shared && npm run test:update-snapshots

# Run React app tests
cd editorextensions/quodsi_editor_extension/quodsim-react && npm test
```

### Running Individual Tests
```bash
# Run a specific test file
cd lucid-shared && npm test -- ModelValidationService.test.ts

# Run tests in watch mode
cd lucid-shared && npm test -- --watch
```

## Important Development Notes

### Message Flow
1. React → Extension: Use typed message builders from `quodsi-messaging`
2. Extension → React: Route through MessageRouter
3. Always handle REACT_APP_READY before sending messages to panels

### Common Gotchas
1. **Build Order**: Always build shared library before other components
2. **Race Conditions**: Messages are queued until REACT_APP_READY is received
3. **Authentication**: Auth state must be synchronized across all panels
4. **Validation**: Model validation happens in shared library, not in UI
5. **Type Safety**: Import types from `@quodsi/lucid-shared`, which re-exports the monorepo's `@quodsi/shared`. Changes to domain types are made in `../quodsi_shared/`, then rebuilt there and in `lucid-shared/`.

### Environment Configuration
- **Local**: `http://localhost:8000/lucid/` (FastAPI quodsi_api)
- **Dev**: `https://ca-quodsim-dev-api.nicesand-882b0444.westus.azurecontainerapps.io/lucid/` (Container App, quodsim tenant)
- **Test**: `https://ca-quodsim-test-api.ambitiouspond-d8683d4f.westus.azurecontainerapps.io/lucid/` (Container App, quodsim tenant)
- **Production**: not deployed (no prod Container App exists; `manifest_prod.json` is a placeholder until the prod estate is stood up)

### Key Classes and Services
- `ModelManager`: Central coordinator for model state and operations
- `StorageAdapter`: Handles persistence to LucidChart storage
- `MessageRouter`: Routes messages between extension and panels
- `ModelDefinition`: Core domain model containing all simulation objects
- `ModelValidationService`: Validates model correctness before simulation

**Storage format 2 (2026-08-23, Plan 2b — global resources).** Resources
are model-level, not per-shape: each page's `q_resources` shapeData key
holds the resource list as JSON (`StoredResourceRecord[]`, no geometry, no
transient markers). A Resource block no longer owns its resource data
directly — its `q_data` domain is just a pointer, `{ resourceId }` — and a
swimlane lane that has been linked to a resource stores
`q_swimlane.lanes[n].resourceId`; the legacy inline `lanes[n].resource` is
read only by `src/core/ResourceStorageMigration.ts`, which runs
unconditionally on every open from `ModelManager.ensureModelDefinition`, is
idempotent, restores every key it touched if it throws, and reports any
name collision it had to rename as a `resource_renamed_on_migration`
WARNING. The page is stamped with `LUCID_STORAGE_FORMAT` (currently `2`, in
`src/core/storageFormat.ts`) via `q_lucid_format`; a document stamped
strictly higher than the running extension's version is refused with an
`extension_outdated` ERROR, while absent or lower proceeds — this stamp is
independent of `MODEL_SCHEMA_VERSION` (the engine wire format is
unchanged). Geometry follows whichever shape currently claims a resource: a
block-linked resource is positioned at build time, a lane-linked one is
not. Block and lane claims are resolved through `resolveResourceLinks`,
which enforces one claimant per resource and reports dangling or duplicate
claims as `resource_link_*` WARNINGs. Auto-derived requirements (one per
resource, `id === resource.id`) are computed at build time by
`reconcileAutoRequirements`; `q_res_requirements` stores only custom
requirements and overrides. All resource writes go through
`updateModelRoot({ resources, resourceRequirements })`, and the panel
renders Studio's shared `ResourcesEditor` / `ResourceEditor` /
`ResourceLinkPicker` components. Un-classifying a block or unlinking a lane
leaves its resource record unclaimed rather than deleting it — deletion
only happens explicitly, from the Resources tab. Paste normalization is
registered via `DocumentProxy.hookCreateItems` in `src/extension.ts` and
implemented in `src/core/PasteNormalizer.ts`, which detects a pasted item
whenever its stored envelope id no longer matches its live item id.

**Work schedules (2026-08-27, spec `docs/superpowers/specs/2026-08-27-work-schedules-design.md`).**
Time-varying capacity lives in a page-level `q_work_schedules` shapeData key
(`ISerializedWorkSchedule[]`), a sibling of `q_arrival_schedules` — additive,
so `LUCID_STORAGE_FORMAT` is unchanged and an absent key reads as `[]`.
Records are stored WITHOUT the class `type` tag (`StorageAdapter.setWorkSchedules`
strips it: `WorkSchedule.type` is `SimulationObjectType.None` and the engine's
`extra="forbid"` `CleanWorkScheduleDoc` rejects a whole document over one
stray key). A Resource or Activity opts in through its own `workScheduleId`
— on the Resource's `q_resources` record, on the Activity's `q_data` — and
because absence IS the value ("fixed capacity"), clearing an Activity's link
needs the cleared-field signal (`ACTIVITY_CLEARABLE_KEYS`), while a Resource's
clear rides the whole-list replace `updateModelRoot({ resources })` already
performs. `LucidVersionUpgrader` backs up and restores the key but does not
run it through `upgradeElements` (no pre-clean shape exists to upgrade from,
and folding it in would stamp the synthetic `type` back on). The panel's
Schedules tab mounts Studio's `WorkSchedulesEditor`, which hands an id to
`OPEN_WORK_SCHEDULE_MODAL` → `WorkScheduleEditorModal` (the `work-schedule`
channel, `?view=work-schedule&scheduleId=…`) rather than opening its own
modal inside the 300px dock. The per-target "Fixed capacity | Follow a
schedule" control is Studio's `CapacitySourcePicker`: `ResourceBasicTab`
mounts it for a Resource, and `ActivityEditor`'s Basic tab mounts it directly
for an Activity (it replaced the bare capacity input). Both read the schedule
list off the model-root projection -- NOT `referenceData`, which is rebuilt
only when the host re-processes a SELECTION, so a just-created schedule would
render as "Missing schedule". The Activity mount passes `onEdit`, the same
host-presenter seam `WorkSchedulesEditor` uses, so its "Edit/New schedule"
opens the Lucid modal; the Resource mount does NOT yet (ResourcesTab ->
ResourcesEditor -> ResourceBasicTab never threads one through), so on that
path the picker still opens its own dialog inside the 300px dock -- worth
closing when the Resources tab is next touched. In `ActivityEditor` the link
is written into that editor's own DRAFT (never `accessor.updateShape`, which
the next autosave would clobber) and a clear rides out as
`CLEARED_FIELDS_KEY: ['workScheduleId']`.

### Debugging Tips
1. Enable console logging in browser developer tools
2. Use the test extension mode (`npm start`) for faster iteration
3. The panel has no network access; data-connector calls go extension → Lucid → `quodsi_api` (`app/routers/lucid_router.py` in the monorepo), so watch the API's logs rather than the panel's Network tab
4. Validation messages appear in the React UI's validation panel
5. Use browser's postMessage debugging to trace message flow

## Backend Integration

The extension has no backend of its own. Simulation runs, results, auth sync and entitlements are served by the monorepo's FastAPI app (`quodsi_api/`), which fronts Azure Batch, Storage and Postgres. User authentication is Kinde, reached through Lucid's platform OAuth (see `_docs/auth-migration-to-kinde.md` for architecture).

Local development against the backend: run `quodsi_api` locally (`uvicorn app.main:app --reload --port 8000` from `../quodsi_api/`) and build the extension with `manifest_local.json`, whose `callbackBaseUrl` is `http://localhost:8000/lucid/`.

## Lucid SDK Integration

### Key SDK Concepts Used
- **EditorClient**: Main interface for document interaction
- **BlockProxy/LineProxy**: Shape and connector representation
- **Panel API**: For creating UI panels
- **Collection API**: For managing simulation data
- **Data Connector API**: For external data sync

### SDK Documentation
- Official docs: https://developer.lucid.co/docs/
- Local reference: `LUCID_SDK_REFERENCE.md`

### Common SDK Patterns
1. Always wait for panel ready state before messaging
2. Use collection API for large datasets (simulation results)
3. Store complex data as JSON strings in shape data
4. Handle async operations with proper error handling

## Deployment

The project separates **infrastructure provisioning** (rare) from **application deployment** (frequent). The backend (FastAPI) has been extracted to the **`quodsi` monorepo**; this repo now ships only the LucidChart extension package.

### Infrastructure Provisioning

The active Bicep templates live in the monorepo at `../infrastructure/bicep/`. The legacy ARM templates in this repo's `/infrastructure/batch/` and `/infrastructure/storage/` are **reference-only** and are not re-deployed.

### Application Deployment (`/deploy/`)

This directory now packages the LucidChart extension only.

#### LucidChart extension package
```bash
./deploy/lucid-package/build-bundle.ps1 -TargetEnvironment PRD
# Then upload package.zip to LucidChart developer portal
```

#### React app (optional standalone build)
```bash
# Usually bundled automatically by Lucid package build
./deploy/react/build-react.ps1 -TargetEnvironment Dev
```

#### Backend API (FastAPI)
Deployed from the monorepo via GitHub Actions on pushes to `release/dev` / `release/test` (never on `main`, which only runs CI):
- Workflows: `../.github/workflows/deploy-api-dev.yml`, `deploy-api-test.yml`
- Runbook: `../infrastructure/docs/040-deployment-runbook.md`

When an extension release depends on a new API or engine behavior, promote the API/engine first, then upload the package.