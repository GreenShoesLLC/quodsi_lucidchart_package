# Script to extract Azure resource configurations and transform to Bicep
# This script extracts configuration from:
# - Function App (dev-quodsi-func-lucid-v3)
# - Batch Account (qdsdeveus2batchsim01)
# - Storage Account (qdsdeveus2stbatch01)

# Parameters
$resourceGroup = "dev-quodsi-rg-01"
$functionAppName = "dev-quodsi-func-lucid-v3"
$batchAccountName = "qdsdeveus2batchsim01"
$storageAccountName = "qdsdeveus2stbatch01"
$outputFolder = "./extracted-config"

# Create output folder
if (-not (Test-Path -Path $outputFolder)) {
    New-Item -ItemType Directory -Path $outputFolder | Out-Null
}

# Login to Azure if needed
$context = Get-AzContext
if (-not $context) {
    Write-Host "Logging in to Azure..." -ForegroundColor Yellow
    Connect-AzAccount
} else {
    Write-Host "Already logged in as $($context.Account)" -ForegroundColor Green
}

# 1. Extract Function App Configuration
Write-Host "Extracting Function App configuration..." -ForegroundColor Cyan
try {
    # Export ARM template
    $functionAppId = (Get-AzFunctionApp -ResourceGroupName $resourceGroup -Name $functionAppName).Id
    Export-AzResourceGroup -ResourceGroupName $resourceGroup -Resource $functionAppId -IncludeParameterDefaultValue -Path "$outputFolder/function-app-export.json"
    
    # Extract application settings separately
    $appSettings = (Get-AzFunctionAppSetting -Name $functionAppName -ResourceGroupName $resourceGroup)
    $appSettings | ConvertTo-Json -Depth 10 | Out-File -FilePath "$outputFolder/function-app-settings.json"
    
    # Get hosting plan details
    $functionApp = Get-AzFunctionApp -ResourceGroupName $resourceGroup -Name $functionAppName
    $appServicePlanId = $functionApp.ServerFarmId
    $appServicePlanName = $appServicePlanId.Split('/')[-1]
    $appServicePlan = Get-AzAppServicePlan -ResourceGroupName $resourceGroup -Name $appServicePlanName
    $appServicePlan | ConvertTo-Json -Depth 10 | Out-File -FilePath "$outputFolder/app-service-plan.json"
    
    Write-Host "Function App configuration extracted successfully" -ForegroundColor Green
} catch {
    Write-Host "Error extracting Function App configuration: $_" -ForegroundColor Red
}

# 2. Extract Batch Account Configuration
Write-Host "Extracting Batch Account configuration..." -ForegroundColor Cyan
try {
    # Export ARM template
    $batchAccountId = (Get-AzBatchAccount -AccountName $batchAccountName -ResourceGroupName $resourceGroup).Id
    Export-AzResourceGroup -ResourceGroupName $resourceGroup -Resource $batchAccountId -IncludeParameterDefaultValue -Path "$outputFolder/batch-account-export.json"
    
    # Get additional details
    $batchAccount = Get-AzBatchAccount -AccountName $batchAccountName -ResourceGroupName $resourceGroup
    $batchAccount | ConvertTo-Json -Depth 10 | Out-File -FilePath "$outputFolder/batch-account-details.json"
    
    Write-Host "Batch Account configuration extracted successfully" -ForegroundColor Green
} catch {
    Write-Host "Error extracting Batch Account configuration: $_" -ForegroundColor Red
}

# 3. Extract Storage Account Configuration
Write-Host "Extracting Storage Account configuration..." -ForegroundColor Cyan
try {
    # Export ARM template
    $storageAccountId = (Get-AzStorageAccount -ResourceGroupName $resourceGroup -Name $storageAccountName).Id
    Export-AzResourceGroup -ResourceGroupName $resourceGroup -Resource $storageAccountId -IncludeParameterDefaultValue -Path "$outputFolder/storage-account-export.json"
    
    # Get additional details
    $storageAccount = Get-AzStorageAccount -ResourceGroupName $resourceGroup -Name $storageAccountName
    $storageAccount | ConvertTo-Json -Depth 10 | Out-File -FilePath "$outputFolder/storage-account-details.json"
    
    Write-Host "Storage Account configuration extracted successfully" -ForegroundColor Green
} catch {
    Write-Host "Error extracting Storage Account configuration: $_" -ForegroundColor Red
}

# 4. Convert ARM templates to Bicep
Write-Host "Converting ARM templates to Bicep..." -ForegroundColor Cyan
try {
    # Check if Bicep CLI is installed
    $bicepInstalled = Get-Command az bicep -ErrorAction SilentlyContinue
    
    if ($bicepInstalled) {
        # Convert Function App ARM template to Bicep
        az bicep decompile --file "$outputFolder/function-app-export.json" --outfile "$outputFolder/function-app.bicep" 2>&1 | Out-Null
        
        # Convert Batch Account ARM template to Bicep
        az bicep decompile --file "$outputFolder/batch-account-export.json" --outfile "$outputFolder/batch-account.bicep" 2>&1 | Out-Null
        
        # Convert Storage Account ARM template to Bicep
        az bicep decompile --file "$outputFolder/storage-account-export.json" --outfile "$outputFolder/storage-account.bicep" 2>&1 | Out-Null
        
        Write-Host "ARM templates converted to Bicep successfully" -ForegroundColor Green
    } else {
        Write-Host "Bicep CLI not found. Install Azure CLI with Bicep extension to convert templates." -ForegroundColor Yellow
    }
} catch {
    Write-Host "Error converting ARM templates to Bicep: $_" -ForegroundColor Red
}

# 5. Create a combined Bicep template
Write-Host "Creating combined Bicep template..." -ForegroundColor Cyan
try {
    # Parse app settings to create Bicep-friendly array format
    $appSettingsBicep = @()
    foreach ($key in $appSettings.Keys) {
        $appSettingsBicep += "    {`n      name: '$key'`n      value: '$($appSettings[$key].Replace("'", "''"))'`n    }"
    }
    $appSettingsBicepString = $appSettingsBicep -join "`n"
    
    # Create combined Bicep template
    $combinedBicepTemplate = @"
// Combined Bicep template for Function App, Batch Account, and Storage Account
// Generated on $(Get-Date)

// Parameters
@description('Environment name: dev, tst, or prd')
param environment string = 'dev'
param location string = resourceGroup().location
param batchLocation string = 'eastus2'

// Variables
var functionAppName = '`${environment}-quodsi-func-lucid-v3'
var appServicePlanName = '`${environment}-quodsi-asp-01'
var functionStorageName = '`${environment}quodsistfunc01'
var batchAccountName = 'qds`${environment}eus2batchsim01'
var batchStorageName = 'qds`${environment}eus2stbatch01'

// Storage Account for Function App
resource functionStorage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: functionStorageName
  location: location
  sku: {
    name: '$($storageAccount.Sku.Name)'
  }
  kind: '$($storageAccount.Kind)'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

// App Service Plan for Function App
resource appServicePlan 'Microsoft.Web/serverfarms@2022-03-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: '$($appServicePlan.Sku.Name)'
    tier: '$($appServicePlan.Sku.Tier)'
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2022-03-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  properties: {
    serverFarmId: appServicePlan.id
    siteConfig: {
      appSettings: [
$appSettingsBicepString
      ]
      netFrameworkVersion: '$($functionApp.SiteConfig.NetFrameworkVersion)'
    }
    httpsOnly: true
  }
  dependsOn: [
    functionStorage
    appServicePlan
  ]
}

// Storage Account for Batch
resource batchStorage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: batchStorageName
  location: batchLocation
  sku: {
    name: '$($storageAccount.Sku.Name)'
  }
  kind: '$($storageAccount.Kind)'
  properties: {
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    supportsHttpsTrafficOnly: true
  }
}

// Batch Account
resource batchAccount 'Microsoft.Batch/batchAccounts@2022-10-01' = {
  name: batchAccountName
  location: batchLocation
  properties: {
    autoStorage: {
      storageAccountId: batchStorage.id
    }
    poolAllocationMode: '$($batchAccount.PoolAllocationMode)'
  }
  dependsOn: [
    batchStorage
  ]
}

// Outputs
output functionAppHostName string = functionApp.properties.defaultHostName
output batchAccountEndpoint string = batchAccount.properties.accountEndpoint
output functionStorageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=`${functionStorage.name};EndpointSuffix=`${environment().suffixes.storage};AccountKey=`${functionStorage.listKeys().keys[0].value}'
"@

    $combinedBicepTemplate | Out-File -FilePath "$outputFolder/combined-template.bicep"
    Write-Host "Combined Bicep template created successfully at $outputFolder/combined-template.bicep" -ForegroundColor Green
} catch {
    Write-Host "Error creating combined Bicep template: $_" -ForegroundColor Red
}

# 6. Create parameter files for different environments
Write-Host "Creating parameter files for different environments..." -ForegroundColor Cyan
try {
    $environments = @("dev", "tst", "prd")
    
    foreach ($env in $environments) {
        $paramContent = @"
{
  "`$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentParameters.json#",
  "contentVersion": "1.0.0.0",
  "parameters": {
    "environment": {
      "value": "$env"
    }
  }
}
"@
        $paramContent | Out-File -FilePath "$outputFolder/$env.parameters.json"
    }
    
    Write-Host "Parameter files created successfully" -ForegroundColor Green
} catch {
    Write-Host "Error creating parameter files: $_" -ForegroundColor Red
}

# 7. Create deployment script
Write-Host "Creating deployment script..." -ForegroundColor Cyan
try {
    $deploymentScript = @'
# Bicep Deployment Script
# This script deploys the Bicep template to create Dev, Test, and Production environments

# Login to Azure
Connect-AzAccount

# Variables
$subscription = "Microsoft Azure Sponsorship"
$environments = @("dev", "tst", "prd")
$location = "East US"  # Main location for resource groups

# Select subscription
Select-AzSubscription -SubscriptionName $subscription

# Create and deploy to each environment
foreach ($env in $environments) {
    # Create Resource Group
    $rgName = "$env-quodsi-rg-01"
    Write-Host "Creating Resource Group: $rgName" -ForegroundColor Green
    New-AzResourceGroup -Name $rgName -Location $location -Force

    # Deploy Bicep template
    Write-Host "Deploying Bicep template to $env environment" -ForegroundColor Green
    New-AzResourceGroupDeployment -ResourceGroupName $rgName `
        -TemplateFile "./combined-template.bicep" `
        -TemplateParameterFile "./$env.parameters.json"

    Write-Host "$env Environment Deployment Complete" -ForegroundColor Cyan
    Write-Host "----------------------------------------------" -ForegroundColor Cyan
}

Write-Host "All Environments (Dev, Test, Prod) Deployment Complete!" -ForegroundColor Green
'@

    $deploymentScript | Out-File -FilePath "$outputFolder/deploy.ps1"
    Write-Host "Deployment script created successfully at $outputFolder/deploy.ps1" -ForegroundColor Green
} catch {
    Write-Host "Error creating deployment script: $_" -ForegroundColor Red
}

Write-Host "Configuration extraction and transformation complete!" -ForegroundColor Green
Write-Host "Files are available in the $outputFolder directory" -ForegroundColor Green
Write-Host "To deploy, run: cd $outputFolder; ./deploy.ps1" -ForegroundColor Yellow