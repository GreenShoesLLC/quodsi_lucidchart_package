This project revolves around adding simulation functionality to a LucidChart extension. The implementation spans several components:

Key files to examine:
1. Extension app (QuodsiApp) with React/TypeScript:
- C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\QuodsiApp.tsx
- C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion\Header.tsx
- C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion\ModelPanelAccordion.tsx
- C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\SimulationStatusMonitor.tsx
- C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\hooks\useSimulationStatus.ts

2. Extension side:
- C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\ModelPanel.ts
- C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\core\StorageAdapter.ts

3. Data Connector:
- C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector\actions\simulateaction.ts

The simulation is triggered using LucidChart's data connector system. When a user clicks the Simulate button in the React app, it sends a message to the extension, which uses the following code to trigger the simulation:

```typescript
const document = new DocumentProxy(this.client);
const docId = document.id;
console.log("Extension: docId=", docId);
this.client.performDataAction({
    dataConnectorName: 'quodsi_data_connector',
    actionName: 'Simulate',
    actionData: { docId },
    asynchronous: true
});
```

quodsi_data_connector project can be found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector

The Simulate action is implemented within simulateaction.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\dataconnectors\quodsi_data_connector\actions\simulateaction.ts

simulateaction contains this:
const apiUrl = `http://localhost:5000/api/Lucid/simulate/${documentId}`;


Please review these files and provide guidance on any issues or potential improvements in the implementation.

The next major phase of development will be centered around the api/Lucid/simulate/${documentId} endpoiint implemented within the LucidApiClientDotnet project which is a C# ASP.NET 8.X solution. LucidApiClientDotnet root folder is here:
C:\_source\Greenshoes\LucidApiClientDotnet\

Please review the LucidController here:
C:\_source\Greenshoes\quodsi_dotnet_api\quodsi_dotnet_api\API\Controllers\LucidController.cs