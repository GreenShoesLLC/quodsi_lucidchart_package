# Azure Function Deployment

Deploy the Quodsi data connector to Azure environments.

## Prerequisites

- Azure CLI installed and logged in
- Azure Functions Core Tools installed
- Node.js 20+ installed

## Usage

From the `deploy/azure-functions/` directory:

```powershell
.\deploy-function-code.ps1 -Environment <env>
```

| Environment | Command |
|-------------|---------|
| Development | `.\deploy-function-code.ps1 -Environment dev` |
| Test | `.\deploy-function-code.ps1 -Environment tst` |
| Production | `.\deploy-function-code.ps1 -Environment prd` |

### Options

- `-Force` - Skip confirmation prompt
- `-SkipBuild` - Skip clean/build steps
- `-Verbose` - Show detailed output

## Troubleshooting

If functions don't appear after deployment, verify node_modules exists (~60MB):

```powershell
.\verify-deployment-ready.ps1
```
