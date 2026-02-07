# Quodsi Full Deployment

Deploys Azure Functions and builds the Lucid extension package in one step.

## Deploy to Each Environment

```powershell
# Dev
.\deploy\quodsi_all\deploy-all.ps1 -Environment Dev -Force

# Test
.\deploy\quodsi_all\deploy-all.ps1 -Environment TST -Force

# Production
.\deploy\quodsi_all\deploy-all.ps1 -Environment PRD -Force
```

## Partial Deploys

```powershell
# Azure Functions only
.\deploy\quodsi_all\deploy-all.ps1 -Environment Dev -Force -SkipLucidBuild

# Lucid package only
.\deploy\quodsi_all\deploy-all.ps1 -Environment Dev -SkipAzureDeploy
```

## Flags

| Flag | Description |
|---|---|
| `-Environment` | Required. `Dev`, `TST`, or `PRD` |
| `-Force` | Skip Azure deployment confirmation prompts |
| `-SkipAzureDeploy` | Skip Azure Function deployment |
| `-SkipLucidBuild` | Skip Lucid package build |

After the build completes, upload `package.zip` to the Lucid developer portal.
