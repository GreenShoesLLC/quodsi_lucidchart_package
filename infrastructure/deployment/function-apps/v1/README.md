# Azure Function Apps for Quodsi

This directory contains templates for deploying environment-specific Azure Function Apps for the Quodsi application using standard (non-Linux) function app configuration.

## Files

| File | Description |
|------|-------------|
| **quodsi-function-template-nolinux.json** | ARM template for creating environment-specific Function Apps |
| **quodsi-function-dev-params-v2.json** | Parameters for development Function App |
| **quodsi-function-tst-params-v2.json** | Parameters for test Function App |
| **quodsi-function-prd-params-v2.json** | Parameters for production Function App |
| **deploy-function-nolinux.ps1** | PowerShell script to deploy Function Apps |
| **prepare-deployment.ps1** | PowerShell script to prepare parameter files with connection strings |

## Environment Configuration

The Function Apps are designed to work with environment-specific resources:

- **Environment Detection**: The code automatically detects which environment it's running in based on the Function App name (dev/tst/prd)
- **Storage Accounts**: Each environment has its own storage account for model data:
  - Development: `devquodsist01` (in `dev-quodsi-rg-01`)
  - Test: `tstquodsist01` (in `tst-quodsi-rg-01`)
  - Production: `prdquodsist01` (in `prd-quodsi-rg-01`)
- **Batch Resources**: All environments share the same Batch account (`quodsisharedbatch01`) but use environment-specific pools and applications:
  - Development: Pool `quodsi-dev-python-pool-01`, Application `dev_quodsim`
  - Test: Pool `quodsi-tst-python-pool-01`, Application `tst_quodsim`
  - Production: Pool `quodsi-prd-python-pool-01`, Application `prd_quodsim`

## Function App Naming

The Function Apps follow this simplified naming convention:
- Development: `dev-quodsi-func-v1` (in `dev-quodsi-rg-01`)
- Test: `tst-quodsi-func-v1` (in `tst-quodsi-rg-01`)
- Production: `prd-quodsi-func-v1` (in `prd-quodsi-rg-01`)

## Deployment Process

### 1. Create the Resource Groups (if needed)

```powershell
# Create all resource groups at once
.\deploy-function-nolinux.ps1 -Environment all -CreateResourceGroups

# Or create resource groups individually
New-AzResourceGroup -Name "dev-quodsi-rg-01" -Location "eastus"
New-AzResourceGroup -Name "tst-quodsi-rg-01" -Location "eastus"
New-AzResourceGroup -Name "prd-quodsi-rg-01" -Location "eastus"
```

### 2. Prepare Parameter Files

Before deployment, you need to prepare the parameter files with the actual connection strings:

```powershell
# For a single environment
.\prepare-deployment.ps1 -Environment dev

# For all environments
.\prepare-deployment.ps1 -Environment all
```

This will prompt you for the necessary connection strings and generate temporary parameter files (e.g., `temp-dev-params.json`).

### 3. Deploy Function Apps

Use the prepared parameter files to deploy the Function Apps:

#### Preview Deployment (WhatIf Mode)

```powershell
.\deploy-function-nolinux.ps1 -Environment dev -ParameterFile .\temp-dev-params.json -WhatIf
```

#### Deploy to Specific Environment

```powershell
.\deploy-function-nolinux.ps1 -Environment dev -ParameterFile .\temp-dev-params.json
.\deploy-function-nolinux.ps1 -Environment tst -ParameterFile .\temp-tst-params.json
.\deploy-function-nolinux.ps1 -Environment prd -ParameterFile .\temp-prd-params.json
```

#### Clean Up Temporary Files

After deployment, remove the temporary parameter files to keep connection strings secure:

```powershell
Remove-Item .\temp-*.json
```

## Connection to Batch and Storage

The Function Apps are configured to connect to the following resources:

- **Batch Account**: `quodsisharedbatch01` (in `shared-quodsi-rg-01`)
- **Batch Pools**:
  - Development: `quodsi-dev-python-pool-01`
  - Test: `quodsi-tst-python-pool-01`
  - Production: `quodsi-prd-python-pool-01`
- **Storage Accounts**:
  - Development: `devquodsist01` (in `dev-quodsi-rg-01`)
  - Test: `tstquodsist01` (in `tst-quodsi-rg-01`)
  - Production: `prdquodsist01` (in `prd-quodsi-rg-01`)

## CORS Settings

The Function Apps are configured with CORS settings to allow access from the following origins:
- `https://app.lucidchart.com`
- `https://*.execute-api.us-east-1.amazonaws.com`
- Local development URLs (for development environment only)

## Environment Variables

Each Function App includes environment-specific configuration settings for:
- **QUODSI_ENVIRONMENT**: Explicitly identifies the current environment (`dev`, `tst`, or `prd`)
- **QUODSI_STORAGE_ACCOUNT**: Name of the environment-specific storage account
- **AzureStorageConnectionString**: Connection string for the environment-specific storage account
- **BatchStorageConnectionString**: Connection string for the shared batch storage account
- **BatchPoolId**: Name of the environment-specific batch pool
- **DefaultApplicationId**: Environment-specific batch application ID (`dev_quodsim`, `tst_quodsim`, or `prd_quodsim`)

## Troubleshooting

If you encounter issues during deployment:

1. Check the PowerShell output for detailed error messages
2. Verify that the storage accounts exist and are accessible
3. Ensure you have sufficient permissions to access storage account keys
4. Verify the batch account and pool names are correct
5. Check for resource constraints or quota limits in the subscription

## Notes

- Previous versions of templates and scripts have been moved to the `deprecated` folder for reference
- The working solution uses a standard (non-Linux) function app configuration to avoid issues with the `LinuxFxVersion` parameter
- The parameter files in source control contain placeholder values for connection strings to maintain security
