# Azure Function Deployment Scripts

These scripts automate the deployment of the Quodsi data connector function app to different Azure environments (dev, test, prod).

## Available Scripts

| Script | Description |
|--------|-------------|
| `deploy-function.bat` | Batch script for Windows users |
| `Deploy-Function.ps1` | PowerShell script with additional features |

## Prerequisites

1. Azure CLI installed and logged in
2. Azure Functions Core Tools installed
3. Node.js and npm installed
4. Function Apps deployed using the ARM templates

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

## How It Works

1. The script identifies the target environment and function app
2. Validates that the function app exists
3. Changes to the project directory
4. Runs npm clean and build commands
5. Deploys the built code to the function app
6. Verifies the deployed functions

## Troubleshooting

If you encounter issues:

1. Make sure the Function Apps are already deployed via ARM templates
2. Check you have sufficient permissions to access the Function Apps
3. Verify your Azure CLI login session is active
4. Check for any build errors in the npm build step

For detailed logs, use the `-Verbose` flag with the PowerShell script.
