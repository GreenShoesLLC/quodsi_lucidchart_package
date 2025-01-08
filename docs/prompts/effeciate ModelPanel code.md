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

After the Panel processes REACT_APP_READY and the user performs some model action, there is a significant amount of ModelPanel code that is run such as Model definition creation, model validation, etc.  The focus of this chat is making sure that code is efficient and well design.  The first thing I want to ensure is that model validation only occurs once per message exchange.

Suppose the LucidChart user has a document loaded with a Page that is NOT converted yet.  This would bring the process to #6 where the Panel sends SELECTION_CHANGED_PAGE_NO_MODEL to React.  React app would show the user a "Initialize Quodsi Model".  The user pushes the button, sending the CONVERT_PAGE message to the Panel.

Can you review the following code 
ModelPanel
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\ModelPanel.ts
ModelManager
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\core\ModelManager.ts
ModelValidationService
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\services\validation\ModelValidationService.ts


SelectionManager
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\managers\SelectionManager.ts
TreeStateManager
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\managers\TreeStateManager.ts

Within the flow of using Quodsi within LucidChart, the user is making different selections within LucidChart.  Everytime a new selection occurs, the quodsi_editor_extension has hooked selection changes through the ModelPanel's handleSelectionChange method as seen here.

// Hook selection changes
viewport.hookSelection((items) => {
    modelPanel.handleSelectionChange(items);
});

Here is ModelPanel's handleSelectionChange:
    public async handleSelectionChange(items: ItemProxy[]): Promise<void> {
        this.isHandlingSelectionChange = true;
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) return;

            await this.updateModelStructure();
            const selectionState = await this.selectionManager.determineSelectionState(currentPage, items);
            this.selectionManager.setCurrentSelection(selectionState);

            if (this.reactAppReady) {
                await this.sendSelectionUpdateToReact(items, currentPage);
            }
        } catch (error) {
            this.handleError('Error handling selection change:', error);
        } finally {
            this.isHandlingSelectionChange = false;
        }
    }

quodsi_editor_extension and quodsim-react are exchanging messages through the user use of Quodsi in Lucidchart.

When ModelPanel is instantiated, it triggers quodsim-react to fire up index.tsx found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\index.tsx

index.tsx loads up QuodsiApp component found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\QuodsiApp.tsx

QuodsiApp has this code:

sendMessage(MessageTypes.REACT_APP_READY)

which uses ExtensionMessaging to send REACT_APP_READY to the parent quodsi_editor_extension app.

ExtensionMessaging found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\utils\ExtensionMessaging.ts

ModelPanel handles the REACT_APP_READY message as well as other types. All the different types are found in MessageType found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\MessageTypes.ts

Every type of Message has a certain payload associated with it defined by MessagePayloads:

export interface MessagePayloads extends 
    AppLifecyclePayloads,
    ModelPayloads,
    ElementPayloads,
    ValidationPayloads,
    TreePayloads {}

Please check out all the files in this folder:
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads

ModelPanel receives the REACT_APP_READY message and executes handleReactReady

The primary result of quodsi_editor_extension and quodsim-react exchanging messages is changing React components are rendered in the ModelPanel iframe.

For focus of this chat is when fine tuning the code that handles changing the React view whenever a selection change occurs.

Many messages between quodsi_editor_extension and quodsim-react occur within a static selection state.

ModelPanel leverages SelectionManager which can be found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\managers\SelectionManager.ts

SelectionManager depends on this types:
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\SelectionType.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\SelectionState.ts

Please review the code and help me understand how SelectionManager works.