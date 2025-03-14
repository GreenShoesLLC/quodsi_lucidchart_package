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
