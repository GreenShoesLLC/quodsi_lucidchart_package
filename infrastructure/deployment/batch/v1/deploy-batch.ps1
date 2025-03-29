# deploy-batch.ps1

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("account", "dev-pool", "tst-pool", "prd-pool", "all")]
    [string]$DeploymentType = "all",
    
    [Parameter(Mandatory=$false)]
    [string]$ResourceGroupName = "shared-quodsi-rg-01",
    
    [Parameter(Mandatory=$false)]
    [switch]$CreateResourceGroup = $false
)

# Function to deploy a template
function Deploy-Template {
    param (
        [string]$TemplateFile,
        [string]$ParameterFile,
        [string]$DeploymentName,
        [string]$TargetResourceGroup
    )
    
    Write-Host "Deploying $DeploymentName to $TargetResourceGroup..."
    New-AzResourceGroupDeployment `
        -ResourceGroupName $TargetResourceGroup `
        -TemplateFile $TemplateFile `
        -TemplateParameterFile $ParameterFile `
        -Name $DeploymentName
    
    if ($?) {
        Write-Host "Deployment of $DeploymentName completed successfully." -ForegroundColor Green
    }
    else {
        Write-Host "Deployment of $DeploymentName failed." -ForegroundColor Red
    }
}

# Ensure we're logged in to Azure
$context = Get-AzContext
if (-not $context) {
    Write-Host "Not logged in to Azure. Please log in..."
    Connect-AzAccount
}

# Create resource group if needed
if ($CreateResourceGroup) {
    Write-Host "Creating resource group: $ResourceGroupName..."
    $rg = Get-AzResourceGroup -Name $ResourceGroupName -ErrorAction SilentlyContinue
    if (-not $rg) {
        New-AzResourceGroup -Name $ResourceGroupName -Location "eastus2"
        Write-Host "Resource group $ResourceGroupName created successfully." -ForegroundColor Green
    }
    else {
        Write-Host "Resource group $ResourceGroupName already exists." -ForegroundColor Yellow
    }
}

# Deploy based on the selected type
switch ($DeploymentType) {
    "account" {
        Deploy-Template -TemplateFile ".\quodsi-shared-batch-template.json" `
                       -ParameterFile ".\quodsi-shared-batch-params.json" `
                       -DeploymentName "quodsi-shared-batch-deployment" `
                       -TargetResourceGroup $ResourceGroupName
    }
    "dev-pool" {
        Deploy-Template -TemplateFile ".\quodsi-pool-template.json" `
                       -ParameterFile ".\quodsi-pool-dev-params.json" `
                       -DeploymentName "quodsi-dev-pool-deployment" `
                       -TargetResourceGroup $ResourceGroupName
    }
    "tst-pool" {
        Deploy-Template -TemplateFile ".\quodsi-pool-template.json" `
                       -ParameterFile ".\quodsi-pool-tst-params.json" `
                       -DeploymentName "quodsi-tst-pool-deployment" `
                       -TargetResourceGroup $ResourceGroupName
    }
    "prd-pool" {
        Deploy-Template -TemplateFile ".\quodsi-pool-template.json" `
                       -ParameterFile ".\quodsi-pool-prd-params.json" `
                       -DeploymentName "quodsi-prd-pool-deployment" `
                       -TargetResourceGroup $ResourceGroupName
    }
    "all" {
        # Deploy shared Batch account
        Deploy-Template -TemplateFile ".\quodsi-shared-batch-template.json" `
                       -ParameterFile ".\quodsi-shared-batch-params.json" `
                       -DeploymentName "quodsi-shared-batch-deployment" `
                       -TargetResourceGroup $ResourceGroupName
        
        # Wait a bit for the Batch account to be fully provisioned
        Write-Host "Waiting 30 seconds for Batch account provisioning to complete..." -ForegroundColor Yellow
        Start-Sleep -Seconds 30
        
        # Deploy environment pools
        Deploy-Template -TemplateFile ".\quodsi-pool-template.json" `
                       -ParameterFile ".\quodsi-pool-dev-params.json" `
                       -DeploymentName "quodsi-dev-pool-deployment" `
                       -TargetResourceGroup $ResourceGroupName
        
        Deploy-Template -TemplateFile ".\quodsi-pool-template.json" `
                       -ParameterFile ".\quodsi-pool-tst-params.json" `
                       -DeploymentName "quodsi-tst-pool-deployment" `
                       -TargetResourceGroup $ResourceGroupName
        
        Deploy-Template -TemplateFile ".\quodsi-pool-template.json" `
                       -ParameterFile ".\quodsi-pool-prd-params.json" `
                       -DeploymentName "quodsi-prd-pool-deployment" `
                       -TargetResourceGroup $ResourceGroupName
    }
}

Write-Host "Deployment script completed."
