# @quodsi/lucid-shared

The Lucid-only layer shared by the LucidChart editor extension
(`editorextensions/quodsi_editor_extension`) and its React panel
(`quodsim-react`). It is a private workspace package, consumed through the
npm workspace — never published.

Everything platform-agnostic — the domain model (`ModelDefinition`,
`Activity`, `Resource`, ...), validation rules and `ModelValidationService`,
versioning and upgrade transforms, the wire document and its serializer — lives in the
monorepo's `@quodsi/shared` (`../../quodsi_shared`). This package depends on it
and re-exports the names the extension and panel pull through
`@quodsi/lucid-shared` -- all of them in `src/index.ts`; no other file here
exists only to re-export core. A consumer may also import from `@quodsi/shared`
directly; add a re-export here only when a Lucid consumer needs it.

## What lives here

| Directory | Contents |
|---|---|
| `src/quodsi-messaging` | The postMessage protocol between the extension and its panels/modals: `EnvelopeBase`, `EnvelopeMessageType`, `isEnvelope`, and the few payload types both sides share. See its README. |
| `src/serialization` | `parsePageTranslate`, the page-SVG translate Lucid's `getSvg()` applies. The wire document (`modelDefinitionToCleanDocument`, the `ISerialized*` types) is in `@quodsi/shared`. |
| `src/types` | Lucid storage and panel view types: `ModelRootProjection`, `EditorReferenceData`, `StoredResourceRecord`, swimlane data, selection state, conversion results, devtools payloads. |
| `src/core/logging` | Legacy `QuodsiLogger` / `ComponentLogger` (see the repo `CLAUDE.md`; new code uses `getLogger`). |
| `src/embed` | Helpers for the Studio embed relay (`buildRelayConnectors`). |
| `src/utils` | `ensureBaselineScenario` (Lucid scenario storage). |

## Build and test

```bash
npm run build        # tsc -> dist/ (consumers resolve the package from dist)
npm run clean        # removes dist/ and tsconfig.tsbuildinfo
npm test             # jest
npm run test:update-snapshots   # regenerate serialization fixtures
```

Build `@quodsi/shared` first, then this package. Tests that import
`@quodsi/lucid-shared` resolve it through the workspace link to `dist/`, so
rebuild before running them after a source change.
