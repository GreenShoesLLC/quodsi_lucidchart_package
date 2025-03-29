# Quodsi Deployment Scripts

This directory contains PowerShell scripts for deploying and managing Azure infrastructure for the Quodsi LucidChart Package. These scripts provide a modular and reusable approach to managing deployments across different environments (dev, test, production).

## Quick Start

### 1. Validate a Deployment

```powershell
.\Deploy-ArTemplate.ps1 -Environment dev -Mode Validate -TemplateFile "..\complete\existing-resources.json" -ParameterFile "..\complete\existing-resources-params.json"
```

### 2. Preview Changes (What-If)

```powershell
.\Deploy-ArTemplate.ps1 -Environment dev -Mode WhatIf -TemplateFile "..\complete\existing-resources.json" -ParameterFile "..\complete\existing-resources-params.json"
```

### 3. Deploy Resources

```powershell
.\Deploy-ArTemplate.ps1 -Environment dev -Mode Deploy -TemplateFile "..\complete\existing-resources.json" -ParameterFile "..\complete\existing-resources-params.json"
```

## Script Overview

### Main Deployment Scripts

| Script | Description |
|--------|-------------|
| **Deploy-ArTemplate.ps1** | The main entry point script that simplifies template deployment with options for validation, what-if analysis, and deployment. This is the script you'll use most often. |
| **Deploy-SingleEnvironment.ps1** | Helper script used by Deploy-ArTemplate.ps1 to handle single environment deployments. |
| **Deploy-Environment.ps1** | Advanced deployment script with comprehensive options and detailed error handling. Used by Deploy-SingleEnvironment.ps1. |
| **Test-DirectArmValidation.ps1** | Utility script for detailed ARM template validation with enhanced diagnostic information. |
| **Get-DetailedValidationError.ps1** | Tool for extracting more detailed validation errors from ARM templates. |
| **Migrate-Resources.ps1** | Script to extract ARM templates from existing Azure resources, useful for migrating configurations between environments. |

### Core Functionality Modules

These scripts provide the underlying functionality for the main deployment scripts:

| Script | Description |
|--------|-------------|
| **Common-Functions.ps1** | Core utility functions used across all scripts, including logging, Azure connection handling, and resource naming conventions. |
| **Convert-ToArm.ps1** | Handles conversion of Bicep templates to ARM JSON format. Falls back to a placeholder template if Bicep is not installed. |
| **Deploy-Arm.ps1** | Functions for ARM template validation, what-if analysis, and deployment. |
| **Manage-ResourceGroup.ps1** | Functions for resource group creation, validation, and cleanup. |
| **Manage-Parameters.ps1** | Functions for handling parameter files, including creation and expansion of parameter files. |

## Key Features

- **Environment-based Deployments**: Scripts support `dev`, `tst`, and `prd` environments
- **Resource Naming Conventions**: Consistent naming across all resources
- **Validation**: Pre-deployment validation to catch issues before deployment
- **What-If Analysis**: Preview changes without deploying
- **Temporary Resource Groups**: Created and removed during validation to ensure clean testing
- **Error Handling**: Comprehensive error handling and reporting
- **Bicep Support**: Support for both Bicep and ARM JSON templates (requires Azure CLI with Bicep extension)

## Common Usage Patterns

### Function App Deployment

To deploy a Function App for the development environment:

```powershell
.\Deploy-ArTemplate.ps1 -Environment dev -Mode Deploy -TemplateFile "..\function-apps\function-app-template.json" -ParameterFile "..\function-apps\function-app-dev-params.json"
```

### Storage Account Deployment

To deploy a Storage Account for the test environment:

```powershell
.\Deploy-ArTemplate.ps1 -Environment tst -Mode Deploy -TemplateFile "..\storage\storage-only.json" -ParameterFile "..\storage\storage-params-tst.json"
```

### Update Environment Variables

To update environment variables on an existing Function App:

```powershell
.\Deploy-ArTemplate.ps1 -Environment dev -Mode Deploy -TemplateFile "..\function-apps\function-app-env-vars.json" -ParameterFile "..\function-apps\function-app-env-vars-params.json"
```

### Export Existing Resources as Template

To export an existing Azure resource group as an ARM template:

```powershell
.\Migrate-Resources.ps1 -SourceEnvironment dev -OutputPath "..\exports\dev-export.json"
```

## Detailed Validation

If you're encountering validation errors that aren't clear from the standard output, use the Test-DirectArmValidation.ps1 script:

```powershell
.\Test-DirectArmValidation.ps1 -ResourceGroupName "dev-quodsi-eus-rg-01" -TemplateFile "..\complete\existing-resources.json" -ParameterFile "..\complete\existing-resources-params.json"
```

## Troubleshooting

### Common Issues

1. **Missing Azure Modules**: If you receive errors about missing cmdlets, install the Az module:
   ```powershell
   Install-Module -Name Az -AllowClobber -Force
   ```

2. **Execution Policy**: If scripts won't run due to execution policy:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
   ```

3. **Parameter Mismatches**: The most common validation error is when parameter files don't match template parameters exactly.

4. **Bicep Conversion Errors**: If using Bicep templates:
   ```powershell
   winget install -e --id Microsoft.AzureCLI
   az bicep install
   ```

5. **Quota Limitations**: Azure subscriptions have quota limits that can cause deployments to fail, especially for Batch accounts.

### Debugging Steps

1. Start with Validate mode before attempting deployment
2. Use What-If mode to preview changes
3. If errors persist, use Test-DirectArmValidation.ps1 for more detailed errors
4. Check Azure Portal Activity Log for additional insights

## Prerequisites

- PowerShell 5.1 or higher
- Azure PowerShell module (Az)
- Azure CLI (optional, required for Bicep)
- Azure subscription with appropriate permissions
- Azure Batch account (required for full Quodsi deployment)

## Resource Naming Convention

The scripts follow this naming convention for Azure resources:

```
{env}-{product}-{region}-{resource-type}-{instance}[-{version}]
```

Example: `dev-quodsi-eus-func-01-v3`

For storage accounts (which have character and length limitations):

```
{env}{product}{region}st{purpose}{instance}
```

Example: `devquodsieusst01`
