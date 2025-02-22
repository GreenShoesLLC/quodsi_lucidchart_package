TODO: page is true container for list of scenarios in v1.
TODO: as of this writing, quodsim-react does not handle MessageTypes.SIMULATION_STARTED
TODO: formalize the runState possibilities more officially.

One major feature within Quodsi is updating the user on the state of a simulation run.

Header.tsx contains a button a user can click to start a simulation.  When the user does that, the following occurs:

quodsim-react sends the MessageTypes.SIMULATE_MODEL

quodsi_editor_extension handles MessageTypes.SIMULATE_MODEL and sends either MessageTypes.SIMULATION_STARTED or MessageTypes.ERROR to quodsim-react

QuodsiApp's code for handling messages can found in messageHandlers located here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\services\messageHandlers\messageHandlers.ts

Notice QuodsiApp.tsx calls useSimulationStatus located here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\hooks\useSimulationStatus.ts

useSimulationStatus calls an api endpoint and gets back status for all scenarios of the documentId.  
The response is serialized into a PageStatus

export interface PageStatus {
    hasContainer: boolean;
    scenarios: Scenario[];
    statusDateTime: string; // ISO format
}
export interface Scenario extends SimulationObject {
    reps: number;
    forecastDays: number;
    runState: 'not run' | 'running' | 'ran with errors' | 'ran successfully';
    type: SimulationObjectType.Scenario;
}
export interface SimulationObject {
  id: string;
  name: string;
  type: SimulationObjectType;
}

Please review those files and then I will share the enhancements I want to make.


# Enhancement requests
export enum RunState {
    NotRun = 'NOT_RUN',
    Running = 'RUNNING',
    RanWithErrors = 'RAN_WITH_ERRORS',
    RanSuccessfully = 'RAN_SUCCESSFULLY'
}

useSimulationStatus is called within Quodsi. Based upon the response serialized into an instance of PageStatus, i would like to trigger updates to the UI of quodsim-react that get rendered in SimulationStatusMonitor.tsx and Header.tsx.

Here is how I define the business logic for the changes:

## RunState of 'NOT_RUN'
set timer to 30 seconds or maybe off
Model is valid:
    "Simulate" button enabled
    Simulation Status to "Model Ready"
Model is not valid
    "Simulate" button disable
    Simulation Status to "Invalid Model"

## On "Simulate" button click
Increase timer to 5 seconds
Disable "Simulate" button
Immediately change Simulation Status to "Running"

## RunState of 'RUNNING'


## RunState of 'RAN_SUCCESSFULLY'
Decreases timer frequency to 30 seconds or maybe even turn off
Enable "Simulate" button
change Simulation Status to "Output Ready"

## RunState of 'RAN_WITH_ERRORS'
Decreases timer frequency to 30 seconds or maybe even turn off
Enable "Simulate" button
change Simulation Status to "Invalid Model"


C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\utils\simulationState.ts