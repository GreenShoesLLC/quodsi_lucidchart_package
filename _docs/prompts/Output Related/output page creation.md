The primary purpose of Quodsi application is to enhance diagrams with simulation and modeling capabilities.  

One of the features of Quodsi's LucidChart extension package is a "Simulate" button.  When the user hits the "Simulate" button, the application creates a Microsoft Azure Storage Container where the name of the container is the LucidChart active documentId.  AFter the diagram is simulated, Quodsi creates and uploads various files containing the simulation results to the Azure container with the same name as the documentId.

Attached is a screenshot of the ModelPanelAccordion react component found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion\ModelPanelAccordion.tsx

Within LucidChart, the loaded document's Page is being selected, so within the ModelPanelAccordion, you will see ModelEditor react component found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelEditor.tsx

Within the ModelEditor, there are tabs and the "Output Page" tab shows the OutputForm found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\OutputForm.tsx

In quodsim-react's OutputForm react component, when the user hits the "Create Page" button, the MessageTypes.OUTPUT_CREATE_PAGE message is sent to quodsi_editor_extension where ModelPanel.ts receives the message and handles it in handleOutputCreatePage method:

For the full code of ModelPanel, see this file:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\ModelPanel.ts


Here is most if not all the relevant documentation for the request to add the csv data to the page.

https://lucid.readme.io/reference/documentproxy-sdk
https://lucid.readme.io/reference/elementproxy-sdk
https://lucid.readme.io/reference/pageproxy-sdk
https://lucid.readme.io/reference/blockproxy-sdk
https://lucid.readme.io/reference/tableblockproxy-sdk
https://lucid.readme.io/reference/tablecolumnproxy-sdk
https://lucid.readme.io/reference/tablecellproxy-sdk
https://lucid.readme.io/reference/tablerowproxy-sdk
https://lucid.readme.io/reference/blockdefinition-sdk


Pleease review the code for ModelPanel.handleOutputCreatePage and the documenatation.


Please notice in handleOutputCreatePage it uses LucidApiService where the full code is located here:

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\services\lucidApi.ts

handleOutputCreatePage is currently failing with this console log message:

{
    "name": "TypeError",
    "message": "cannot read property 'getActivityUtilization' of undefined",
    "stack": "    at handleOutputCreatePage (<input>:97)\n    at <anonymous> (<input>:80)\n    at <anonymous> (<input>)\n    at forEach (native)\n    at <anonymous> (<input>:32)\n    at messageFromFrame (<input>:745)\n    at <anonymous> (<input>:48)\n    at <anonymous> (<input>:602)\n"
}

I want to enhance handleOutputCreatePage by showing data from one of the documents found in the Azure blob storage container.

My application will have access to an web api.  My web api is written in C# asp.net 8x.  The full code can be found here:

C:\_source\Greenshoes\quodsi_dotnet_api\quodsi_dotnet_api\API\Controllers\LucidController.cs

Please see LucidController's GetFile method

        [HttpGet("files/{documentId}/{*blobName}")]
        [ProducesResponseType(StatusCodes.Status200OK)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status404NotFound)]
        [ProducesResponseType(typeof(ErrorResponse), StatusCodes.Status500InternalServerError)]
        public async Task<IActionResult> GetFile(string documentId, string blobName)
        {
            try
            {
                if (string.IsNullOrEmpty(documentId) || string.IsNullOrEmpty(blobName))
                {
                    return BadRequest(new ErrorResponse("Document ID and blob name are required"));
                }

                var metadata = await _azureStorageService.GetBlobMetadataAsync(documentId, blobName);
                var stream = await _azureStorageService.GetBlobStreamAsync(documentId, blobName);

                return File(stream, metadata.ContentType, blobName);
            }
            catch (FileNotFoundException)
            {
                return NotFound(new ErrorResponse($"File {blobName} not found"));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving file {BlobName} from {DocumentId}", blobName, documentId);
                return StatusCode(500, new ErrorResponse($"Error retrieving file: {ex.Message}"));
            }
        }







useSimulationStatus utilizing LucidApiService and the full code for useSimulationStatus.ts can be found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\hooks\useSimulationStatus.ts

We also added csvUtils

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\utils\csvUtils.ts

For my first enhancement, i simply want to hardcode the file I want to get and render it somehow in the newly created Page.

Within the container, there should be a folder where the folder name is the same as the LucidChart user id.


            const document = new DocumentProxy(this.client);
            const docId = document.id;
            const user: UserProxy = new UserProxy(this.client);
            const userId = user.id;

Within the userId folder within the container with the name equal to docId I would like to pull down the blob file "activity_utilization.csv"

The GetFile endpoint returns the following:

return File(stream, metadata.ContentType, blobName);

The handleOutputCreatePage method is running in the browser as part of the LucidChart extension code.  I am not sure if it possible to download the file when running javascript browser code.  What is the best practice here?

In a previous chat, you suggested this enhancement to handleOutputCreatePage to fetch and render "activity_utilization.csv"


page does not have a createTable method.  

Here is a website URL that you can use your MCP tool that documents TableBlockProxy we might be able to use:
https://lucid.readme.io/reference/tableblockproxy-sdk


Please review ModelPanelAccordion, ModelEditor and Output page react components.

Please notice the React app uses:
Tailwind for css
Lucide for icons

Once you are done, please let me know and I will share the next features to add to Output Form