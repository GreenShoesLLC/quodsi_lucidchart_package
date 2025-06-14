Please do not code, lets just discuss and form a plan.

There is a "Simulate" button the user can click in the quodsi_react app.  The button is located in the Header component in this file:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion\Header.tsx

I shared an image of the button which is next to 2 other buttons.

When the user hits "Simulate" button, i want the button to be immediately disabled and the text to say "Running".  In the current design, the button sizes are changing based upon, i am guessing, the size of the label.  I want the size of the button to stay fixed.

Hitting the Simulate button calls saveAndSubmitSimulationAction 

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\actions\saveAndSubmitSimulationAction.ts

saveAndSubmitSimulationAction adds or updates a model_*.json file in an Azure Batch container and creates an Azure Batch job to simulate using model_*.json as the inputs.  another key thing saveAndSubmitSimulationAction  is create or update a scenarioResultsSchema item.

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\collections\scenarioResultsSchema.ts

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\services\scenarioResultsService.ts

when the job starts, the python code immediate either creates or updates the scenarios_status.json file in the root of the Azure container.  Here is a working version of the contents:

{
  "scenarios": [
    {
      "id": "00000000-0000-0000-0000-000000000000",
      "name": "Base Scenario",
      "reps": 100,
      "forecastDays": 30,
      "runState": "RAN_SUCCESSFULLY",
      "type": "Scenario",
      "seed": 12345,
      "warmupClockPeriod": 0.0,
      "warmupClockPeriodUnit": "Minutes",
      "runClockPeriod": 480.0,
      "runClockPeriodUnit": "Minutes",
      "oneClockUnit": "Minutes",
      "simulationTimeType": "Clock"
    }
  ]
}

In the current design, there is a single hardcoded scenario id and name

"id": "00000000-0000-0000-0000-000000000000",       

"name": "Base Scenario",

One enhancement goal is the ability for the user to specify the scenario name prior to hitting the "Simulate" button.  If the scenario is a new one, then add to the list of scenarios in the scenarios_status.json

Each scenario has a runState based upon these enum:

class RunState(str, Enum):
    NOT_RUN = "NOT_RUN"
    RUNNING = "RUNNING"
    RAN_WITH_ERRORS = "RAN_WITH_ERRORS"
    RAN_SUCCESSFULLY = "RAN_SUCCESSFULLY"

export enum RunState {
    NotRun = 'NOT_RUN',
    Running = 'RUNNING',
    RanWithErrors = 'RAN_WITH_ERRORS',
    RanSuccessfully = 'RAN_SUCCESSFULLY'
}

 when the job initially starts, the runState is changed to Running.  here are the code files for SimStatusJsonUpdater and AzureBatchSimulationRunner

C:\_source\Greenshoes\quodsim\quodsim_runner\lucidchart\sim_status_json_updater.py

C:\_source\Greenshoes\quodsim\quodsim_runner\lucidchart\azure_batch_simulation_runner.py

As the simulation job is running, SimStatusJsonUpdater  is changing scenarios_status.json.  I am not sure in the current design if SimStatusJsonUpdater  can handle specifically updating the proper scenario id row or if it assumes a single hardcoded scenario to update.  

In the current design, each scenario has its own folder within the azure container where the folder name is the scenario id.

in the current design, scenarios_status.json is in the root of the azure container and is a single file that manages the states of many scenarios.  

an alternative design is for each scenario to manage its own state with a file in its own container.  please keep this in mind as we think through pros and cons.

Back in Lucid, every 30 seconds, polling code is executed.  here is the exact code currently being executed:

C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector_lucidchart_v2\src\actions\pollAction.ts

in the current design, first this code fetches scenarioResultsSchema items.  the id of scenarioResultsSchema item holds both the documentId and scenarioId which is then parsed.  The documentId  is the Azure Blob Container name.   In the current design, the pollAction will ALWAYS import the results of every csv file.  one of the most significant features i need to add is to only import the simulation csv files if there are newer files that what is currently saved in Lucid.  A super significant detail the pollAction can only read the id of scenarioResultsSchema items and cannot read the other values.  pollAction can call other APIs or read files from Azure storage obviously though.  How can we design a system that only updates csv file results as needed?

Lets start our discussion with these details.

