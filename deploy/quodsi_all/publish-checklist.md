# Publish Checklist

## Pre-publish

- [ ] Update `QUODSI_VERSION` and `QUODSIM_VERSION` in `shared/src/constants/version.ts`
- [ ] Update `__version__` in `quodsim/quodsim/__init__.py` to match
- [ ] Update `"version"` in all `manifest*.json` files to 1 day before target (Lucid auto-increments)
  - `manifest.json`, `manifest_dev.json`, `manifest_test.json`, `manifest_prod.json`, `manifest_local.json`
- [ ] Add version transformation in `shared/src/versioning/transformations/`
  - Determine which transform files need entries (Activity, Connector, Entity, Generator, Resource, Model)
  - Use identity transform if no schema changes for that element type
- [ ] Build shared library: `npm run build -w @quodsi/shared`
- [ ] Verify all builds pass (extension, React)

## Simulation engine (Azure Batch)

- [ ] Run `python make_zip.py` in `quodsim/` to create `quodsim_v{VERSION}.zip`
- [ ] Upload zip to the Azure Batch application
- [ ] Update Batch pool to use the new application version

## Backend API (FastAPI)

> The API is deployed from the **monorepo** via GitHub Actions, not from this directory.

- [ ] Confirm `quodsi_api/**` changes are merged to `main` — workflow `deploy-api-dev.yml` runs automatically
- [ ] Watch the workflow: GitHub → Actions → "Deploy API (dev)"
- [ ] Smoke test: `curl https://ca-quodsi-dev-api.<env-default-domain>.eastus2.azurecontainerapps.io/health` → expect HTTP 200
- [ ] For test/prd: not yet provisioned — TBD

## LucidChart extension

- [ ] Run: `.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment Dev`
  - Creates `package_v{VERSION}.zip` and git tag `lucid/v{VERSION}/Dev`
- [ ] Upload `package_v{VERSION}.zip` to LucidChart developer portal

## Post-publish

- [ ] Verify extension loads in LucidChart
- [ ] Verify model creation and simulation submission work
- [ ] Verify existing models auto-upgrade to new version
- [ ] Spot-check Application Insights "Live Metrics" for the API (`ai-quodsi-dev`) — no spike in 5xx
