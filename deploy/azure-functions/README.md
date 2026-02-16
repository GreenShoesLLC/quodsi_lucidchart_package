# Azure Function Deployment

Deploy the Quodsi data connector to Azure environments.

## Prerequisites

- Azure CLI installed and logged in (`az login`)
- Node.js 20+ installed
- Azure Functions Core Tools installed (only required with `-UseFunc`)

## Deploy Method

The default deploy method is **az zip deploy** (`az functionapp deployment source config-zip`). This packages `dist`, `node_modules`, `host.json`, `package.json`, and `package-lock.json` into a zip and deploys via the Azure CLI.

The legacy `func azure functionapp publish` method is available via the `-UseFunc` flag. Note: func CLI v4.7.0 has a known bug (`Value cannot be null. (Parameter 'input')`) that may cause deployments to fail.

## Quick Start (from repo root)

### Development

```powershell
# Dry run (validate everything, don't deploy)
.\deploy\azure-functions\deploy-function-code.ps1 -Environment dev -SkipDeploy

# Deploy (default: az zip deploy)
.\deploy\azure-functions\deploy-function-code.ps1 -Environment dev -Force

# Deploy using legacy func publish
.\deploy\azure-functions\deploy-function-code.ps1 -Environment dev -Force -UseFunc
```

### Test

```powershell
# Dry run
.\deploy\azure-functions\deploy-function-code.ps1 -Environment tst -SkipDeploy

# Deploy
.\deploy\azure-functions\deploy-function-code.ps1 -Environment tst -Force
```

### Production

```powershell
# Dry run
.\deploy\azure-functions\deploy-function-code.ps1 -Environment prd -SkipDeploy

# Deploy (will prompt for confirmation without -Force)
.\deploy\azure-functions\deploy-function-code.ps1 -Environment prd
```

### All Environments

```powershell
.\deploy\azure-functions\deploy-function-code.ps1 -Environment all -Force
```

## Options

| Flag | Description |
|------|-------------|
| `-Force` | Skip confirmation prompt |
| `-SkipBuild` | Skip clean/build steps (use existing dist/) |
| `-SkipDeploy` | Dry run: run all checks and build, but don't deploy |
| `-UseFunc` | Use legacy `func azure functionapp publish` instead of az zip deploy |

## Verification

Run pre-deployment checks without deploying:

```powershell
.\deploy\azure-functions\verify-deployment-ready.ps1
```

This checks: project structure, node_modules size, critical Azure packages, .funcignore config, and build output.

## Troubleshooting

### az zip deploy fails

1. Verify your Azure login is current: `az account show`
2. Try the legacy method as a fallback: add `-UseFunc` to your deploy command
3. If functions don't appear after deployment, verify node_modules is complete (~60MB):
   ```powershell
   .\deploy\azure-functions\verify-deployment-ready.ps1
   ```

### func publish fails (legacy method)

If `func azure functionapp publish` fails with a cryptic error:

1. The deploy script runs with `--verbose` — check the output for the actual .NET error
2. Verify your Azure login is current: `az account show`
3. Try without `-UseFunc` (default az zip deploy) — this avoids func CLI bugs
4. Try deploying via zip push as a fallback:
   ```powershell
   cd dataconnectors\quodsi_data_connector_lucidchart_v2
   func azure functionapp publish dev-quodsi-func-v1 --build remote
   ```
