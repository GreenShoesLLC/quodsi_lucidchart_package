# Overview
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
                await this.sendSelectionBasedMessage(selectionState, items, currentPage);
            }
        } catch (error) {
            this.handleError('Error handling selection change:', error);
        } finally {
            this.isHandlingSelectionChange = false;
        }
    }

quodsi_editor_extension and quodsim-react are exchanging messages whenever the user changes selection in LucidChart or interacts with the React user interface.

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

Please check out all the files in this folder to see what each payload per message type consists of.
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads

ModelPanel receives the REACT_APP_READY message and executes handleReactReady

The primary result of quodsi_editor_extension and quodsim-react exchanging messages is changing how React components are rendered in the ModelPanel iframe.

ModelPanel leverages SelectionManager which can be found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\src\managers\SelectionManager.ts

SelectionManager depends on these types:
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\SelectionType.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\SelectionState.ts
C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\types\messaging\payloads\SelectionPayloads.ts

quodsi_editor_extension is sending the following messages to QuodsiApp whenever the user changes selection in LucidChart.

    SELECTION_CHANGED_PAGE_NO_MODEL = 'selectionPageNoModel',     // no model exists
    SELECTION_CHANGED_PAGE_WITH_MODEL = 'selectionPageWithModel',   // Page selected, has model
    SELECTION_CHANGED_SIMULATION_OBJECT = 'selectionSimObject', // Single simulation object selected
    SELECTION_CHANGED_MULTIPLE = 'selectionMultiple',         // Multiple items selected
    SELECTION_CHANGED_UNCONVERTED = 'selectionUnconverted',      // Unconverted element selected

QuodsiApp's messageHandlers have been setup to handle the specific messages. messageHandlers.ts found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\services\messageHandlers\messageHandlers.ts





User launches LucidChart and open a document where the Page has been converted to a Model already.

Since nothing is selected

Extension.ts executes which instantiates ModelPanel.  
Within LucidChart, the user clicks on the icon associated with the ModelPanel.  ModelPanic loads up the React app through Index.tsx.
QuodsiApp.tsx is mounted.  REACT_APP_READY message is sent to quodsi_editor_extension from quodsim-react.  ModelPanel's handleReactReady method handles the REACT_APP_READY from quodsim-react.




Here is an example workflow to start our discussion:

User launches LucidChart and creates a new, empty document. The user drags and drops a new Process shape onto the LucidChart page.
Extension.ts executes which instantiates ModelPanel.  
Within LucidChart, the user clicks on the icon associated with the ModelPanel.  ModelPanic loads up the React app through Index.tsx.
QuodsiApp.tsx is mounted.  REACT_APP_READY message is sent to quodsi_editor_extension from quodsim-react.  ModelPanel's handleReactReady method handles the REACT_APP_READY from quodsim-react.

Since the page is not a model yet, quodsi_editor_extension sends SELECTION_CHANGED_PAGE_NO_MODEL to QuodsiApp.

QuodsiApp receives the message and handles it through messageHandlers.

    [MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL]: (data, { setState }) => {
        console.log("[MessageHandlers] Processing SELECTION_CHANGED_PAGE_NO_MODEL:", data);
        setState(prev => ({
            ...prev,
            currentElement: null,
            modelStructure: null,
            modelName: "New Model",
            validationState: null,
            expandedNodes: new Set<string>(),
            // Set visibility states
            showModelName: false,
            showModelItemName: false,
            visibleSections: {
                header: true,      // Only header is visible
                validation: false,
                editor: false,
                modelTree: false
            }
        }));
    },

QuodsiApp.tsx uses the ModelPanelAccordion component found here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion\ModelPanelAccordion.tsx

ModelPanelAccordion renders multiple components and those components rely on the payload to know what to render.  All the React components can be found as files in this folder:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion

The ModelPanelAccordion contains 4 different sections where each section is controlled by an accordian widget.  The 4 sections are:
Header
Validation
Editor		
Model Tree

In the current design, SELECTION_CHANGED_PAGE_NO_MODEL shows the "Initialize Quodsi Model" button.  This is located in Headers.tsx file located here:
C:\_source\Greenshoes\quodsi_lucidchart_package\editorextensions\quodsi_editor_extension\quodsim-react\src\components\ModelPanelAccordion\Header.tsx
Headers.tsx can be configured to show different buttons, etc based upon the received event by QuodsiApp

# SELECTION_CHANGED_PAGE_NO_MODEL = 'selectionPageNoModel',     // no model exists

Header:  Visible. Show "Initialize Quodsi Model" button only.  
Validation: Hide
Editor: Hide
Model Tree: Hide

User hits the "Initialize Quodsi Model" button which sends MessageTypes.CONVERT_PAGE to quodsi_editor_extension.  In quodsi_editor_extension, ModelPanel handles CONVERT_PAGE in the handleConvertRequest method which converts the Page to a Quodsi Model and calls ModelPanel.handleSelectionChange.  

The active selection is the process block the user initially added to the Page.  handleSelectionChange sends the SELECTION_CHANGED_UNCONVERTED back to QuodsiApp.

# SELECTION_CHANGED_UNCONVERTED = 'selectionUnconverted',      // Unconverted element selected

Header:  Visible: SimulationComponentSelector. Show Model Name
Validation: Hide
Editor: Hide
Model Tree: Hide

QuodsiApp shows the SimulationComponentSelector.  The user chooses "Generator" resulting in QuodsiApp.handleElementTypeChange method sending MessageTypes.CONVERT_ELEMENT to quodsi_editor_extension.  quodsi_editor_extension's ModelPanel's handleConvertElement method handles the CONVERT_ELEMENT.
Within handleConvertElement, an instance of the type selected is created from SimulationObjectTypeFactory
const defaultData = SimulationObjectTypeFactory.createElement(data.type, data.elementId);

C:\_source\Greenshoes\quodsi_lucidchart_package\shared\src\factories\SimulationObjectTypeFactory.ts


handleConvertElement will then send MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT back to QuodsiApp.tsx.

# SELECTION_CHANGED_SIMULATION_OBJECT = 'selectionSimObject', // Single simulation object selected

Header:  Visible: SimulationComponentSelector.  Show Model Name and showModelItemName
Validation: Visible
Editor: Visible
Model Tree: Visible

The focus of this chat is understanding how QuodsiApp handles the SELECTION_CHANGED_SIMULATION_OBJECT.  If the selected LucidChart element has been mapped to a Generator, how does QuodsiApp know to show GeneratorEditor?









------------------------------------------------------


# SELECTION_CHANGED_PAGE_WITH_MODEL = 'selectionPageWithModel',   // Page selected, has model

Header:  Visible. Show Simulate, Remove and Validate button.  Show Model Name.
Validation: Visible
Editor: Visible
Model Tree: Visible

# SELECTION_CHANGED_SIMULATION_OBJECT = 'selectionSimObject', // Single simulation object selected

Header:  Visible: SimulationComponentSelector.  Show Model Name and showModelItemName
Validation: Visible
Editor: Visible
Model Tree: Visible

# SELECTION_CHANGED_UNCONVERTED = 'selectionUnconverted',      // Unconverted element selected

Header:  Visible: SimulationComponentSelector. Show Model Name
Validation: Hide
Editor: Hide
Model Tree: Hide

I think it was important that you are aware of the bigger plan but I want to go slowly.

I want to start with SELECTION_CHANGED_PAGE_NO_MODEL event. Help me make the changes so that the message SELECTION_CHANGED_PAGE_NO_MODEL
does:
Header:  Visible. Show Convert button only.  Do not show ModelName or showModelItemName
Validation: Hide
Editor: Hide
Model Tree: Hide



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