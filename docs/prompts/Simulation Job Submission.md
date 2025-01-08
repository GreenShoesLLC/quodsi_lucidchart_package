Please read the markdown files located in this folder:
C:\_source\Greenshoes\quodsi_dotnet_api\quodsi_dotnet_api\docs\SimulationRelated

I want to focus this chat on the Simulation Job Submission portion.

## 3. Simulation Job Submission
### Job Submission Service
- `C:\_source\Greenshoes\quodsi_dotnet_api\quodsi_dotnet_api\Services\SimulationJobSubmissionService.cs`
  - Manages Azure Batch job creation
  - Handles task configuration and submission

### Controller Integration
- `C:\_source\Greenshoes\quodsi_dotnet_api\quodsi_dotnet_api\API\Controllers\LucidController.cs`
  - `Simulate` endpoint implementation
  - Job submission orchestration


In Quodsi's LucidChart extension package, there exists a "Simulate" button.  When the user hits the "Simulate" button, LucidController.Simulate method is executed.
C:\_source\Greenshoes\quodsi_dotnet_api\quodsi_dotnet_api\API\Controllers\LucidController.cs

LucidController.Simulate creates and uploads a json file into Batch storage container with the name of LucidChart documented.  For details, please read this:
C:\_source\Greenshoes\quodsi_dotnet_api\quodsi_dotnet_api\_docs\SimulationRelated\_2_document-processing-doc.md

After the json file is uploaded, LucidController.Simulate creates and submits a batch job with LucidSimulationJobSubmissionService as documented here:
C:\_source\Greenshoes\quodsi_dotnet_api\quodsi_dotnet_api\_docs\SimulationRelated\_3_simulation-job-submission-doc_v2.md

LucidSimulationJobSubmissionService creates a job with the following command:

Command Structure:
```csharp
string taskCommandLine = $"/bin/bash -c \"source $AZ_BATCH_NODE_STARTUP_DIR/wd/batch_env/bin/activate && python3 -m pip list && python3 ${appPackageEnvVar}/quodsim_runner/lucidchart/cli.py --document-id {documentId} --page-id {pageId} --user-id {userId}\"";
```

For details about the configuration of the Batch resource, please read this document:
C:\_source\Greenshoes\quodsi_dotnet_api\quodsi_dotnet_api\_docs\SimulationRelated\_4_batch_azure_overview.md

The Batch resource has an "Application" that contains the zip file created from the following code:
C:\_source\Greenshoes\quodsim\make_zip.py

The zip file created has been uploaded as the "quodsim" application.  The zip file contains /quodsim_runner/lucidchart/cli.py.
C:\_source\Greenshoes\quodsim\quodsim_runner\lucidchart\cli.py

cli.py will be executed within Azure Batch for the production deployment of Quodsi.  While in development, cli.py is ran locally.

cli.py is primarily leveraging the dataclass AzureBatchSimulationRunner which can be found here:
C:\_source\Greenshoes\quodsim\quodsim_runner\lucidchart\azure_batch_simulation_runner.py

As its name suggests, AzureBatchSimulationRunner is the code that manages running a simulation from files stored in Azure Blob Storage and applications uploaded to Azure Batch.

I would like to request a code review of AzureBatchSimulationRunner.

A major type used by AzureBatchSimulationRunner is the dataclass ModelDefinitionJsonReader found here:
C:\_source\Greenshoes\quodsim\quodsim\readers\model_definition_json_reader.py

I would like to request a code review of ModelDefinitionJsonReader.

ModelDefinition dataclass as well as its attribute dataclasses such as EntityDef, ConnectorDef, etc can be found as files in this root folder:
C:\_source\Greenshoes\quodsim\quodsim\model_definition


For this chat, I would like to focus on the job that was created using LucidSimulationJobSubmissionService, specifically the command of the task and then the execution of that job using /quodsim_runner/lucidchart/cli.py.

After you have read the documentation and get a good understanding of code flow, I would like to start with code review /quodsim_runner/lucidchart/cli.py.  After making adjustments based upon code review, I want to create some valuable test cases.  Here are my existing test cases:
C:\_source\Greenshoes\quodsim\tests