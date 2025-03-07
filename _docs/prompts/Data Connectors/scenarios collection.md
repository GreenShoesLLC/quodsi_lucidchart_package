
# saveAndSubmitSimulationAction
when the user hits the simulate button, the quodsi_editor_extension calls client.performDataAction within the ModelPanel.handleSimulateModel method

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\ModelPanel.ts

               await this.client.performDataAction({
                    dataConnectorName: 'quodsi_data_connector',
                    actionName: 'SaveAndSubmitSimulation',
                    actionData: { 'documentId': documentId, 'pageId': pageId, 'userId': userId, 'model': serializedModel },
                    asynchronous: true
                });

Lucid will call the quodsi_data_connector_lucidchart_v2 Azure Function App's dataConnectorHttpTrigger which then, based upon actionName, call the saveAndSubmitSimulationAction action. Here are the file paths for these types:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\functions\dataConnectorHttpTrigger.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\actions\saveAndSubmitSimulationAction.ts

For more information about the actions, read this doc:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\actions\README.md

Effectively, the user is "running a scenario" of the model from the active LucidChart page.

The result of this action is a MS Azure container is created or updated with scenario simulation result data files.  Typically, but not a requirement, the container id is the same as the id of the LucidChart document where the request came from.

In Quodsi, a LucidChart Document is where models can be created.  There is a 1 LucidChart Page per Quodsi model design.  Since a LucidChart Document can have more than 1 LucidChart Page, the LucidChart Document can have more than 1 Quodsi Model.  Every Quodsi Model can have 1 to many Quodsi scenarios.

Because a LucidChart document can have more than 1 model and more than 1 scenario, the result output files associated with running a scenario needs to be stored in folders within the container.  One folder approach would be container/model/scenario.  an alternative folder approach is simply container/scenarioId if the scenarioId is truly unique.  My preference is container/scenarioId if i can design it correctly.

LucidChart extension apps have a concept of "DataSources" and "Collections" which allow third party apps like Quodsi to programmatically inject data.  Quodsi already has define a DataSource called "simulation_results".  For more information, please read the following doc:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\collections\README.md


# ScenarioResults Schema

Request #1:  Whenever the saveAndSubmitSimulationAction is executed, add a new item to the "simulation_results" DataSource that allows future running code the knowledge to know where to find the scenario results data file in Azure Storage.

here is what I am currently thinking:

Create a new ScenarioResultsSchema in the src\collections directory:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\collections

Follow the pattern as seen in other schema files such as entityThroughputRepSummarySchema found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\collections\entityThroughputRepSummarySchema.ts

ScenarioResultsSchema will have at least 1 field:

{ name: "id", type: ScalarFieldTypeEnum.STRING },

another field would be "state" which is a string.

One possible definition is exactly the same fields as ModelDefinitionSchema found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\data_sources\model\schemas\ModelDefinitionSchema.ts

# pollAction

A feature of Lucid extension apps is that you can define a pollAction which Lucid will call every 30 seconds.  

I have created a working version of Quodsi's pollAction here.
C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\actions\pollAction.ts

The current version of the pollAction is just a work in progress and can be 100% rewritten to support our needs.

Within Quodsi, i want to poll the primary ids of every ScenarioResultsSchema item.  

A limitation within the pollAction is that it can only programmatically get the primary keys of items in collections.  So, if the ScenarioResultsSchema contains a 'state' field, the pollAction cannot read that.  pollAction can only fetch the primary key.

here are some file paths to the typescipt definitions for Lucid's

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\node_modules\lucid-extension-sdk\dataconnector\actions\action.d.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\node_modules\lucid-extension-sdk\dataconnector\datasourceclient.d.ts

So, since we can only fetch the ids, I feel ScenarioResultsSchema id needs to be constructed from a combination of documentId and scenarioId.

I have existing code that utilizes DataConnectorAsynchronousAction to update data here:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\collections\simulationResultsService.ts



Please do not reply with code yet.  I would like to discuss this.