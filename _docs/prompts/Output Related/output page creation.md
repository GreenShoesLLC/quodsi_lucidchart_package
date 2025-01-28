The primary purpose of Quodsi application is to enhance diagrams with simulation and modeling capabilities.  

One of the features of Quodsi's LucidChart extension package is a "Simulate" button.  When the user hits the "Simulate" button, the application creates a Microsoft Azure Storage Container where the name of the container is the LucidChart active documentId.  AFter the diagram is simulated, Quodsi creates and uploads various files containing the simulation results to the Azure container with the same name as the documentId.

Attached is a screenshot of the ModelPanelAccordion react component found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion\ModelPanelAccordion.tsx

Within LucidChart, the page is being selected, so within the ModelPanelAccordion, you will see ModelEditor react component found here:

C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelEditor.tsx

Please review ModelPanelAccordion and ModelEditor code.

Please notice the React app uses:
Tailwind for css
Lucide for icons

# Add Tab to ModelPanel
I would like the ability for the user to toggle between the ModelEditor and the new React component OutputPageEditor defined below.

# OutputPageEditor

I want to create a React component called OutputPageEditor. OutputPageEditor contains the following:

* Ability for the user to define the name of the "Output Page"
* Ability for the user to click a "Create" button.  


Clicking the "Create" button should send OUTPUT_CREATE_PAGE message back to quodsi_editor_extension.  The payload should include the name of the "Output Page"

This will require adding a new MessageTypes of OUTPUT_SHOW_CREATE_PAGE
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\MessageTypes.ts


ModelPanel will need to handle receiving the OUTPUT_CREATE_PAGE.  In the handler, for now just put in placeholder code such as logging out a message to the console.