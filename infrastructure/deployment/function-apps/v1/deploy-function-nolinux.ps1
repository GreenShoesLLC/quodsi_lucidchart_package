# Azure Function App Deployment Script with Simple Naming (No Linux)
param (
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "tst", "prd", "all")]
    [string]$Environment,
    
    [Parameter(Mandatory = $false)]
    [switch]$CreateResourceGroups,
    
    [Parameter(Mandatory = $false)]
    [switch]$WhatIf,
    
    [Parameter(Mandatory = $false)]
    [string]$ParameterFile = ""
)

# Configuration for different environments
$config = @{
    "dev" = @{
        "ResourceGroupName" = "dev-quodsi-rg-01"
        "Location" = "eastus"
        "ParameterFile" = "./quodsi-function-dev-params-v2.json"
        "BatchStorageName" = "devquodsist01"
        "BatchStorageRG" = "dev-quodsi-rg-01"
        "FunctionAppName" = "dev-quodsi-func-v1"
    }
    "tst" = @{
        "ResourceGroupName" = "tst-quodsi-rg-01"
        "Location" = "eastus"
        "ParameterFile" = "./quodsi-function-tst-params-v2.json"
        "BatchStorageName" = "tstquodsist01"
        "BatchStorageRG" = "tst-quodsi-rg-01"
        "FunctionAppName" = "tst-quodsi-func-v1"
    }
    "prd" = @{
        "ResourceGroupName" = "prd-quodsi-rg-01"
        "Location" = "eastus"
        "ParameterFile" = "./quodsi-function-prd-params-v2.json"
        "BatchStorageName" = "prdquodsist01"
        "BatchStorageRG" = "prd-quodsi-rg-01"
        "FunctionAppName" = "prd-quodsi-func-v1"
    }
}

# Template file is the nolinux version
$templateFile = "./quodsi-function-template-nolinux.json"

# Function to get the storage account connection string
function Get-StorageConnectionString {
    param (
        [string]$StorageAccountName,
        [string]$ResourceGroupName
    )
    
    Write-Host "Getting connection string for storage account $StorageAccountName in resource group $ResourceGroupName"
    
    try {
        # Get the storage account key
        $storageKey = (Get-AzStorageAccountKey -ResourceGroupName $ResourceGroupName -Name $StorageAccountName).Value[0]
        
        # Build the connection string
        $connectionString = "DefaultEndpointsProtocol=https;AccountName=$StorageAccountName;AccountKey=$storageKey;EndpointSuffix=core.windows.net"
        
        return $connectionString
    }
    catch {
        Write-Error "Failed to get storage account key: $_"
        exit 1
    }
}

# Function to update parameter file with connection string
function Update-ParameterFile {
    param (
        [string]$ParameterFile,
        [string]$ConnectionString
    )
    
    Write-Host "Updating parameter file $ParameterFile with connection string"
    
    try {
        # Read the parameter file
        $params = Get-Content -Path $ParameterFile -Raw | ConvertFrom-Json
        
        # Update the connection string
        $params.parameters.batchStorageConnectionString.value = $ConnectionString
        
        # Create a temporary file with updated parameters
        $tempFile = "$ParameterFile.temp"
        $params | ConvertTo-Json -Depth 10 | Set-Content -Path $tempFile
        
        return $tempFile
    }
    catch {
        Write-Error "Failed to update parameter file: $_"
        exit 1
    }
}

# Function to check if the function app already exists
function Test-FunctionAppExists {
    param (
        [string]$ResourceGroupName,
        [string]$FunctionAppName
    )
    
    try {
        $app = Get-AzWebApp -ResourceGroupName $ResourceGroupName -Name $FunctionAppName -ErrorAction SilentlyContinue
        return ($null -ne $app)
    }
    catch {
        return $false
    }
}

# Function to deploy to a specific environment
function Deploy-Environment {
    param (
        [string]$EnvName
    )
    
    $envConfig = $config[$EnvName]
    
    Write-Host "Deploying Function App for $EnvName environment..."
    Write-Host "Resource Group: $($envConfig.ResourceGroupName)"
    Write-Host "Function App Name: $($envConfig.FunctionAppName)"
    
    # Check if a custom parameter file was provided
    $paramFile = $envConfig.ParameterFile
    if ($ParameterFile -ne "" -and $ParameterFile -match $EnvName) {
        $paramFile = $ParameterFile
        Write-Host "Using custom parameter file: $paramFile"
    } else {
        Write-Host "Using default parameter file: $paramFile"
    }
    
    # Check for existing function app with old naming convention
    $oldFunctionAppName = "$EnvName-quodsi-func-lucid-v3"
    $oldAppExists = Test-FunctionAppExists -ResourceGroupName $envConfig.ResourceGroupName -FunctionAppName $oldFunctionAppName
    $newAppExists = Test-FunctionAppExists -ResourceGroupName $envConfig.ResourceGroupName -FunctionAppName $envConfig.FunctionAppName
    
    if ($oldAppExists) {
        Write-Host "Found existing function app with old name: $oldFunctionAppName"
        Write-Host "NOTE: The old function app will NOT be deleted. You will need to manually delete it later if desired."
    }
    
    if ($newAppExists) {
        Write-Host "Function app with new name already exists: $($envConfig.FunctionAppName)"
        $response = Read-Host "Do you want to replace the existing function app? (Y/N)"
        
        if ($response -ne "Y" -and $response -ne "y") {
            Write-Host "Deployment cancelled for $EnvName environment."
            return
        }
    }
    
    # Create resource group if requested
    if ($CreateResourceGroups) {
        Write-Host "Creating resource group $($envConfig.ResourceGroupName) in $($envConfig.Location)..."
        New-AzResourceGroup -Name $envConfig.ResourceGroupName -Location $envConfig.Location -Force
    }
    
    $connectionString = Get-StorageConnectionString -StorageAccountName $envConfig.BatchStorageName -ResourceGroupName $envConfig.BatchStorageRG
    
    # Update the parameter file with the connection string if not using a custom parameter file
    if ($ParameterFile -eq "") {
        # Update the parameter file with the connection string
        $updatedParamFile = Update-ParameterFile -ParameterFile $paramFile -ConnectionString $connectionString
    } else {
        # Use the custom parameter file as is
        $updatedParamFile = $paramFile
    }
    
    try {
        # Deploy the Function App
        if ($WhatIf) {
            # Preview changes without deploying
            Write-Host "Previewing changes (WhatIf mode)..."
            New-AzResourceGroupDeployment -ResourceGroupName $envConfig.ResourceGroupName `
                -TemplateFile $templateFile `
                -TemplateParameterFile $updatedParamFile `
                -WhatIf
        }
        else {
            # Deploy for real
            Write-Host "Deploying Function App: $($envConfig.FunctionAppName)..."
            $deployment = New-AzResourceGroupDeployment -ResourceGroupName $envConfig.ResourceGroupName `
                -TemplateFile $templateFile `
                -TemplateParameterFile $updatedParamFile
                
            # Output deployment results
            Write-Host "Deployment completed with status: $($deployment.ProvisioningState)"
            Write-Host "Function App URL: $($deployment.Outputs.functionAppUrl.Value)"
            
            # Reminder about the old function app
            if ($oldAppExists) {
                Write-Host ""
                Write-Host "REMINDER: The old function app ($oldFunctionAppName) still exists."
                Write-Host "If you want to delete it, you can do so using the Azure Portal or with this PowerShell command:"
                Write-Host "Remove-AzWebApp -ResourceGroupName $($envConfig.ResourceGroupName) -Name $oldFunctionAppName -Force"
            }
        }
    }
    finally {
        # Clean up temporary parameter file
        if (Test-Path $updatedParamFile) {
            Remove-Item $updatedParamFile -Force
        }
    }
    
    Write-Host "Deployment process for $EnvName environment completed."
    Write-Host "--------------------------------------------------"
}

# Start deployment based on the specified environment
if ($Environment -eq "all") {
    # Deploy to all environments
    Write-Host "Deploying to all environments (dev, tst, prd)..."
    Deploy-Environment -EnvName "dev"
    Deploy-Environment -EnvName "tst"
    Deploy-Environment -EnvName "prd"
}
else {
    # Deploy to a specific environment
    Deploy-Environment -EnvName $Environment
}

Write-Host "All deployments completed."
