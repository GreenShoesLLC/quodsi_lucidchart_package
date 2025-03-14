// Combined Bicep template for Function App, Batch Account, and Storage Account
// Generated on 03/14/2025 16:51:36

// Parameters
@description('Environment name: dev, tst, or prd')
param environment string = 'dev'
param location string = resourceGroup().location
param batchLocation string = 'eastus2'

// Variables
var functionAppName = '${environment}-quodsi-func-lucid-v3'
var appServicePlanName = '${environment}-quodsi-asp-01'
var functionStorageName = '${environment}quodsistfunc01'
var batchAccountName = 'qds${environment}eus2batchsim01'
var batchStorageName = 'qds${environment}eus2stbatch01'

// Storage Account for Function App
resource functionStorage 'Microsoft.Storage/storageAccounts@2022-09-01' = {
  name: functionStorageName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
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
    name: 'Y1'
    tier: 'Dynamic'
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
    {
      name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
      value: 'InstrumentationKey=c75f9ca1-55eb-45fb-99b8-0279c43c17c5;IngestionEndpoint=https://eastus-8.in.applicationinsights.azure.com/;LiveEndpoint=https://eastus.livediagnostics.monitor.azure.com/;ApplicationId=cec19a90-3460-4799-a3a9-0a7dbbb6a4a6'
    }
    {
      name: 'QUODSI_API_URL'
      value: 'http://localhost:5000/api/'
    }
    {
      name: 'WEBSITE_CONTENTSHARE'
      value: 'dev-quodsi-func-lucid-v3925e58'
    }
    {
      name: 'AzureStorageConnectionString'
      value: 'DefaultEndpointsProtocol=https;AccountName=qdsdeveus2stbatch01;AccountKey=WtgAKSSYHB8WM2/XbFyR7YSNWVhvvzDDzrrHPUWd7Yd9BJt8O96+cUFhocRjJa6JL5FbdLwOZC8w+ASt2kJSHw==;EndpointSuffix=core.windows.net'
    }
    {
      name: 'NODE_ENV'
      value: 'development'
    }
    {
      name: 'DefaultApplicationId'
      value: 'LucidQuodsim'
    }
    {
      name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
      value: 'DefaultEndpointsProtocol=https;AccountName=devquodsilucidfunctionap;AccountKey=enQw2o+Nr2eT2kQjAo3cZB7mYEbsHLai4jJnankDScSrl8Q8PyMKePQJbESd/1ei8e3qgRaVm+wi+AStUPUBbA==;EndpointSuffix=core.windows.net'
    }
    {
      name: 'AZURE_FUNCTION_PROXY_BACKEND_URL_DECODE_SLASHES'
      value: 'true'
    }
    {
      name: 'WEBSITE_RUN_FROM_PACKAGE'
      value: 'https://devquodsilucidfunctionap.blob.core.windows.net/function-releases/20250314131745-be855176-41a2-4e3c-8856-c40b456d4b6e.zip?sv=2018-03-28&sr=b&sig=ozRQSdloztOPGO3GAl6XRCn76ppuGg7KPrW8JsPF98Q%3D&st=2025-03-14T13%3A13%3A39Z&se=2035-03-14T13%3A18%3A39Z&sp=r'
    }
    {
      name: 'FUNCTIONS_WORKER_RUNTIME'
      value: 'node'
    }
    {
      name: 'BatchAccountUrl'
      value: 'https://qdsdeveus2batchsim01.eastus2.batch.azure.com'
    }
    {
      name: 'WEBSITE_MOUNT_ENABLED'
      value: '1'
    }
    {
      name: 'DefaultAppVersion'
      value: '1.0'
    }
    {
      name: 'BatchAccountName'
      value: 'qdsdeveus2batchsim01'
    }
    {
      name: 'BatchAccountKey'
      value: '6rMWQgeH/l6DU6moH4IEZ6DBxiqe4sJ4T++tzaRVsVXwF7GstjTxbspRX43KIb/7GAKV/uHuxb+9+ABaOCo8mA=='
    }
    {
      name: 'AzureWebJobsStorage'
      value: 'DefaultEndpointsProtocol=https;AccountName=devquodsilucidfunctionap;AccountKey=enQw2o+Nr2eT2kQjAo3cZB7mYEbsHLai4jJnankDScSrl8Q8PyMKePQJbESd/1ei8e3qgRaVm+wi+AStUPUBbA==;EndpointSuffix=core.windows.net'
    }
    {
      name: 'BatchPoolId'
      value: 'batchsim-dev-pyproc-pool-02'
    }
    {
      name: 'FUNCTIONS_EXTENSION_VERSION'
      value: '~4'
    }
      ]
      netFrameworkVersion: 'v4.0'
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
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
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
    poolAllocationMode: 'BatchService'
  }
  dependsOn: [
    batchStorage
  ]
}

// Outputs
output functionAppHostName string = functionApp.properties.defaultHostName
output batchAccountEndpoint string = batchAccount.properties.accountEndpoint
output functionStorageConnectionString string = 'DefaultEndpointsProtocol=https;AccountName=${functionStorage.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${functionStorage.listKeys().keys[0].value}'
