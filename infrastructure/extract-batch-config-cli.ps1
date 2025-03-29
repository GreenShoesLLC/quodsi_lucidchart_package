# Create extracted-config directory if it doesn't exist
if (-not (Test-Path ".\extracted-config")) {
    New-Item -ItemType Directory -Path ".\extracted-config" -Force
}

# Azure CLI commands for extracting Batch information
# Get pool details - need to specify account endpoint
$accountEndpoint = "qdsdeveus2batchsim01.eastus2.batch.azure.com"

Write-Host "Extracting pool details..."
az batch pool show --account-name qdsdeveus2batchsim01 --account-endpoint $accountEndpoint --pool-id batchsim-dev-pyproc-pool-02 --output json > ".\extracted-config\batch-pool-details.json"

Write-Host "Extracting all pools..."
az batch pool list --account-name qdsdeveus2batchsim01 --account-endpoint $accountEndpoint --output json > ".\extracted-config\all-batch-pools.json"

Write-Host "Extracting applications..."
az batch application list --name qdsdeveus2batchsim01 --resource-group dev-quodsi-rg-01 --output json > ".\extracted-config\batch-applications.json"

Write-Host "Extracting certificates..."
az batch certificate list --account-name qdsdeveus2batchsim01 --account-endpoint $accountEndpoint --output json > ".\extracted-config\batch-certificates.json"

Write-Host "Extraction completed using Azure CLI. Files are in the extracted-config directory."