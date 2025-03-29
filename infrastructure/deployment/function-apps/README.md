# Azure Function App Deployment Templates

This directory contains ARM templates and parameter files for deploying and managing Azure Function Apps across multiple environments (dev, test, prod).

## Files Overview

| File                                 | Description                                               |
|--------------------------------------|-----------------------------------------------------------|
| **function-app-template.json**       | Main template for deploying Azure Function Apps           |
| **function-app-dev-params.json**     | Parameter file for DEV environment                        |
| **function-app-tst-params.json**     | Parameter file for TEST environment                       |
| **function-app-prd-params.json**     | Parameter file for PROD environment                       |
| **function-app-env-vars.json**       | Template for updating environment variables only          |
| **function-app-env-vars-params.json**| Parameter file for updating environment variables         |

## Deployment Examples

### 1. Deploy a Function App for DEV Environment

```powershell
..\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode Deploy -TemplateFile ".\function-app-template.json" -ParameterFile ".\function-app-dev-params.json"
```

### 2. Deploy a Function App for TEST Environment

```powershell
..\scripts\Deploy-ArTemplate.ps1 -Environment tst -Mode Deploy -TemplateFile ".\function-app-template.json" -ParameterFile ".\function-app-tst-params.json"
```

### 3. Deploy a Function App for PROD Environment

```powershell
..\scripts\Deploy-ArTemplate.ps1 -Environment prd -Mode Deploy -TemplateFile ".\function-app-template.json" -ParameterFile ".\function-app-prd-params.json"
```

### 4. Update Environment Variables on an Existing Function App

```powershell
..\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode Deploy -TemplateFile ".\function-app-env-vars.json" -ParameterFile ".\function-app-env-vars-params.json"
```

## Function App Features

The Function App template (`function-app-template.json`) deploys the following resources:

1. **Function App** with NodeJS runtime
2. **App Service Plan** (Consumption or Premium plan)
3. **Storage Account** for Function App files and data
4. **Application Insights** for monitoring

Each Function App is configured with:
- Connection to the shared Batch account
- Environment-specific Batch pool name (pool-dev, pool-tst, pool-prd)
- Environment-specific settings and configurations

## Environment Variables Management

To update environment variables on existing Function Apps:

1. Edit the `function-app-env-vars-params.json` file
2. Add your new environment variables in the `appSettings` object
3. Set `functionAppName` to the name of your target Function App
4. Deploy using the command in example #4 above

The template preserves existing app settings by default (controlled by the `preserveExistingSettings` parameter).

## Important Notes

1. **Resource Naming**: Function Apps follow the standard naming convention:
   - `{env}-{product}-func-lucid-{version}`
   - Example: `dev-quodsi-func-lucid-v3`

2. **Storage Accounts**: Each Function App gets its own storage account named:
   - `{env}{product}st{instance}`
   - Example: `devquodsist01`

3. **Shared Batch Resource**: All Function Apps connect to the same Batch account but
   use environment-specific pools (pool-dev, pool-tst, pool-prd).

4. **Application Settings**: The `additionalSettings` parameter can be used to add
   environment-specific application settings.

## Troubleshooting

If you encounter deployment issues:

1. **Validate the template first**:
   ```powershell
   ..\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode Validate -TemplateFile ".\function-app-template.json" -ParameterFile ".\function-app-dev-params.json"
   ```

2. **Preview changes with What-If**:
   ```powershell
   ..\scripts\Deploy-ArTemplate.ps1 -Environment dev -Mode WhatIf -TemplateFile ".\function-app-template.json" -ParameterFile ".\function-app-dev-params.json"
   ```

3. **Check for existing resources**: Some resources like storage accounts must have globally unique names.