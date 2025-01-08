
# High Level Overview
The entry point into quodsi_editor_extension is extension.ts which is found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\extension.ts

extension instantiates ModelPanel
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\ModelPanel.ts

ModelPanel derives from LucidChart's sdk Panel type and serves as an Iframe for quodsim-react to surfaces React pages into. 
ModelPanel has an icon associated with it within LucidChart web-based UI.

# Pre-Icon Click Phase
When a LucidChart document loads, the following occurs:
1. Extension creates a Panel instance (e.g., ModelPanel)
2. Panel remains in a dormant state
3. Only the panel's icon is visible in the LucidChart toolbar
4. No iframe content is loaded
5. No React app initialization occurs

# Post-Icon Click Phase
When the user clicks the panel icon:
1. Panel becomes active
2. Iframe content loads (e.g., index.html)
3. React application initializes
4. React app sends REACT_APP_READY message
5. Panel processes REACT_APP_READY 
6. Further interactions driven by current LucidChart selection

The primary purpose of Quodsi application is to enhance diagrams with simulation and modeling capabilities.  

One of the features of Quodsi's LucidChart extension package is a "Simulate" button.  When the user hits the "Simulate" button, the application creates a MS  storage Container where the name of the container is the LucidChart active documentId, the diagram is simulated and the various files containing the simulation results are uploaded to the Azure container with the same name as the documentId.

The purpose of this chat is to discuss varioius different ways to visualize the results of the simulation within the LucidChart application.

Here are some options

# Visualization Options

## Diagram Element Specific
In the current design of Quodsi, whenever the user selects a single element Quodsi, the application is already showing the modeling properties for that element.  We could enhance the element specific UI to show results for that specific item.

For example:
* if the selection is an "Entity", the UI could dynamically fetch the data from Azure Storage for that Entity and surface modeling results such as number of exits, etc.
* if the selection is an "Activity", the UI could dynamically fetch the data from Azure Storage for that Activity and surface modeling results such as Utilization, times used, etc.
* if the selection is a "Model", the UI could dynamically fetch the data from Azure Storage for that Model and surface modeling results.

Some cons of this approach is how often the application would have to access Azure Storage to fetch the data.  One potential solution would be to add custom data shape within each element that has the output data we want to surface.

## Dedicated Model Results Page
Whenever the simulation is complete and results are ready, we could create code that has the ability to create a new LucidChart page dedicated to showing a dashboard with the results of the simulation.

## Output Viewer Website
This approach would be a web application that exists outside of LucidChart. The Quodsi Extenstion app would contain hyperlinks to the output viewer.

What are some thoughts that come to mind?