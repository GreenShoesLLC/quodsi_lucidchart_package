The entry point into quodsi_editor_extension is extension.ts which is found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\extension.ts

extension instantiates ModelPanel
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\panels\ModelPanel.ts

ModelPanel derives from LucidChart's sdk Panel type and serves as an Iframe for quodsim-react to surfaces React pages into. 

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
    SelectionPayloads,
    ModelPayloads,
    ModelItemPayloads,
    ValidationPayloads,
    ModelTreePayloads { }

Please check out all the files in this folder:
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads

ModelPanel receives the REACT_APP_READY message and executes handleReactReady

The primary result of quodsi_editor_extension and quodsim-react exchanging messages is changing how React components are rendered in the ModelPanel iframe.

The focus of this chat is to fine tuning the code that handles changing the React view whenever a selection change occurs.

Many messages between quodsi_editor_extension and quodsim-react occur within a static selection state.

ModelPanel leverages SelectionManager which can be found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\managers\SelectionManager.ts

SelectionManager depends on these types:
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\SelectionType.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\SelectionState.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads\SelectionPayloads.ts


quodsi_editor_extension is sending the following new messages to QuodsiApp.

    SELECTION_CHANGED_PAGE_NO_MODEL = 'selectionPageNoModel',     // Page selected, no model exists
    SELECTION_CHANGED_PAGE_WITH_MODEL = 'selectionPageWithModel',   // Page selected, has model
    SELECTION_CHANGED_SIMULATION_OBJECT = 'selectionSimObject', // Single simulation object selected
    SELECTION_CHANGED_MULTIPLE = 'selectionMultiple',         // Multiple items selected
    SELECTION_CHANGED_UNCONVERTED = 'selectionUnconverted',      // Unconverted element selected

QuodsiApp's message handlers have been preliminarily setup to handle the new specific messages.  I need to make sure they are surfacing the correct components.
QuodsiApp references messageHandlers found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\services\messageHandlers\messageHandlers.ts

Lets focus on the following workflow. 

User launches LucidChart and opens up a document that has not been converted yet.  NOTHING IS SELECTED!!
Extension.ts executes which instantiates ModelPanel.  
Within LucidChart, the user clicks on the icon associated with the ModelPanel.  ModelPanic loads up the React app through Index.tsx.
QuodsiApp.tsx is mounted.  REACT_APP_READY message is sent to quodsi_editor_extension.  ModelPanel's handleReactReady method handles the REACT_APP_READY

    private handleReactReady(): void {
        if (this.reactAppReady) {
            this.logError('React app already ready, skipping initialization');
            return;
        }

        this.logError('handleReactReady');
        this.reactAppReady = true;

        ...

        // Now initialize the model in response to a user-triggered event
        this.initializeModelManager().then(() => {
            const isModel = this.modelManager.isQuodsiModel(currentPage);

            // If not a model, send appropriate message
            if (!isModel) {
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL, {
                    pageId: currentPage.id
                });
                return;
            }

            // Only send initial state and handle selection if it is a model
            this.sendInitialState(currentPage, true, document.id);

            // Update selection using new pattern
            if (this.currentSelection.selectedIds.length > 0) {
                const selectedItems = viewport.getSelectedItems();
                this.handleSelectionChange(selectedItems).catch(error =>
                    this.handleError('Error sending selection update:', error)
                );
            }
        });
    }

Since the page is not a model yet, quodsi_editor_extension sends SELECTION_CHANGED_PAGE_NO_MODEL to QuodsiApp.


QuodsiApp receives the mesaagen and handles it through messageHandlers with this:

        [MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL]: (data, { setState }) => {
            console.log("[MessageHandlers] Processing SELECTION_CHANGED_PAGE_NO_MODEL:", data);
            setState(prev => ({
                ...prev,
                currentElement: null,
                modelStructure: null,
                modelName: "New Model",
                validationState: null,
                expandedNodes: new Set<string>(),
                showConvertButton: true  // Add this to AppState
            }));
        },

The showConvertButton is shown which is part of the Header react component found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion\Header.tsx
The user hits the showConvertButon and MessageTypes.CONVERT_PAGE is sent to quodsi_editor_extension

quodsi_editor_extension through ModelPanel.handleConvertRequest handles the request.  Assuming the conversion is successful, then:
await this.handleSelectionChange(selectedItems);

Since nothing was selected within LucidChart, quodsi_editor_extension sends the event SELECTION_CHANGED_PAGE_WITH_MODEL to Quodsi.

QuodsiApp receives the SELECTION_CHANGED_PAGE_WITH_MODEL and handles it through messageHandlers with this:

        [MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL]: (data, { setState }) => {
            console.log("[MessageHandlers] Processing SELECTION_CHANGED_PAGE_WITH_MODEL:", data);
            setState(prev => {
                // Transform ValidationResult to ValidationState if it exists
                const validationState = data.validationResult ? {
                    summary: {
                        errorCount: data.validationResult.errorCount,
                        warningCount: data.validationResult.warningCount
                    },
                    messages: data.validationResult.messages
                } : null;

                return {
                    ...prev,
                    currentElement: null,
                    modelStructure: data.modelStructure,
                    expandedNodes: new Set<string>(data.expandedNodes || Array.from(prev.expandedNodes)),
                    validationState,
                    modelName: data.modelItemData?.name || "Untitled Model"
                };
            });
        },

QuodsiApp.tsx uses the ModelPanelAccordion component found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion\ModelPanelAccordion.tsx

ModelPanelAccordion renders multiple components and those components rely on the payload to know what to render.  All the components can be found as files in this folder:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion


Within Header.tsx, since nothing was selected in LucidChart the event sent was SELECTION_CHANGED_PAGE_WITH_MODEL, the element is a Model so the Headers.tsx properly shows the "Remove Model" button.

The user hits the "Remove Model" button and all the custom shape data from quodsi is removed properly.  The expectation is that quodsi_editor_extension, after handling the remove model request, would reevaluate selection state, see that nothing is selected and that the page is not a model and then send SELECTION_CHANGED_PAGE_NO_MODEL.

why is the current design not working?






Test each message type individually
Once everything is working, remove the old SELECTION_CHANGED message type and its related code