# Infrastructure (legacy)

> **The active infrastructure-as-code lives in the monorepo:**
> [`quodsi/infrastructure/`](https://github.com/GreenShoesLLC/quodsi/tree/main/infrastructure)
>
> Local path on dev machines: `C:\_source\quodsi\infrastructure\`

## What this folder still contains

This folder holds **reference-only** ARM templates and PowerShell utilities for resources that were provisioned before the monorepo + Bicep migration. Nothing here is actively deployed against live Azure resources today.

| Subfolder | Status | Notes |
|---|---|---|
| `batch/` | Reference only | Templates that originally created `quodsisharedbatch01` and the per-env Batch pools. Live resources still exist; do **not** re-deploy these templates. Future plan: translate to Bicep in `quodsi/infrastructure/bicep/modules/batch.bicep`. |
| `storage/` | Reference only | Templates that originally created `{env}quodsist01` storage accounts. Live resources still exist; do **not** re-deploy. Future plan: translate to Bicep in `quodsi/infrastructure/bicep/modules/storage.bicep`. |
| `scripts/` | Reference only | Generic ARM deployment utilities (validate / what-if / deploy). Pattern was carried into `quodsi/infrastructure/scripts/Deploy-Bicep.ps1` (TODO). |
| `extract-*.ps1` | Stale | Helpers that once snapshotted live resources into `extracted-config/` (now deleted because the snapshots contained hardcoded secrets). |

## What was removed (2026-04-27)

- `function-apps/` — entire subtree. The Azure Functions backend was replaced by `quodsi_api` (FastAPI). All template files and deploy scripts here referenced resources that no longer exist.
- `extracted-config/` — entire subtree. Auto-generated snapshots of live Azure resources, including a `combined-template.bicep` that committed hardcoded storage keys, SAS URLs, and Function App connection strings. Security risk to retain; functionally superseded by the new monorepo Bicep modules.

## When to delete this folder entirely

Once `batch/` and `storage/` have been re-implemented as Bicep modules in the monorepo (see `quodsi/infrastructure/docs/050-future-hardening.md`), the entire contents of this folder become redundant and the folder can be deleted.
