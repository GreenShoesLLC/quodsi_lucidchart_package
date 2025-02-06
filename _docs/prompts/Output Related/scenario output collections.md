
Please read the following documents:

C:\_source\Greenshoes\quodsi_lucidchart_package\_docs\prompts\Data Connectors\Data connectors.md

C:\_source\Greenshoes\quodsi_lucidchart_package\_docs\prompts\Data Connectors\Data.md

The following URLs are relevant to this chat and contain type documentation from Lucid developer docs.

https://developer.lucid.co/reference/dataconnectoraction-sdk
https://developer.lucid.co/reference/dataconnectoractioncontext-sdk
https://developer.lucid.co/reference/dataupdatefiltertype-sdk

https://developer.lucid.co/reference/dataproxy-sdk
https://developer.lucid.co/reference/datasourceproxy-sdk
https://developer.lucid.co/reference/collectionproxy-sdk
https://developer.lucid.co/reference/dataitemproxy-sdk


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

I have craeted Lucid DataSource, Collections and SchemaDefinition in both quodsi_data_connector and quodsi_editor_extension.  Here are the 2 key folders for both respectively.

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector\collections

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\collections


Once you have read everything listed, let me know and I will tell you what we are working on.


In the last chat, you and I created PageSchemaConversionService which can be found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\services\conversion\PageSchemaConversionService.ts

the purpose of PageSchemaConversionService is to analyze the elements (shapes, lines, etc) on the active LucidChart page and determine what type of simulation object they are.  Elements chosen to be a simulation type have a DataItem within the chosen Collection and the element then references that DataItem.

When the user chooses a LucidChart element that has not be converted to a simulation type, then the Quodsi apps offers them the ability to convert it.

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\core\ModelDefinitionPageBuilder.ts




New doc created.
user converts the document to a model.
user drags and drops a new shape.  converts to a generator or activity, etc.





