#### TODO: add "scenario_name" to performDataAction, 

#### add scenario_name, applicationId, appVersion to saveAndSubmitSimulationAction

#### update LucidSimulationJobSubmissionService taskCommandLine with scenario_name, applicationId, appVersion to saveAndSubmitSimulationAction

#### update Quodsim with scenario_name, applicationId, appVersion 

#### add "name" to scenarioResult

every 30 seconds polling occurs

poll gets list of scenario results which looks like this:

6412b4ea-eabc-4862-beca-798ccfda5a37_00000000-0000-0000-0000-000000000000

checks container from doc id 6412b4ea-eabc-4862-beca-798ccfda5a37

check for file within 00000000-0000-0000-0000-000000000000

#### TODO: Quodsim needs to create a new file "results_token.json"
alternatively, check scenarios.status.json

if "results_token.json" exists, then and only then do the imports


#### TODO: data_connector_quodsim needs to delete "results_token.json" after import



