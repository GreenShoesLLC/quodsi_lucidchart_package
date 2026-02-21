# Lucid Package Bundle Script

## Quick Start

Copy and paste the command for your target environment:

**Development (Dev):**
```powershell
C:\_source\quodsi\quodsi_lucidchart_package\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment Dev
```

**Test (TST):**
```powershell
C:\_source\quodsi\quodsi_lucidchart_package\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment TST
```

**Production (PRD):**
```powershell
C:\_source\quodsi\quodsi_lucidchart_package\deploy\lucid-package\build-bundle.ps1 -TargetEnvironment PRD
```

**Output:** `package.zip` in project root → Upload to LucidChart developer portal

---

## Overview

This PowerShell script orchestrates the process of preparing environment variables and bundling the Lucidchart package.

**Core Workflow:**
1. Sets required environment variables (`REACT_APP_...`) based on the specified `TargetEnvironment`
2. Backs up and swaps manifest files for the target environment
3. Executes `npx lucid-package@latest bundle` from the package root
4. Restores the original manifest.json
5. Produces `package.zip`

## Manifest Selection by Environment

| Environment | Manifest Used | Data Connector URL |
|-------------|---------------|-------------------|
| Dev | manifest_dev.json | https://dev-quodsi-func-v1.azurewebsites.net/api/dataConnector/ |
| TST | manifest_test.json | https://tst-quodsi-func-v1.azurewebsites.net/api/dataConnector/ |
| PRD | manifest_prod.json | https://prd-quodsi-func-v1.azurewebsites.net/api/dataConnector/ |
| (none) | manifest.json | http://localhost:7071/api/dataConnector/ (local dev) |

## Parameters

- **`-TargetEnvironment`** (Mandatory): `Dev`, `TST`, or `PRD`
- **`-RunReactBuild`** (Optional): Forces a separate React build before bundling (usually not needed)

## Troubleshooting

**Use PowerShell 7 (pwsh), not Windows PowerShell:**
The script requires PowerShell 7. Windows PowerShell (5.x) may fail with parsing errors due to character encoding differences.
```powershell
# Use pwsh (PowerShell 7), not powershell
pwsh -ExecutionPolicy Bypass -File "C:\_source\quodsi\quodsi_lucidchart_package\deploy\lucid-package\build-bundle.ps1" -TargetEnvironment Dev
```

**Execution Policy errors:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
```

**Verify manifest files exist:**
```powershell
Get-ChildItem C:\_source\quodsi\quodsi_lucidchart_package\manifest*.json
```

**Check deployed package URL:**
- Extract `package.zip`
- Open `editorextensions/quodsi_editor_extension/manifest.json`
- Verify `callbackBaseUrl` matches target environment
