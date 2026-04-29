# Release Checklist

This folder previously held a unified deploy script (`deploy-all.ps1`) that combined Azure Function code deployment with the LucidChart bundle build. The Function half is now obsolete (replaced by `quodsi_api` deployed via the monorepo's GitHub Actions workflow), so the orchestrator was deleted.

What remains here is the **release checklist** — the pre/post-publish steps for cutting a new LucidChart extension release.

See [`publish-checklist.md`](./publish-checklist.md).

## Routine release (frontend-only)

```powershell
# 1. Build the package for the target environment
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment Dev

# 2. Upload package_v{VERSION}.zip to the LucidChart developer portal (manual)
```

For the API backend, see the monorepo workflow `deploy-api-dev.yml`.
