# Quodsi Infrastructure Deployment Scripts

This directory contains modular PowerShell scripts for deploying and managing Azure infrastructure for the Quodsi LucidChart Package.

## Directory Structure

The deployment resources are organized by resource type for better maintainability:

```
deployment/
├── scripts/            # PowerShell deployment scripts
├── batch/              # Batch account and pool templates
├── storage/            # Storage account templates
├── function-apps/      # Function App templates
├── complete/           # Complete environment templates
└── examples/           # Example templates for reference
```

## Quick Start

### 1. Validate a Deployment

```powershell
.\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode Validate -TemplateFile ".\complete\existing-resources.json" -ParameterFile ".\complete\existing-resources-params.json"
```

### 2. Preview Changes (What-If)

```powershell
.\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode WhatIf -TemplateFile ".\complete\existing-resources.json" -ParameterFile ".\complete\existing-resources-params.json"
```

### 3. Deploy Resources

```powershell
.\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode Deploy -TemplateFile ".\complete\existing-resources.json" -ParameterFile ".\complete\existing-resources-params.json"
```

## Resource-Specific Deployment Examples

### Deploy Only Batch Resources

```powershell
.\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode Deploy -TemplateFile ".\batch\quodsi-batch-only.json" -ParameterFile ".\batch\batch-params.json"
```

### Deploy Only Storage Resources

```powershell
.\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode Deploy -TemplateFile ".\storage\storage-only.json" -ParameterFile ".\storage\storage-params.json"
```

## Files Overview

### Main Scripts (scripts/)

| Script | Description |
|--------|-------------|
| **Deploy-ArTemplate.ps1** | Simple wrapper script for validating and deploying ARM templates. This is the main entry point. |
| **Deploy-Environment.ps1** | Advanced deployment script with comprehensive options and error handling. |
| **Deploy-SingleEnvironment.ps1** | Helper script used by Deploy-ArTemplate.ps1. |
| **Test-DirectArmValidation.ps1** | Utility for detailed template validation diagnostic information. |

### Supporting Modules (scripts/)

| Script | Description |
|--------|-------------|
| **Common-Functions.ps1** | Core utility functions used by all scripts. |
| **Convert-ToArm.ps1** | Functions for template conversion. |
| **Deploy-Arm.ps1** | Functions for ARM template deployment. |
| **Manage-ResourceGroup.ps1** | Functions for resource group management. |
| **Manage-Parameters.ps1** | Functions for parameter file management. |

### Batch Templates (batch/)

| File | Description |
|------|-------------|
| **batch-simple.json** | Simple Batch account template. |
| **minimal-batch.json** | Minimal Batch account template. |
| **quodsi-batch-only.json** | Quodsi-specific Batch resources template. |

### Storage Templates (storage/)

| File | Description |
|------|-------------|
| **storage-only.json** | Template with just a storage account. |
| **storage-and-batch.json** | Template for storage and batch accounts together. |

### Complete Environment Templates (complete/)

| File | Description |
|------|-------------|
| **minimal-template.json** | A starting template with parameter definitions and naming variables. |
| **existing-resources.json** | Complete template that uses existing Batch resources. |
| **quodsi-template.json** | Complete Quodsi infrastructure template. |

## Template Parameters

For your deployment to work correctly, **parameter files must exactly match the parameters defined in the template**. If you receive validation errors, check that:

1. Your parameter file doesn't include parameters not defined in the template
2. All required parameters (those without default values) are in your parameter file

## Azure Batch Account Limitation

Your Azure subscription has a quota limit of 1 Batch account. Because of this limitation, the `existing-resources.json` template is designed to:

1. Reference your existing Batch account rather than creating a new one
2. Deploy other resources (Function App, Storage, etc.) that work with the existing Batch account

If you need more Batch accounts, you would need to request a quota increase from Microsoft.

## Deployment Workflow

### Step 1: Set Up Parameters

Create a parameter file that matches your template exactly. You can use one of the following as a starting point:
- **complete/existing-resources-params.json**: For the full template that works with existing Batch resources
- **complete/minimal-params.json**: For simplified testing templates

### Step 2: Validate Your Template

Always validate the template before deployment:

```powershell
.\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode Validate -TemplateFile ".\complete\existing-resources.json" -ParameterFile ".\complete\existing-resources-params.json"
```

### Step 3: Preview Changes with What-If

Use What-If to see exactly what changes will be made:

```powershell
.\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode WhatIf -TemplateFile ".\complete\existing-resources.json" -ParameterFile ".\complete\existing-resources-params.json"
```

### Step 4: Deploy

When ready, deploy the changes:

```powershell
.\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode Deploy -TemplateFile ".\complete\existing-resources.json" -ParameterFile ".\complete\existing-resources-params.json"
```

## Troubleshooting

### Detailed Validation Errors

If you're getting generic validation errors, use the Test-DirectArmValidation script for more detailed error messages:

```powershell
.\scripts\Test-DirectArmValidation.ps1 -ResourceGroupName "dev-quodsi-eus-rg-01" -TemplateFile ".\complete\existing-resources.json" -ParameterFile ".\complete\existing-resources-params.json"
```

### Parameter File Mismatch

The most common validation error is parameter mismatch. Ensure your parameter file matches exactly the parameters defined in your template.

### Quota Limitations

If you encounter errors about quota limits, you're likely trying to create a resource that exceeds your subscription's limits. In this case:
1. Use existing resources instead
2. Request a quota increase from Microsoft
3. Remove the resource from your template

### Missing Azure Modules

If you encounter errors about missing Azure modules:

```powershell
Install-Module -Name Az -AllowClobber -Force
```

### Execution Policy

If you can't run scripts:

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

## Resource Naming Convention

The scripts use a consistent naming convention for all Azure resources:

```
{env}-{product}-{region}-{resource-type}-{instance}[-{version}]
```

For storage accounts (which have restrictions on characters and length):

```
{env}{product}{region}st{purpose}{instance}
```

Example generated resource names:
- Resource Group: `dev-quodsi-eus-rg-01`
- Function App: `dev-quodsi-eus-func-01-v3`
- Storage Account: `devquodsieusst01`

## Environments

The scripts support three environments:
- **dev**: Development environment for active development
- **tst**: Test environment for testing changes
- **prd**: Production environment for live systems

Each environment should have its own parameter file and potentially its own template variations.
