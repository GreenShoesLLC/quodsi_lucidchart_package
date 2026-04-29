# LucidChart Extension Deployment

This directory builds and packages the **LucidChart extension** for upload to the Lucid developer portal.

> **Backend (FastAPI) deployment lives in the monorepo:**
> See `quodsi/.github/workflows/deploy-api-dev.yml` and `quodsi/infrastructure/docs/040-deployment-runbook.md`. The legacy Azure Functions data connector is being retired in favor of `quodsi_api`.

## Directory structure

```
/deploy/
├── lucid-package/             # Build + bundle the LucidChart extension
│   ├── build-bundle.ps1
│   └── README.md
├── react/                     # Standalone React app build (rarely needed)
│   ├── build-react.ps1
│   └── README.md
├── quodsi_all/
│   └── publish-checklist.md   # Pre/post-release checklist
└── README.md                  # this file
```

## Quick start

### Build the LucidChart extension package

```powershell
# Dev
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment Dev

# Test
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment TST

# Production
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment PRD
```

Then upload the resulting `package.zip` (at the repo root) to the LucidChart developer portal.

### React standalone build (rarely needed)

The Lucid bundler runs the React build internally with the right env vars; you almost never need to run this separately.

```powershell
.\deploy\react\build-react.ps1 -TargetEnvironment Dev
```

## What was removed (2026-04-27)

- `azure-functions/` (entire subtree) and `deploy-function.bat` — the Azure Functions backend has been replaced by `quodsi_api` (FastAPI). API deploys are now handled by the GitHub Actions workflow `deploy-api-dev.yml` in the monorepo.
- `quodsi_all/deploy-all.ps1` — the orchestrator referenced `azure-functions/verify-deployment-ready.ps1` and `azure-functions/deploy-function-code.ps1`, both removed. Its only remaining useful step (Lucid bundle build) is already a one-liner via `lucid-package/build-bundle.ps1`.

## Backend environment URLs

The LucidChart extension manifests still point at the legacy Function App URLs (`{env}-quodsi-func-v1.azurewebsites.net`). When the extension is migrated to call `quodsi_api` directly, those manifests need to be updated to the new Container App URL:

| Environment | New (Container Apps) |
|---|---|
| Dev | `https://ca-quodsi-dev-api.<env-default-domain>.eastus2.azurecontainerapps.io` |
| Test | TBD (test environment not yet provisioned) |
| Prd | TBD (prd environment not yet provisioned) |

Tracking the manifest migration as a separate, larger workstream (it touches manifest schema, data connector wiring, and the extension's own data layer).

## Lucid bundle workflow detail

`build-bundle.ps1` does:

1. Sets `REACT_APP_*` env vars for the target environment.
2. Builds `@quodsi/shared`.
3. Cleans build artifacts.
4. Swaps the active manifest (`manifest_dev.json` / `manifest_test.json` / `manifest_prod.json`) into `manifest.json`.
5. Runs `npx lucid-package build-editor-extension` and `npx lucid-package bundle`.
6. Creates a versioned `package_v{VERSION}.zip` and a corresponding git tag.
7. Restores the original manifest.

After upload to the Lucid developer portal, complete the post-publish checklist in `quodsi_all/publish-checklist.md`.

## Common issues

**Manifest file not found** — ensure `manifest_dev.json`, `manifest_test.json`, and `manifest_prod.json` exist at the repo root.

**Wrong environment deployed** — verify `package.zip` was built with the correct `-TargetEnvironment`. Rebuild if uncertain.

**Bundle fails on `@quodsi/shared` import errors** — the shared library must build first. Run `npm run build -w @quodsi/shared` and retry.
