@dataconnectors\quodsi_data_connector_lucidchart_v2\src\actions\saveAndSubmitSimulationAction.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\actions\listScenariosAction.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\features\editors\ScenarioEditor.tsx

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\features\editors\ScenarioCard.tsx

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\actions\getDocumentStatusAction.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\features\modelPanel\PanelHeader.tsx

Whenever the user hits the Simulate button in PanelHeader:

1.  Create a new scenario where the naming convention is has the datetime in it.
2.  Generate a new UUID scenarioId.  I believe it is hardcoded to the empty guid all zero one right now.
3.  Make sure to use that scenarioId when triggering the simulation in Azure Function data connector

# saveAndSubmitSimulationAction.ts
Review saveAndSubmitSimulationAction.ts.  The desire is for code to add the model definition json and diagram svg file to azure blob storage container with the same name as the active documentId.  within that container based upon the documentId, we should be creating a folder with the same name as the scenarioId and that is where it uploads the files.  

## updateScenarioResultsData
I see this code:
```
const scenarioResult = await updateScenarioResultsData(
```
updateScenarioResultsData is a LucidChart extension integration that adds a new lucid datasource called simulation_results and adds a row that has a single column that joins together the document and scenario ids.

this method is called 3x supposely to udpdate status but I am not seeing how status is being updated.  Do we need this code?  Is it unfinished code?


# ModelEditor.tsx 
ModelEditor.tsx now contains a new tab called Simulation Scenarios which shows ScenarioEditor.tsx.  It uses the listScenariosAction.ts azure function action.  the expectation is that it fetches all the folder names in the container that has the same name as documentId.  the folder names are equivalent to scenarioIds so essentially it is getting all the scenarios.  Each scenario is rendered in a ScenarioCard.tsx.

If things are working properly, a user hits the Simulate button, which creates a new scenarioId which creates a new folder within azure blob container for the active document.  Each scenario folder has a model.json file.  a azure batch job is called to run that file as the input to a simulation run.  when the simlation is ran, it puts a zip file and other files into the same scenario folder.  One of the files is status.json.  as the batch job is running, it is frequently updating status.json.  

getDocumentStatusAction.ts can be used to fetch the contents of status.json of a given scenarioid.

when the user clicks simulate button, the current code also triggers a polling feature in the extension to poll and call getDocumentStatusAction.ts.  the results are sent to the react app by the extension app.  in the current design, i believe the react app's PanelHeader.tsx is handling the status.

I want to explore changing the design.

The PanelHeader.tsx would still have a Simulate button.  I like to think of this as the quick Simulate button that is not hidden and very easy for a user to get to.

I propose removing any simulation status from showing up in PanelHeader.tsx though.  Instead, status update is moved to ScenarioEditor.tsx and ScenarioCard.tsx.  We would modify the ScnearioCard to show the last value of the status.

I believes the current design of getDocumentStatusAction.ts is limited to a single scenarioId.  If true, then we either modify it to intelligently get all scenarios in the container or we call getDocumentStatusAction.ts multiple times or we create a new action that does fetch all in 1 call.

In general, I see multiple enhancements going to ScenarioCard.tsx.  A user can delete or rerun or refresh, etc.

Help me think through this and create a good design.