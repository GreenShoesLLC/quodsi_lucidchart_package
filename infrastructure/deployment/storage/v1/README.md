# Azure Storage Accounts for Quodsi

This directory contains templates for deploying environment-specific storage accounts for the Quodsi application's Batch processing.

## Files

| File | Description |
|------|-------------|
| **quodsi-env-storage-template.json** | Template for creating environment-specific storage accounts |
| **quodsi-dev-storage-params.json** | Parameters for development storage account |
| **quodsi-tst-storage-params.json** | Parameters for test storage account |
| **quodsi-prd-storage-params.json** | Parameters for production storage account |
| **deploy-storage.ps1** | PowerShell script to deploy storage accounts |

## Storage Account Naming

The storage accounts follow this naming convention:
- Development: `devquodsist01` (in `dev-quodsi-rg-01`)
- Test: `tstquodsist01` (in `tst-quodsi-rg-01`)
- Production: `prdquodsist01` (in `prd-quodsi-rg-01`)

These storage accounts are used by the corresponding environment-specific Batch pools.

## Deployment Process

### 1. Create the Resource Groups (if needed)

```powershell
# Create all resource groups at once
.\deploy-storage.ps1 -Environment all -CreateResourceGroups

# Or create resource groups individually
New-AzResourceGroup -Name "dev-quodsi-rg-01" -Location "eastus2"
New-AzResourceGroup -Name "tst-quodsi-rg-01" -Location "eastus2"
New-AzResourceGroup -Name "prd-quodsi-rg-01" -Location "eastus2"
```

### 2. Deploy Storage Accounts

You can use the provided PowerShell script to deploy storage accounts:

#### Deploy All Storage Accounts

```powershell
.\deploy-storage.ps1 -Environment all
```

#### Deploy Environment-Specific Storage Account

```powershell
.\deploy-storage.ps1 -Environment dev
.\deploy-storage.ps1 -Environment tst
.\deploy-storage.ps1 -Environment prd
```

## Linking with Batch

After creating these storage accounts, your application code running in each pool should be configured to connect to the appropriate storage account for that environment.

## Security Features

The storage accounts are created with the following security features enabled:
- HTTPS traffic only
- TLS 1.2 or higher required
- Public access to blobs is disabled
- Hot access tier for optimal performance

## Notes

- Each storage account is deployed to its environment-specific resource group
- Standard locally redundant storage (LRS) is used for cost efficiency
- StorageV2 account type is used for the latest features and performance
- The shared Batch account (`quodsisharedbatch01`) still uses the `devquodsist01` storage account for its internal operations