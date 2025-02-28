# Overview
Every 30 seconds, Quodsi is pulling 

  "dataConnectors": [
    {
      "name": "quodsi_data_connector",
      "oauthProviderName": "lucid",
      "callbackBaseUrl": "http://localhost:7071/api/dataConnector/",
      "pollingInterval": 30,
      "dataActions": {
        "Simulate": "simulate",
        "ImportSimulationResults": "importSimulationResults",
        "Poll": "poll",
        "Patch": "patch",
        "HardRefresh": "hardRefresh"
      }
    }
  ]

C:\_source\Greenshoes\quodsi_lucidchart_package\manifest.json

## pollAction
export const pollAction = async (action: DataConnectorAsynchronousAction) => {

The full source code can be found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1\src\actions\pollAction.ts


## AzureStorageService
AzureStorageService is code within blahb
C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1\src\services\azureStorageService.ts


checkout activityDataService.fetchActivityData found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v1\src\collections\activityDataService.ts




