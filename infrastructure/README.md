# Azure Infrastructure Management

This folder contains the infrastructure as code (IaC) scripts and templates for managing Azure resources across development, testing, and production environments for the Quodsi Lucidchart Package.

## Contents

- `extract-azure-config.ps1`: Script to extract configurations from existing Azure resources and convert them to Bicep templates
- `extracted-config/`: Generated Bicep templates and deployment scripts based on existing resources
  - `combined-template.bicep`: Main Bicep template for all resources
  - Environment-specific parameter files: `dev.parameters.json`, `tst.parameters.json`, `prd.parameters.json`
  - `deploy.ps1`: Script to deploy resources to all environments

## Core Resources

The infrastructure management in this folder is focused on the following key resources:

- **Function App**: `dev-quodsi-func-lucid-v3` (East US)
- **Batch Account**: `qdsdeveus2batchsim01` (East US 2)
- **Storage Account**: `qdsdeveus2stbatch01` (East US 2)
- **Resource Group**: `dev-quodsi-rg-01` (East US)

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
