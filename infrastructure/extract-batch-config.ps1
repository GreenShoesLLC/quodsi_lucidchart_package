# Connect to Azure if not already connected
# Remove this line if you're already connected
Connect-AzAccount

# Connect to Azure if not already connected
# You're already connected, as shown in your output

# Set your subscription
$subscriptionId = "24eb1b16-3e2d-4a36-a357-f6512893e258"
Set-AzContext -SubscriptionId $subscriptionId

# Get Batch account context
$batchAccountName = "qdsdeveus2batchsim01"
$resourceGroupName = "dev-quodsi-rg-01"

# Get the account keys
$batchAccount = Get-AzBatchAccount -AccountName $batchAccountName -ResourceGroupName $resourceGroupName
$batchContext = $batchAccount.Context

# Extract specific pool details
$poolName = "batchsim-dev-pyproc-pool-02"
Get-AzBatchPool -BatchContext $batchContext -Id $poolName | ConvertTo-Json -Depth 10 > ".\extracted-config\batch-pool-details.json"

# For certificates, we'll use a different approach since Get-AzBatchCertificate is obsolete
# This requires the Azure Batch module directly
$certs = Get-AzBatchCertificate -AccountName $batchAccountName -ResourceGroupName $resourceGroupName
$certs | ConvertTo-Json -Depth 5 > ".\extracted-config\batch-certificates.json"

# For applications, adjust the command to use account name and resource group
$apps = Get-AzBatchApplication -AccountName $batchAccountName -ResourceGroupName $resourceGroupName
foreach ($app in $apps) {
    $appId = $app.ApplicationId
    $packages = Get-AzBatchApplicationPackage -AccountName $batchAccountName -ResourceGroupName $resourceGroupName -ApplicationId $appId
    $packages | ConvertTo-Json -Depth 5 > ".\extracted-config\batch-app-$appId.json"
}

Write-Host "Extraction completed. Files are in the extracted-config directory."