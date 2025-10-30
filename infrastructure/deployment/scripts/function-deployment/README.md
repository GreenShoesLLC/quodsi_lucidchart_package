# Azure Function Deployment Scripts

These scripts automate the deployment of the Quodsi data connector function app to different Azure environments (dev, test, prod).

## Available Scripts

| Script | Description |
|--------|-------------|
| `deploy-function.bat` | Batch script for Windows users |
| `Deploy-Function.ps1` | PowerShell script with additional features |
| `Verify-DeploymentReady.ps1` | Verification script to check deployment readiness |

## Prerequisites

1. Azure CLI installed and logged in
2. Azure Functions Core Tools installed
3. Node.js and npm installed
4. Function Apps deployed using the ARM templates
5. **IMPORTANT**: The function app directory (`dataconnectors/quodsi_data_connector_lucidchart_v2`) must NOT be listed in the root `package.json` workspaces array
   - This ensures the function app has its own complete `node_modules` folder (~67MB)
   - If it's in workspaces, dependencies get hoisted to root and won't be deployed

## Usage

### Batch Script

#### From Command Prompt (CMD)

Deploy to development (default):
```batch
deploy-function.bat
```

Deploy to a specific environment:
```batch
deploy-function.bat dev
deploy-function.bat tst
deploy-function.bat prd
```

#### From PowerShell

When running batch files in PowerShell, you need to use one of these methods:

Option 1: Use the `./` or `.\` prefix (recommended):
```powershell
.\deploy-function.bat dev
```

Option 2: Use `cmd /c` to execute through command prompt:
```powershell
cmd /c deploy-function.bat dev
```

Option 3: Use the full path:
```powershell
& "C:\_source\Greenshoes\quodsi_lucidchart_package\infrastructure\deployment\scripts\function-deployment\deploy-function.bat" dev
```

### PowerShell Script

Deploy to development (default):
```powershell
.\Deploy-Function.ps1
```

Deploy to a specific environment:
```powershell
.\Deploy-Function.ps1 -Environment dev
.\Deploy-Function.ps1 -Environment tst
.\Deploy-Function.ps1 -Environment prd
```

Deploy to all environments:
```powershell
.\Deploy-Function.ps1 -Environment all
```

### Additional PowerShell Parameters

- `-Force`: Skip confirmation prompts
- `-SkipBuild`: Skip the clean and build steps
- `-Verbose`: Show more detailed output during deployment (standard PowerShell parameter)

Example:
```powershell
.\Deploy-Function.ps1 -Environment prd -Force -Verbose
```

### Verification Script

Before deploying, you can run the verification script to check if everything is configured correctly:

```powershell
.\Verify-DeploymentReady.ps1
```

This script checks:
- ✓ node_modules folder exists and has proper size (~67MB)
- ✓ Critical Azure packages are installed
- ✓ Function app is NOT in workspace configuration
- ✓ .funcignore is properly configured
- ✓ TypeScript output structure is correct
- ✓ dist folder has proper structure
- ✓ All required files present

The script will output a clear pass/fail status and provide guidance on fixing any issues found.

**Recommended**: Run this script before deploying to catch configuration issues early.

## Important: node_modules Must Be Deployed

**Azure Functions requires all dependencies to be deployed.** This is critical for successful deployment:

### Why node_modules Must Be Included

- The function app runs in Azure without access to npm registry
- All dependencies must be physically present in the deployment package
- Without node_modules, functions will fail to start with "cannot find module" errors

### Verifying node_modules Before Deployment

Before deploying, verify your node_modules is properly configured:

```bash
# Navigate to function app directory
cd dataconnectors/quodsi_data_connector_lucidchart_v2

# Check if node_modules exists and has proper size
# Should be ~50-70MB, NOT 1-2MB
ls -lh node_modules | head

# On Windows PowerShell:
Get-ChildItem node_modules | Measure-Object -Property Length -Sum

# Verify Azure packages are installed
ls node_modules/@azure
```

**Expected values:**
- node_modules folder size: **~67MB** (not 1-2MB)
- Number of packages: **~170+** packages
- Azure packages: Should see @azure/functions, @azure/batch, @azure/storage-blob, etc.

### .funcignore Configuration

The `.funcignore` file controls what gets excluded from deployment:

```
*.js.map              # Source maps (not needed in production)
*.ts                  # TypeScript source files (only need compiled .js)
.git*                 # Git files
.vscode               # Editor config
local.settings.json   # Local development settings
test                  # Test files
tsconfig.json         # TypeScript config
node_modules/.bin     # Binary symlinks (causes Windows deployment issues)
```

**IMPORTANT**: Notice that `node_modules` itself is NOT in .funcignore - only `node_modules/.bin` is excluded (due to Windows symlink issues during packaging).

### Deployment Package Size

A properly configured deployment should result in:
- **Compressed package**: ~20-30MB
- **Uncompressed**: ~80-100MB

If your deployment package is only 650KB, node_modules is NOT being included!

## How It Works

1. The script identifies the target environment and function app
2. Validates that the function app exists
3. Changes to the project directory
4. Runs npm clean and build commands
5. **Packages dist/ folder AND node_modules/ (except .bin)**
6. Deploys the package to the function app
7. Verifies the deployed functions

## Troubleshooting

### Functions Not Appearing in Azure Portal

**Symptom**: Deployment succeeds but no functions show up in Azure Portal

**Most Common Cause**: node_modules not included in deployment

**Solution**:
1. Check node_modules size in function app directory:
   ```bash
   cd dataconnectors/quodsi_data_connector_lucidchart_v2
   du -sh node_modules  # Should show ~67MB, not 1-2MB
   ```

2. Verify function app is NOT in root package.json workspaces:
   ```bash
   cat ../../package.json | grep -A 5 "workspaces"
   # Should NOT see "dataconnectors/quodsi_data_connector_lucidchart_v2"
   ```

3. If function app was in workspaces:
   ```bash
   # Remove it from root package.json workspaces array
   # Delete function app node_modules
   rm -rf node_modules

   # Reinstall dependencies (will now install locally, not hoisted)
   npm install

   # Verify size is now ~67MB
   du -sh node_modules
   ```

4. Redeploy after fixing node_modules

### Deployment Package Too Small

**Symptom**: Deployment zip is only ~650KB instead of ~20MB+

**Cause**: node_modules is missing or nearly empty

**Solution**: See "Functions Not Appearing" above

### "Cannot Find Module" Errors in Azure

**Symptom**: Functions fail at runtime with module not found errors

**Cause**: Dependencies not deployed to Azure

**Solution**: Ensure node_modules is included and redeploy

### "Sync Triggers" Error During Deployment

**Symptom**: `Error calling sync triggers (BadRequest)` at end of deployment

**Note**: This is usually a benign error. Check if functions were actually deployed:

```bash
az functionapp function list --name <function-app-name> --resource-group <resource-group> -o table
```

If all 7 functions are listed, the deployment succeeded despite the error.

**Workaround**: Ensure function app is started before deployment:
```bash
az functionapp start --name <function-app-name> --resource-group <resource-group>
```

### File Access Error on node_modules/.bin

**Symptom**: `The file cannot be accessed by the system: 'node_modules\.bin\...'`

**Cause**: Windows has trouble with symlinks in .bin folder

**Solution**: Ensure `node_modules/.bin` is in `.funcignore` (already configured)

### General Troubleshooting Steps

1. Make sure the Function Apps are already deployed via ARM templates
2. Check you have sufficient permissions to access the Function Apps
3. Verify your Azure CLI login session is active
4. Check for any build errors in the npm build step
5. **Verify node_modules exists and is ~67MB**
6. Check that .funcignore does NOT exclude `node_modules` (only `node_modules/.bin`)

For detailed logs, use the `-Verbose` flag with the PowerShell script.
