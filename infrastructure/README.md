# Infrastructure Provisioning

This directory contains Infrastructure as Code (IaC) for **provisioning Azure resources** (rare operation).

**Looking for application deployment?** See `/deploy/` for deploying code to existing infrastructure.

## Directory Structure

```
/infrastructure/
├── batch/              # Azure Batch account and pools
│   └── v1/            # Current version templates
├── function-apps/      # Azure Function App infrastructure
│   └── v1/            # Current version templates
├── storage/            # Azure Storage accounts
│   └── v1/            # Current version templates
├── scripts/            # ARM deployment orchestration scripts
├── extracted-config/   # Archived/reference configurations
└── README.md          # This file
```

## What This Does vs. What It Doesn't Do

**This directory (Infrastructure):**
- ✅ Creates Azure resources (Batch, Function Apps, Storage)
- ✅ Provisions infrastructure using ARM templates
- ✅ Sets up environment-specific configurations
- ✅ Manages resource groups and dependencies

**This directory does NOT:**
- ❌ Deploy function code (see `/deploy/azure-functions/`)
- ❌ Build Lucid extension packages (see `/deploy/lucid-package/`)
- ❌ Deploy application updates (see `/deploy/`)

## Contents

### Active Templates

- **`batch/v1/`**: Azure Batch account and environment-specific pools
- **`function-apps/v1/`**: Function App infrastructure (not the code)
- **`storage/v1/`**: Storage accounts for Batch and simulations
- **`scripts/`**: Shared ARM deployment utilities

### Utilities

- `extract-azure-config.ps1`: Extract configurations from existing Azure resources
- `extracted-config/`: Archived templates and reference configurations

## Quick Start

### Provisioning a New Environment

```powershell
# 1. Deploy storage accounts
cd storage/v1
.\deploy-storage.ps1 -Environment dev -CreateResourceGroups

# 2. Deploy Batch infrastructure (if first time)
cd ../../batch/v1
.\deploy-batch.ps1 -DeploymentType all -CreateResourceGroup

# 3. Deploy Function App infrastructure
cd ../../function-apps/v1
.\deploy-function-nolinux.ps1 -Environment dev

# 4. Then deploy application code (see /deploy/ directory)
```

**See component-specific READMEs in each subdirectory for detailed instructions.**

## Core Resources

The infrastructure provisions the following key resources per environment:

| Resource Type | Naming Pattern | Example (dev) |
|--------------|----------------|---------------|
| Resource Group | `{env}-quodsi-rg-01` | `dev-quodsi-rg-01` |
| Function App | `{env}-quodsi-func-v1` | `dev-quodsi-func-v1` |
| Storage Account | `{env}quodsist01` | `devquodsist01` |
| Batch Account | `quodsisharedbatch01` (shared) | `quodsisharedbatch01` |
| Batch Pool | `quodsi-{env}-python-pool-01` | `quodsi-dev-python-pool-01` |

## Environment Setup Process

### Prerequisites

1. Install Azure PowerShell modules:

   ```powershell
   Install-Module -Name Az -AllowClobber
   ```

2. Install Azure CLI with Bicep extension:

   ```powershell
   # Check if Bicep is installed
   az bicep version

   # Install if needed
   az bicep install
   ```

### Extracting Configuration

If you need to update the Bicep templates based on changes to the development environment:

1. Run the extraction script:

   ```powershell
   .\extract-azure-config.ps1
   ```

2. Review the generated files in the `extracted-config` folder.

### Deploying Environments

To deploy or update Test and Production environments:

1. Navigate to the extracted-config folder:

   ```powershell
   cd .\extracted-config
   ```

2. Review and modify the Bicep template or parameter files if needed.

3. Deploy to all environments:

   ```powershell
   .\deploy.ps1
   ```

4. For selective deployment (single environment):

   ```powershell
   # For Test environment only
   New-AzResourceGroup -Name "tst-quodsi-rg-01" -Location "East US" -Force
   New-AzResourceGroupDeployment -ResourceGroupName "tst-quodsi-rg-01" -TemplateFile "./combined-template.bicep" -TemplateParameterFile "./tst.parameters.json"

   # For Production environment only
   New-AzResourceGroup -Name "prd-quodsi-rg-01" -Location "East US" -Force
   New-AzResourceGroupDeployment -ResourceGroupName "prd-quodsi-rg-01" -TemplateFile "./combined-template.bicep" -TemplateParameterFile "./prd.parameters.json"
   ```

## Environment Variables

Environment variables are handled in the Bicep template as Function App application settings. If you need to add or modify environment variables:

1. Edit the `combined-template.bicep` file
2. Locate the `appSettings` array in the Function App resource definition
3. Add or modify the entries as needed:
   ```bicep
   {
     name: 'ENVIRONMENT_VARIABLE_NAME'
     value: 'Value'
   }
   ```

## Naming Conventions

The infrastructure follows these naming conventions:

- Resource Group: `{env}-quodsi-rg-01`
- Function App: `{env}-quodsi-func-lucid-v3`
- Batch Account: `qds{env}eus2batchsim01`
- Storage Account: `qds{env}eus2stbatch01`

Where `{env}` is one of: `dev`, `tst`, or `prd`.

## Best Practices

1. Always review generated templates before deployment
2. Keep sensitive configuration in Azure Key Vault (not directly in templates)
3. Test changes in development/test environments before production
4. Use source control to track changes to infrastructure code
5. Maintain consistent naming and tagging across environments

## Troubleshooting

If you encounter issues during deployment:

1. Check Azure activity logs in the portal
2. Review deployment operation details
3. Ensure you have sufficient permissions in the subscription
4. Verify resource name uniqueness (especially for storage accounts)
5. Check for resource constraints or quota limits in the subscription
