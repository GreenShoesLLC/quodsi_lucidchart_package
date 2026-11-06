# Publish Checklist

## Pre-publish

- [ ] Update `MODEL_SCHEMA_VERSION` (document schema) and/or `ENGINE_VERSION` (Batch engine
      build) in `quodsi_shared/src/constants/version.ts` — renamed from `QUODSI_VERSION` /
      `QUODSIM_VERSION` on 2026-08-06, and the file moved to the monorepo
  - These are now INDEPENDENT: a schema change bumps only `MODEL_SCHEMA_VERSION`; a new
    engine image bumps only `ENGINE_VERSION`. Do not assume they move together.
  - `build-bundle.ps1` reads `MODEL_SCHEMA_VERSION` for the package filename and git tag.
- [ ] Update `__version__` in `quodsim/quodsim/__init__.py` to match `ENGINE_VERSION`
      (engine only — it does not track the schema version)
- The manifest `"version"` needs no hand edit: `build-bundle.ps1` overwrites it with the release's Quodsi version.
- [ ] Add version transformation in the monorepo's `quodsi_shared/src/versioning/transformations/`
  - Determine which transform files need entries (Activity, Connector, Entity, Generator, Resource, Model)
  - Use identity transform if no schema changes for that element type
- [ ] Build shared library: `npm run build -w @quodsi/shared`
- [ ] Verify all builds pass (extension, React)

## Simulation engine (Azure Batch)

- [ ] Ensure the runner image for `ENGINE_VERSION` (`quodsi_shared/src/constants/version.ts` on the release branch) exists in ACR (`crquodsim/quodsim-runner`). There is no bicep engine pin: the engine moves with the API deploy, which refuses an engine with no runner image

## Backend API (FastAPI)

> The API is deployed from the **monorepo** via GitHub Actions, not from this directory.

- [ ] Confirm `quodsi_api/**` changes are merged to `main` — workflow `deploy-api-dev.yml` runs automatically
- [ ] Watch the workflow: GitHub → Actions → "Deploy API (dev)"
- [ ] Smoke test: `curl https://ca-quodsim-dev-api.nicesand-882b0444.westus.azurecontainerapps.io/health` → expect HTTP 200
- [ ] Test: `curl https://ca-quodsim-test-api.ambitiouspond-d8683d4f.westus.azurecontainerapps.io/health` → expect HTTP 200. Prd: `curl https://<ca-quodsim-prd-api FQDN>/health` (live since 2026-10-04; FQDN from `az containerapp show -n ca-quodsim-prd-api -g rg-quodsim-prd`)

## LucidChart extension

- [ ] Before uploading, confirm the target env's API **and** Storage CORS admit this package's
      extension origin (`https://<32 hex>.lucidextensions.app`). The compiled Studies/Advisor
      modals call the API directly, so without it they fail in the browser. The lists are
      `corsOrigins` / `corsOriginRegex` in the monorepo's
      `infrastructure/bicep/env/<env>.bicepparam` (Storage CORS reuses `corsOrigins` only, not
      the regex). Deploy the bicep first, then upload.
- [ ] Run: `.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment Dev`
  - Creates `package_v{VERSION}.zip` and git tag `lucid/v{VERSION}/Dev`
- [ ] Upload `package_v{VERSION}.zip` to LucidChart developer portal

## Post-publish

- [ ] Verify extension loads in LucidChart
- [ ] Verify model creation and simulation submission work
- [ ] Verify existing models auto-upgrade to new version
- [ ] Spot-check Application Insights "Live Metrics" for the API (`ai-quodsi-dev`) — no spike in 5xx

## Marketplace submission

The Marketplace app is a second Lucid app id, separate from the private prd app. Both run the same package and API.

- [ ] In the monorepo, confirm `release/prd` is at the release you want to ship. Build only from its tip: `.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment PRD -RunReactBuild`
- [ ] Add the new app's package id to `editorextensions/quodsi_editor_extension/src/core/apiBaseUrl.ts` (next to the private prd id `d38c7ced-35e8-4962-a622-1d3fa480ab58`), and rebuild
- [ ] Add the new app's origin (`https://<32 hex>.lucidextensions.app`) to `corsOrigins` in the monorepo's `infrastructure/bicep/env/prd.bicepparam`, and deploy the bicep first. Storage CORS reuses `corsOrigins`
- [ ] Open the Zendesk ticket with Lucid for the Marketplace listing
- [ ] Then submit the package in the developer portal

## When Lucid publishes

Do this when Lucid has approved and published a package, not when you upload it. The Lucid floor (`quodsi_api/app/host_floors.json`) records what Lucid users have, so it moves only after they have it.

- [ ] Edit `quodsi_api/app/host_floors.json` in the monorepo: set the lucid entry's `quodsiVersion` (the package's Quodsi version), `modelSchemaVersion` and `outputSchemaMajor` to the published package's values
- [ ] Regenerate `quodsi_api/tests/fixtures/host_floors/lucid.json` in the same change, and run `./venv/Scripts/python -m pytest tests/test_host_floors.py` from `quodsi_api`
- [ ] Merge to `main` and promote through `release/dev`, `release/test` and `release/prd`. Writer capabilities with `lucid_floor_since` at or below the new floor turn on in prd with that deploy
- [ ] `MIN_LUCID_CLIENT_VERSION` may be raised only to a version at or below the new floor's `quodsiVersion`; the API deploy refuses anything higher

## Retire the private prd app

Do this once the Marketplace app is live and the floor has moved to a Marketplace package.

- [ ] Tell the private app's users to install the Marketplace app
- [ ] Check that a document saved under the private app opens and runs under the Marketplace app
- [ ] On the retirement date, remove `d38c7ced-35e8-4962-a622-1d3fa480ab58` from `apiBaseUrl.ts` and its origin from `corsOrigins` in `infrastructure/bicep/env/prd.bicepparam`; deploy the bicep and publish the package
