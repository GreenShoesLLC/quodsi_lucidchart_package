# Publish Checklist

## Pre-Publish

- [ ] Update `QUODSI_VERSION` and `QUODSIM_VERSION` in `shared/src/constants/version.ts`
- [ ] Update `__version__` in `quodsim/quodsim/__init__.py` to match
- [ ] Update `"version"` in all `manifest*.json` files to 1 day before target (Lucid auto-increments)
  - manifest.json, manifest_dev.json, manifest_test.json, manifest_prod.json, manifest_local.json
- [ ] Add version transformation in `shared/src/versioning/transformations/`
  - Determine which transform files need entries (Activity, Connector, Entity, Generator, Resource, Model)
  - Use identity transform if no schema changes for that element type
- [ ] Build shared library: `npm run build -w @quodsi/shared`
- [ ] Verify all builds pass (extension, React, data connector)

## Simulation Engine (Azure Batch)

- [ ] Run `python make_zip.py` in quodsim/ to create `quodsim_v{VERSION}.zip`
- [ ] Upload zip to Azure Batch application
- [ ] Update Batch pool to use new application version

## Deploy to Environment

### Lucid Extension
- [ ] Run: `.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment Dev`
  - Creates `package_v{VERSION}.zip` and git tag `lucid/v{VERSION}/Dev`
- [ ] Upload `package_v{VERSION}.zip` to LucidChart developer portal

### Azure Function (Data Connector)
- [ ] Run: `.\deploy\deploy-function.bat dev`
  - Deploys code and creates git tag `func/v{VERSION}/dev`

## Post-Publish

- [ ] Verify extension loads in LucidChart
- [ ] Verify model creation and simulation submission work
- [ ] Verify existing models auto-upgrade to new version
