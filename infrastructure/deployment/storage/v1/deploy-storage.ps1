# deploy-storage.ps1

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("dev", "tst", "prd", "all")]
    [string]$Environment = "all",
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateResourceGroups = $false
)

# Function to deploy a template
function Deploy-Template {
    param (
        [string]$TemplateFile,
        [string]$ParameterFile,
        [string]$DeploymentName
    )
    
    # Extract resource group from parameters file
    $params = Get-Content $ParameterFile | ConvertFrom-Json
    $resourceGroup = $params.parameters.resourceGroupName.value
    
    Write-Host "Deploying $DeploymentName to $resourceGroup..."
    
    # Create resource group if needed
    if ($CreateResourceGroups) {
        $rg = Get-AzResourceGroup -Name $resourceGroup -ErrorAction SilentlyContinue
        if (-not $rg) {
            Write-Host "Creating resource group: $resourceGroup..."
            New-AzResourceGroup -Name $resourceGroup -Location "eastus2"
            Write-Host "Resource group $resourceGroup created successfully." -ForegroundColor Green
        }
        else {
            Write-Host "Resource group $resourceGroup already exists." -ForegroundColor Yellow
        }
    }
    
    # Deploy the template
    New-AzResourceGroupDeployment `
        -ResourceGroupName $resourceGroup `
        -TemplateFile $TemplateFile `
        -TemplateParameterFile $ParameterFile `
        -Name $DeploymentName
    
    if ($?) {
        Write-Host "Deployment of $DeploymentName to $resourceGroup completed successfully." -ForegroundColor Green
    }
    else {
        Write-Host "Deployment of $DeploymentName to $resourceGroup failed." -ForegroundColor Red
    }
}

# Ensure we're logged in to Azure
$context = Get-AzContext
if (-not $context) {
    Write-Host "Not logged in to Azure. Please log in..."
    Connect-AzAccount
}

# Deploy based on the selected environment
switch ($Environment) {
    "dev" {
        Deploy-Template -TemplateFile ".\quodsi-env-storage-template.json" `
                       -ParameterFile ".\quodsi-dev-storage-params.json" `
                       -DeploymentName "quodsi-dev-storage-deployment"
    }
    "tst" {
        Deploy-Template -TemplateFile ".\quodsi-env-storage-template.json" `
                       -ParameterFile ".\quodsi-tst-storage-params.json" `
                       -DeploymentName "quodsi-tst-storage-deployment"
    }
    "prd" {
        Deploy-Template -TemplateFile ".\quodsi-env-storage-template.json" `
                       -ParameterFile ".\quodsi-prd-storage-params.json" `
                       -DeploymentName "quodsi-prd-storage-deployment"
    }
    "all" {
        # Deploy all storage accounts
        Deploy-Template -TemplateFile ".\quodsi-env-storage-template.json" `
                       -ParameterFile ".\quodsi-dev-storage-params.json" `
                       -DeploymentName "quodsi-dev-storage-deployment"
        
        Deploy-Template -TemplateFile ".\quodsi-env-storage-template.json" `
                       -ParameterFile ".\quodsi-tst-storage-params.json" `
                       -DeploymentName "quodsi-tst-storage-deployment"
        
        Deploy-Template -TemplateFile ".\quodsi-env-storage-template.json" `
                       -ParameterFile ".\quodsi-prd-storage-params.json" `
                       -DeploymentName "quodsi-prd-storage-deployment"
    }
}

Write-Host "Storage deployment script completed."
