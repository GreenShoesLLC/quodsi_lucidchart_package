# Application Deployment

This directory contains scripts for deploying application code to existing Azure infrastructure.

## Overview

The `/deploy/` directory focuses on **application deployment** (frequent operation), while `/infrastructure/` focuses on **infrastructure provisioning** (rare operation).

## Directory Structure

```
/deploy/
├── azure-functions/       # Deploy Azure Function App code
├── lucid-package/         # Build and bundle Lucid extension
├── react/                 # Build React application (optional)
├── deploy-function.bat    # Convenience wrapper for function deployment
└── README.md             # This file
```

## Quick Start

### Deploy Function App Code

The most common deployment task is updating the Azure Function App code:

```bash
# Windows (uses convenience wrapper)
deploy-function.bat dev

# PowerShell (more options)
.\deploy\azure-functions\deploy-function-code.ps1 -Environment dev
```

### Build Lucid Extension Package

When you've made changes to the extension or React UI:

```bash
# Build for production
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment PRD

# Build for test
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment TST

# Build for dev
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment Dev
```

Then upload the resulting `package.zip` to the LucidChart developer portal.

## Component Details

### Azure Functions (`/azure-functions/`)

Deploys the data connector code to Azure Function Apps.

**Scripts:**
- `deploy-function-code.ps1` - PowerShell deployment script (recommended)
- `deploy-function-code.bat` - Batch script wrapper
- `verify-deployment-ready.ps1` - Pre-deployment validation

**Usage:**
```powershell
# Deploy to specific environment
.\deploy\azure-functions\deploy-function-code.ps1 -Environment dev

# Deploy without confirmation prompts
.\deploy\azure-functions\deploy-function-code.ps1 -Environment tst -Force

# Skip build steps (use with caution)
.\deploy\azure-functions\deploy-function-code.ps1 -Environment prd -SkipBuild

# Deploy to all environments sequentially
.\deploy\azure-functions\deploy-function-code.ps1 -Environment all
```

**Prerequisites:**
- Azure CLI installed and logged in
- Azure Functions Core Tools installed
- Function App infrastructure already provisioned
- Valid node_modules (~67MB) in the function app directory

**See also:** `azure-functions/README.md` for detailed information

### Lucid Package (`/lucid-package/`)

Builds and bundles the LucidChart extension for deployment to the Lucid developer portal.

**Scripts:**
- `build-bundle.ps1` - Main build and bundle orchestration script

**Usage:**
```powershell
# Build for production (default - skips separate React build)
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment PRD

# Build with separate React build (optional)
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment Dev -RunReactBuild
```

**What it does:**
1. Sets environment-specific variables
2. (Optionally) Runs separate React build
3. Selects correct manifest file for environment
4. Executes `npx lucid-package bundle`
5. Restores original manifest
6. Creates `package.zip` at project root

**Output:** `package.zip` at project root

**See also:** `lucid-package/README.md` for detailed information

### React (`/react/`)

Standalone React application build (typically not needed).

**Scripts:**
- `build-react.ps1` - Standalone React build script

**Usage:**
```powershell
# Build React app for specific environment
.\deploy\react\build-react.ps1 -TargetEnvironment Dev
```

**Note:** The Lucid package bundler (`npx lucid-package bundle`) performs its own React build internally using the environment variables set by `build-bundle.ps1`. You typically don't need to run this separately.

**See also:** `react/README.md` for detailed information

## Deployment Workflows

### Complete Deployment Workflow

When deploying a full release:

```bash
# 1. Deploy backend (Function App code)
.\deploy\azure-functions\deploy-function-code.ps1 -Environment prd

# 2. Build frontend (Lucid extension)
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment PRD

# 3. Upload package.zip to Lucid developer portal (manual step)
```

### Backend-Only Deployment

When you've only changed backend code:

```bash
.\deploy\deploy-function.bat prd
```

### Frontend-Only Deployment

When you've only changed extension or UI code:

```bash
.\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment PRD
# Then upload package.zip to Lucid portal
```

## Environment Variables

Each deployment target uses environment-specific configuration:

| Environment | Function App | Data Connector URL |
|-------------|--------------|-------------------|
| **dev** | `dev-quodsi-func-v1` | `https://dev-quodsi-func-v1.azurewebsites.net/api/` |
| **tst** | `tst-quodsi-func-v1` | `https://tst-quodsi-func-v1.azurewebsites.net/api/` |
| **prd** | `prd-quodsi-func-v1` | `https://prd-quodsi-func-v1.azurewebsites.net/api/` |
| **local** | N/A | `http://localhost:7071/api/` |

## Common Issues

### Function Deployment Fails

**Issue:** "node_modules size is only XX MB - this seems too small!"

**Cause:** Function app is likely in root `package.json` workspaces array

**Solution:**
1. Remove function app from root `package.json` workspaces
2. Delete `node_modules` in function app directory
3. Run `npm install` in function app directory
4. Verify size is ~67MB

### Lucid Bundle Fails

**Issue:** "Manifest file not found"

**Cause:** Missing environment-specific manifest file

**Solution:** Ensure `manifest_dev.json`, `manifest_test.json`, and `manifest_prod.json` exist at project root

### Wrong Environment Deployed

**Issue:** Extension connects to wrong backend

**Cause:** Wrong manifest or environment variables

**Solution:**
1. Check which manifest was used during build
2. Verify `package.zip` was built with correct `-TargetEnvironment`
3. Rebuild with correct environment if needed

## Related Documentation

- **Infrastructure Provisioning**: See `/infrastructure/README.md`
- **Project Overview**: See `/CLAUDE.md`
- **Development Guide**: See `/GETTING_STARTED.md`

## Support

For deployment issues:
1. Check component-specific README in subdirectories
2. Review troubleshooting sections in component READMEs
3. Check Azure portal for infrastructure status
4. Review deployment logs and error messages
