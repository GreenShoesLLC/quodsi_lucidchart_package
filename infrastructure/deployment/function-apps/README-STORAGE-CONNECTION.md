# Obtaining the Batch Storage Connection String

When deploying the function app using the simplified template (`function-app-template-simple.json`), you need to provide the connection string for the batch storage account. Follow these steps to get it:

## Using Azure PowerShell

```powershell
# Connect to Azure if not already connected
Connect-AzAccount

# Select the subscription containing the storage account
Select-AzSubscription -SubscriptionName "Microsoft Azure Sponsorship"

# Get the storage account key
$storageKey = (Get-AzStorageAccountKey -ResourceGroupName "dev-quodsi-rg-01" -Name "qdsdeveus2stbatch01").Value[0]

# Generate the connection string
$connectionString = "DefaultEndpointsProtocol=https;AccountName=qdsdeveus2stbatch01;EndpointSuffix=core.windows.net;AccountKey=$storageKey"

# Display the connection string (or use it directly in your parameter file)
$connectionString
```

## Using Azure Portal

1. Go to the Azure Portal (https://portal.azure.com)
2. Navigate to your storage account (qdsdeveus2stbatch01)
3. In the left sidebar, under "Security + networking", click on "Access keys"
4. Click the "Show" button for key1
5. Click the "Copy to clipboard" button next to the "Connection string" field

## Using the Connection String

Once you have the connection string, update your parameter file (`function-app-tst-params-simple.json`) with it:

```json
"batchStorageConnectionString": {
  "value": "YOUR_CONNECTION_STRING_HERE"
}
```

## Security Considerations

- The connection string contains sensitive information (the account key), so handle it securely
- Consider using Azure Key Vault for storing this connection string in production scenarios
- For testing purposes, you can pass it directly in the parameter file, but be careful not to commit this file to source control
