# Azure Batch Deployment for Quodsi

This directory contains templates for deploying and managing the shared Azure Batch account and environment-specific pools for the Quodsi application.

## Files

| File                                  | Description                                      |
| ------------------------------------- | ------------------------------------------------ |
| **quodsi-shared-batch-template.json** | Template for creating the shared Batch account   |
| **quodsi-shared-batch-params.json**   | Parameters for the shared Batch account          |
| **quodsi-pool-template.json**         | Template for creating environment-specific pools |
| **quodsi-pool-dev-params.json**       | Parameters for the development pool              |
| **quodsi-pool-tst-params.json**       | Parameters for the test pool                     |
| **quodsi-pool-prd-params.json**       | Parameters for the production pool               |
| **deploy-batch.ps1**                  | PowerShell script to deploy resources            |

## Deployment Process

### 1. Create the Shared Resource Group

```powershell
New-AzResourceGroup -Name "shared-quodsi-rg-01" -Location "eastus2"
```

### 2. Create Storage Account (if needed)

Before deploying the Batch account, ensure the storage account exists:

```powershell
New-AzStorageAccount -ResourceGroupName "shared-quodsi-rg-01" -Name "sharedquodsist01" -Location "eastus2" -SkuName "Standard_LRS" -Kind "StorageV2"
```

### 3. Deploy Resources

You can use the provided PowerShell script to deploy resources:

#### Deploy Everything (Batch account and all pools)

```powershell
.\deploy-batch.ps1 -DeploymentType all -CreateResourceGroup
```

#### Deploy Only the Batch Account

```powershell
.\deploy-batch.ps1 -DeploymentType account -CreateResourceGroup
```

#### Deploy Only Specific Environment Pools

```powershell
.\deploy-batch.ps1 -DeploymentType dev-pool
.\deploy-batch.ps1 -DeploymentType tst-pool
.\deploy-batch.ps1 -DeploymentType prd-pool
```

## Environment Structure

This deployment follows the Single Batch Account with Multiple Pool approach:

1. One shared Batch account (`quodsisharedbatch01`) in a shared resource group (`shared-quodsi-rg-01`)
2. Separate pools for each environment:
   - Development: `quodsi-dev-python-pool-01`
   - Testing: `quodsi-tst-python-pool-01`
   - Production: `quodsi-prd-python-pool-01`
3. Environment-specific application packages:
   - Development: `dev_quodsim`
   - Testing: `tst_quodsim`
   - Production: `LucidQuodsim`

## Application Packages

After creating the Batch account, you need to upload the application packages through the Azure Portal:

1. Navigate to the Azure Portal
2. Go to the Batch account (`quodsisharedbatch01`)
3. Select "Applications" from the left menu
4. Click "Add" to create each application:
   - Create application `dev_quodsim` with version `1.0`
   - Create application `tst_quodsim` with version `1.0`
   - Create application `LucidQuodsim` with version `1.0`
5. Upload the appropriate ZIP files for each application

## Pool Scaling

The pools are initially created with 0 nodes to save costs. To scale up a pool:

1. Navigate to the Azure Portal
2. Go to the Batch account (`quodsisharedbatch01`)
3. Select "Pools" from the left menu
4. Select the pool you want to scale
5. Click "Scale" from the top menu
6. Set the desired number of dedicated nodes
7. Click "Save"

Alternatively, use Azure CLI:

```powershell
az batch pool resize --pool-id quodsi-dev-python-pool-01 --target-dedicated-nodes 1 --account-name quodsisharedbatch01 --account-endpoint quodsisharedbatch01.eastus2.batch.azure.com

az batch pool resize --pool-id quodsi-tst-python-pool-01 --target-dedicated-nodes 1 --account-name quodsisharedbatch01 --account-endpoint quodsisharedbatch01.eastus2.batch.azure.com

az batch pool resize --pool-id quodsi-prd-python-pool-01 --target-dedicated-nodes 1 --account-name quodsisharedbatch01 --account-endpoint quodsisharedbatch01.eastus2.batch.azure.com
```

## Notes

- The storage account can be in a different resource group than the Batch account
- All pools are created with 0 nodes initially to avoid costs until needed
- The shared resource group approach simplifies management of shared resources
- The start task installs Python 3.10 and required dependencies on each node
- All pools use Ubuntu 20.04 LTS container images
- The managed identity `quodsisharedbatch01-identity` is used for the Batch account

## Updating Function Apps

After migrating to the new Batch account, update your Function Apps to use the new Batch account and pool names:

1. Navigate to your Function App in the Azure Portal
2. Go to "Configuration" under "Settings"
3. Update the following app settings:
   - `BatchAccountName`: `quodsisharedbatch01`
   - `BatchAccountUrl`: `https://quodsisharedbatch01.eastus2.batch.azure.com`
   - `BatchPoolName`: Use the appropriate pool name for each environment (e.g., `quodsi-dev-python-pool-01` for dev)
4. Click "Save"
