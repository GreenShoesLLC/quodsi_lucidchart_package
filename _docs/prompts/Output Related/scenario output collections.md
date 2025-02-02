
Please read the following documents:

C:\_source\Greenshoes\quodsi_lucidchart_package\_docs\prompts\Data Connectors\Data connectors.md

C:\_source\Greenshoes\quodsi_lucidchart_package\_docs\prompts\Data Connectors\Data.md


Here is the source code for 2 Lucid data connector examples in their development documentation:

* Basic Data Connector example

C:\_source\Greenshoes\sample-lucid-extensions\data-connector-example\dataconnectors\data-connector-1

* Asana example

C:\_source\Greenshoes\sample-lucid-extensions\asana


In my extension app, I have already defined a button that when pushed has the required performDataAction code ready to trigger a data connector.

await this.client.performDataAction({
    dataConnectorName: 'quodsi_data_connector',
    actionName: 'ImportSimulationResults',
    actionData: { 'documentId': docId, 'pageId': pageId, 'userId': userId },
    asynchronous: true
});

From the shared documentation and examples, I created quodsi_data_connector, located here:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector

My manifest.json file is located here:

C:\_source\Greenshoes\quodsi_lucidchart_package\manifest.json

Please see all my actions in the following folder:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector\actions

1. Import (importSimulationResults) - This action is called by the editor extension when users clicks a button, etc.
2. HardRefresh - This action is called by an automatic process when users first open a document with existing data managed by this extension.
3. Poll - This action is called by an automatic process every 30 seconds while users are viewing a document with data managed by this extension.
4. Patch - This action is called by an automatic process when changes need to be sent back to the API

Lucid schema and interface definitions can be found in the files in this root directory:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector\collections

The following URLs are relevant to this chat and contain type documentation from Lucid developer docs.

https://developer.lucid.co/reference/dataconnectoraction-sdk
https://developer.lucid.co/reference/dataconnectoractioncontext-sdk
https://developer.lucid.co/reference/dataupdatefiltertype-sdk


Once you have read everything listed, let me know and I will tell you what we are working on.

The actions are not 100% implemented yet and that is my current focus.

Please read all the provided documents and code files and then review the current code for importSimulationResultsAction.

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector\actions\importSimulationResultsAction.ts




