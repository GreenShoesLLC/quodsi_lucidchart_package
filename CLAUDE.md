# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quodsi is a LucidChart extension that transforms diagrams into discrete event simulation models. The project is structured as a monorepo with three main components that work together to provide a seamless simulation modeling experience. The simulation/data backend lives in a separate repository (`quodsi_api`) and is reached via the `quodsi_api_data_connector` defined in the manifests.

## Architecture

### Component Structure
1. **Shared Library** (`/lucid-shared`) - Core domain models, validation, serialization, and messaging protocol
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
`ComponentLogger`-as-primary-path setup (2026-08-17, `feat/unified-logger`).
It lives in `quodsi_shared/src/logging/` (`registry.ts`, `consoleSink.ts`,
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

**Two-realm limitation (UNRESOLVED).** The Lucid extension runs in two
separate JS realms that do not share `window` or `localStorage`: the
extension context and the panel iframe. Setting the level in one realm does
not affect the other, and support instructions need to name the exact
devtools frame to select for each. This was meant to be settled by opening
a real Lucid document and checking `typeof window.QUODSI_DEBUG` in both the
panel-iframe and `top` devtools contexts — that check was explicitly
skipped for this task (it needs a human with a Lucid account, and the local
dev ports were in use). **The question is open.** To resolve it:
1. Start the dev server and extension test server as usual.
2. Open a Lucid document with the local test extension running.
3. In devtools, use the Console panel's context dropdown (normally reads
   `top`) to select the Quodsi panel's iframe, and evaluate
   `typeof window.QUODSI_DEBUG`.
4. Repeat with the `top` context selected instead.
5. Whichever context answers `"object"` is the realm `window.QUODSI_DEBUG`
   actually controls — support instructions must tell customers to select
   that one. If both answer `"object"`, both realms need the override set
   independently; if only one does, only that host wired
   `installDebugGlobal()` into a context devtools can reach directly.

Until someone runs this and records the result, do not guess which frame
support should tell a customer to select.

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

### Current Refactoring
The project is undergoing a messaging system refactoring on the `feature/refactoring_messaging` branch:
- Moving from tightly-coupled messaging to centralized ExtensionMessaging service
- Implementing type-safe message handling
- Creating clear separation between UI and messaging logic

### Message Flow
1. React → Extension: Use typed message builders from `quodsi-messaging`
2. Extension → React: Route through MessageRouter
3. Always handle REACT_APP_READY before sending messages to panels

### Common Gotchas
1. **Build Order**: Always build shared library before other components
2. **Race Conditions**: Messages are queued until REACT_APP_READY is received
3. **Authentication**: Auth state must be synchronized across all panels
4. **Validation**: Model validation happens in shared library, not in UI
5. **Type Safety**: Use shared types from `@quodsi/lucid-shared` package

### Environment Configuration
- **Local**: `http://localhost:8000/lucid/` (FastAPI quodsi_api)
- **Dev**: `https://ca-quodsim-dev-api.nicesand-882b0444.westus.azurecontainerapps.io/lucid/` (Container App, quodsim tenant)
- **Test**: `https://ca-quodsim-test-api.ambitiouspond-d8683d4f.westus.azurecontainerapps.io/lucid/` (Container App, quodsim tenant)
- **Production**: not deployed (legacy `prd-quodsi-func-v1` retired; prod Container App not yet provisioned)

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
claims as `resource_link_*` WARNINGs. Auto-derived requirements (from
Seize/Release actions) are computed at build time by
`reconcileAutoRequirements`; `q_res_requirements` stores only custom
requirements and overrides. All resource writes go through
`updateModelRoot({ resources, resourceRequirements })`, and the panel
renders Studio's shared `ResourcesEditor` / `ResourceEditor` /
`ResourceLinkPicker` components. Un-classifying a block or unlinking a lane
leaves its resource record unclaimed rather than deleting it — deletion
only happens explicitly, from the Resources tab.

### Debugging Tips
1. Enable console logging in browser developer tools
2. Use the test extension mode (`npm start`) for faster iteration
3. Check the Network tab for data connector API calls
4. Validation messages appear in the React UI's validation panel
5. Use browser's postMessage debugging to trace message flow

## Azure Integration

### Required Azure Resources
- Azure Functions for data connector
- Azure Batch for simulation execution
- Azure Storage for model and results storage
- User authentication via Kinde (integrated through Lucid's platform OAuth; see `_docs/auth-migration-to-kinde.md` for architecture)

### Local Azure Development
1. Copy `local.settings.json.template` to `local.settings.json` in data connector
2. Configure Azure Storage connection strings
3. Install Azure Functions Core Tools
4. Run `npm start` in data connector directory

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
- SDK examples in: `_docs/sdk/`

### Common SDK Patterns
1. Always wait for panel ready state before messaging
2. Use collection API for large datasets (simulation results)
3. Store complex data as JSON strings in shape data
4. Handle async operations with proper error handling

## Deployment

The project separates **infrastructure provisioning** (rare) from **application deployment** (frequent). The backend (FastAPI) has been extracted to the **`quodsi` monorepo**; this repo now ships only the LucidChart extension package.

### Infrastructure Provisioning

The active Bicep templates live in the monorepo at `quodsi/infrastructure/`. The legacy ARM templates in `/infrastructure/batch/` and `/infrastructure/storage/` are **reference-only** — they document the resources that are still running but are not re-deployed. The `function-apps/` and `extracted-config/` subtrees were removed (FastAPI replaced Functions; extracted-config held hardcoded secrets).

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
Deployed from the monorepo via GitHub Actions:
- Workflow: `quodsi/.github/workflows/deploy-api-dev.yml`
- Runbook: `quodsi/infrastructure/docs/040-deployment-runbook.md`

### Deployment Frequency
- **Infrastructure**: Rarely (new environments or resource changes)
- **Backend (FastAPI)**: Frequently (on push to main; via monorepo workflow)
- **Lucid Extension**: Frequently (on extension/UI changes)