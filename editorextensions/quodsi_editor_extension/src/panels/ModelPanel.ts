// panels/ModelPanel.ts
import {
    PanelLocation,
    EditorClient,
    ItemProxy,
    PageProxy,
    Viewport,
    BlockProxy,
    DocumentProxy,
    ElementProxy,
    JsonObject as LucidJsonObject,
    Panel,
    UserProxy,
    PageDefinition,
    TableBlockProxy,
    BlockDefinition,
    DataActionResponse,
    DataProxy
} from 'lucid-extension-sdk';
import {
    ModelItemData,
    ExtensionMessaging,
    isValidMessage,
    JsonSerializable,
    MessagePayloads,
    MessageTypes,
    MetaData,
    ModelStructure,
    UnconvertedSelectionState,
    SimulationObjectSelectionState,
    JsonObject as SharedJsonObject,
    SelectionType,
    Model,
    SimulationObjectType,
    SelectionState,
    EditorReferenceData,
    DiagramElementType,
    ModelSerializerFactory

} from '@quodsi/shared';
import { createLucidApiService, parseCsvBlob, calculateTableDimensions } from '@quodsi/shared';
import { ModelManager } from '../core/ModelManager';
import { SelectionManager, TreeStateManager } from '../managers';
import { PageSchemaConversionService } from '../services/conversion/PageSchemaConversionService';
import { ModelDataSource } from '../data_sources/model/ModelDataSource';
import { LucidElementFactory } from '../services/LucidElementFactory';
import { LucidPageConversionService } from '../services/conversion/LucidPageConversionService';
import { StorageAdapter } from '../core/StorageAdapter';
import LucidVersionManager from '../versioning';
import { SimulationResultsReader } from '../data_sources';
import { SimulationResultsTableGenerator } from '../data_sources/simulation_results/SimulationResultsTableGenerator';
import { DynamicSimulationResultsTableGenerator } from '../data_sources/simulation_results/DynamicSimulationResultsTableGenerator';
import { SimulationResultsDashboard } from '../data_sources/simulation_results/SimulationResultsDashboard';



export class ModelPanel extends Panel {
    private static readonly LOG_PREFIX = '[ModelPanel]';
    private loggingEnabled: boolean = false;
    private selectionManager: SelectionManager;
    private treeStateManager: TreeStateManager;
    private messaging: ExtensionMessaging;
    private reactAppReady: boolean = false;
    private modelManager: ModelManager;
    private expandedNodes: Set<string> = new Set();
    private currentModelStructure?: ModelStructure = undefined;
    private currentSelection: SelectionState = {
        pageId: '',
        selectedIds: [],
        selectionType: SelectionType.NONE
    };
    private isHandlingSelectionChange: boolean = false;
    private versionManager: LucidVersionManager;

    constructor(client: EditorClient, modelManager: ModelManager) {
        super(client, {
            title: 'Quodsi Model',
            url: 'quodsim-react/index.html',
            location: PanelLocation.RightDock,
            iconUrl: 'https://lucid.app/favicon.ico',
            width: 300
        });
        this.versionManager = new LucidVersionManager();
        // Initialize services and managers but don't perform any operations yet
        this.messaging = ExtensionMessaging.getInstance();
        this.modelManager = modelManager;
        this.selectionManager = new SelectionManager(modelManager);
        this.treeStateManager = new TreeStateManager(modelManager);
        // Set up event handlers
        this.setupModelMessageHandlers();
        this.log('Model Panel initialized');
    }
    public setLogging(enabled: boolean): void {
        this.loggingEnabled = enabled;
        this.log(`Logging ${enabled ? 'enabled' : 'disabled'}`);
    }

    private isLoggingEnabled(): boolean {
        return this.loggingEnabled;
    }

    private log(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.log(`${ModelPanel.LOG_PREFIX} ${message}`, ...args);
        }
    }

    private logError(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.error(`${ModelPanel.LOG_PREFIX} ${message}`, ...args);
        }
    }

    private setupModelMessageHandlers(): void {
        this.logError('Setting up message handlers START');
        // React App Ready - already handled by BasePanel

        // Model Operations
        this.messaging.onMessage(MessageTypes.REACT_APP_READY, () => {
            this.logError('REACT_APP_READY message received in handler');
            this.handleReactReady();
        });
        this.messaging.onMessage(MessageTypes.SIMULATE_MODEL, () =>
            this.handleSimulateModel()
        );
        this.messaging.onMessage(MessageTypes.SIMULATION_STATUS_UPDATE, (data) =>
            this.handleSimulationStatusUpdate(data)
        );
        // Setup error handler
        this.messaging.onMessage(MessageTypes.ERROR, (payload) => {
            this.logError('Error received:', payload);
        });

        this.messaging.onMessage(MessageTypes.CONVERT_ELEMENT, (data) =>
            this.handleConvertElement(data));
        this.messaging.onMessage(MessageTypes.REMOVE_MODEL, () => this.handleRemoveModel());
        this.messaging.onMessage(MessageTypes.CONVERT_PAGE, () => this.handlePageConvertRequest());
        this.messaging.onMessage(MessageTypes.VALIDATE_MODEL, () => this.handleValidateModel());

        // Element Operations
        this.messaging.onMessage(MessageTypes.UPDATE_ELEMENT_DATA, (data) =>
            this.handleUpdateElementData(data));

        // Tree State Management
        this.messaging.onMessage(MessageTypes.TREE_NODE_TOGGLE, (data) =>
            this.handleTreeNodeToggle(data.nodeId, data.expanded));
        this.messaging.onMessage(MessageTypes.TREE_STATE_UPDATE, (data) =>
            this.handleTreeStateUpdate(data.expandedNodes));
        this.messaging.onMessage(MessageTypes.TREE_NODE_EXPAND_PATH, (data) =>
            this.handleExpandPath(data.nodeId));
        this.messaging.onMessage(MessageTypes.OUTPUT_CREATE_PAGE, (data) => {
            this.handleOutputCreatePage(data);
        });
        this.logError('Setting up message handlers END');
    }

    private async handleOutputCreatePage(data: { pageName: string }): Promise<void> {
        console.log('[ModelPanel] Output page creation requested:', data.pageName);

        try {
            const document = new DocumentProxy(this.client);
            // Create new page
            const def: PageDefinition = {
                title: data.pageName,
            };
            const page = document.addPage(def);
            // this.addActivityUtilizationTable(page)
            this.handleOutputCreateDashboard()
            console.log('[SimulationResultsTableGenerator] Successfully called addActivityUtilizationTable');

        } catch (error) {
            console.error('[SimulationResultsTableGenerator] Error creating output page:', error);
            this.messaging.sendMessage(MessageTypes.ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }
    private async handleOutputCreatePage2(data: { pageName: string }): Promise<void> {
        console.log('[ModelPanel] Output page creation requested:', data.pageName);

        try {
            const document = new DocumentProxy(this.client);
            const user = new UserProxy(this.client);
            const docId = document.id;
            const userId = user.id;

            if (!docId || !userId) {
                throw new Error('Document ID or User ID is missing');
            }

            const validationResult = await this.modelManager.validateModel();
            if (validationResult.isValid || !validationResult.isValid) {
                try {
                    const modelDefinition = await this.modelManager.getModelDefinition();

                    if (modelDefinition) {
                        // Create a serializer using the factory (will use latest version by default)
                        const serializer = ModelSerializerFactory.create(modelDefinition);

                        // Attempt serialization
                        const serializedModel = serializer.serialize(modelDefinition);
                        this.log('serializedModel:', JSON.stringify(serializedModel));

                        // Create new page
                        const def: PageDefinition = {
                            title: data.pageName,
                        };
                        const page = document.addPage(def);
                        this.addTableBlock(page)
                        const viewport = new Viewport(this.client);
                        const currentPage = viewport.getCurrentPage();
                    }
                } catch (error) {
                    // Handle serialization errors
                    this.log('Model serialization failed:', error);
                }
            }
            else {
                this.log('validationResult:', validationResult);
            }

            const viewport = new Viewport(this.client);
            await this.client.performDataAction({
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'ImportSimulationResults',
                actionData: { documentId: docId, userId: userId, pageId: viewport.getCurrentPage()?.id },
                asynchronous: true
            });
            console.log('[ModelPanel] Successfully called ImportSimulationResults');

            // Add code to test SimulationResultsReader
            try {
                console.log('[ModelPanel2] Testing SimulationResultsReader...');
                const resultsReader = new SimulationResultsReader(this.client);

                // Get current page ID
                const currentPage = viewport.getCurrentPage();
                if (!currentPage) {
                    console.log('[ModelPanel] No current page found');
                    return;
                }

                // Try to get model data for the current page
                const modelData = await resultsReader.getModelDataForPage(currentPage.id);
                console.log('[ModelPanel2] Model data for current page:', modelData);

                // Check if we have simulation results
                const hasResults = await resultsReader.hasSimulationResults();
                console.log('[ModelPanel2] Has simulation results:', hasResults);

                // Try to get activity utilization data
                const activityUtilization = await resultsReader.getActivityUtilizationData();
                console.log('[ModelPanel2] Activity Utilization data count:', activityUtilization.length);

                if (activityUtilization.length > 0) {
                    console.log('[ModelPanel2] First activity utilization:', {
                        name: activityUtilization[0].Name,
                        meanUtilization: activityUtilization[0].utilization_mean,
                        maxUtilization: activityUtilization[0].utilization_max
                    });
                }
            } catch (error) {
                console.error('[ModelPanel] Error testing SimulationResultsReader:', error);
            }

        } catch (error) {
            console.error('[ModelPanel] Error creating output page:', error);
            this.messaging.sendMessage(MessageTypes.ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }
    private async handleOutputCreateDashboard(): Promise<void> {
        try {
            console.log('[ModelPanel] Creating simulation results dashboard...');

            // Create dashboard instance with custom configuration
            const dashboard = new SimulationResultsDashboard(this.client, {
                title: 'Simulation Results Overview',
                tableSpacing: 60, // Extra space between tables
                initialX: 50,
                initialY: 50,
                tableWidth: 900, // Wider tables
                tableConfig: {
                    formatNumbers: true,
                    percentDecimals: 1,
                    numberDecimals: 2,
                    styleHeader: true,
                    dynamicColumns: true,
                    maxColumns: 6 // Limit columns for readability
                },
                // Customize which data types to include
                includedDataTypes: {
                    activityUtilization: true,
                    activityRepSummary: true,
                    activityTiming: true,
                    entityThroughput: true,
                    resourceRepSummary: true,
                    entityState: true
                },
                // Custom column configurations for specific table types
                customColumnConfig: {
                    activityUtilization: {
                        columnOrder: [
                            'Name',
                            'utilization_mean',
                            'utilization_max',
                            'capacity_mean',
                            'capacity_max'
                        ],
                        excludeColumns: ['Id']
                    },
                    activityRepSummary: {
                        columnOrder: [
                            'activity_id',
                            'rep',
                            'utilization_percentage',
                            'throughput_rate',
                            'capacity'
                        ]
                    }
                }
            });

            // Generate a dashboard with the current date/time in the name
            const timestamp = new Date().toLocaleString().replace(/[/\\:]/g, '-');
            const result = await dashboard.createDashboard(`Simulation Results - ${timestamp}`);

            console.log(`[ModelPanel] Dashboard created with ${result.tables.length} tables`);

            // Optional: You could add additional elements to the page here
            // For example, add a title or description text block

            if (result.emptyDataTypes.length > 0) {
                console.log(`[ModelPanel] The following data types had no data: ${result.emptyDataTypes.join(', ')}`);
            }

            if (result.errors.length > 0) {
                console.warn(`[ModelPanel] ${result.errors.length} errors occurred while creating the dashboard`);
                result.errors.forEach(err => {
                    console.error(`[ModelPanel] Error creating ${err.type} table:`, err.error);
                });
            }
        } catch (error) {
            console.error('[ModelPanel] Error creating simulation results dashboard:', error);
        }
    }

    private async addActivityUtilizationTable(page: PageProxy): Promise<void> {
        try {
            console.log('[ModelPanel2] Testing SimulationResultsReader...');
            const resultsReader = new SimulationResultsReader(this.client);

            // Get current page ID

            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                console.log('[ModelPanel] No current page found');
                return;
            }

            // Try to get model data for the current page
            const modelData = await resultsReader.getModelDataForPage(currentPage.id);
            console.log('[ModelPanel2] Model data for current page:', modelData);

            // Check if we have simulation results
            const hasResults = await resultsReader.hasSimulationResults();
            console.log('[ModelPanel2] Has simulation results:', hasResults);

            // Try to get activity utilization data
            const activityUtilization = await resultsReader.getActivityUtilizationData();
            console.log('[ModelPanel2] Activity Utilization data count:', activityUtilization.length);

            if (activityUtilization.length > 0) {
                console.log('[ModelPanel2] First activity utilization:', {
                    name: activityUtilization[0].Name,
                    meanUtilization: activityUtilization[0].utilization_mean,
                    maxUtilization: activityUtilization[0].utilization_max
                });
            }

            // Initialize the generator
            const tableGenerator = new DynamicSimulationResultsTableGenerator(resultsReader, {
                formatNumbers: true,
                percentDecimals: 1,
                numberDecimals: 2,
                styleHeader: true,
                dynamicColumns: true, // Only include columns with data
                maxColumns: 6, // Limit number of columns
                columnOrder: [
                    'Id',
                    'Name',
                    'utilization_mean',
                    'utilization_max',
                    'capacity_mean',
                    'capacity_max'
                ],
                excludeColumns: ['Id'],   // Don't show the ID column
            });

            // Create an activity utilization table
            const currentY = 0
            const activityUtilizationTable = await tableGenerator.createActivityUtilizationTable(
                page,
                this.client,
                {
                    position: { x: 50, y: currentY },
                    width: 700,
                    title: 'Activity Utilization'
                }
            );
        } catch (error) {
            console.error('[ModelPanel] Error testing SimulationResultsReader:', error);
        }

    }
    private async addTableBlock(page: PageProxy): Promise<void> {
        console.log('[ModelPanel] Starting addTableBlock method...');
        try {
            // Create mock data for testing
            console.log('[ModelPanel] Creating mock CSV data...');
            const mockCsvData = [
                ["Activity", "Utilization", "Capacity"],
                ["Production", "85.4%", "100"],
                ["Packaging", "72.1%", "150"],
                ["Quality Control", "63.8%", "75"]
            ];
            console.log('[ModelPanel] Mock data created:', mockCsvData);

            // Calculate table dimensions
            console.log('[ModelPanel] Calculating table dimensions...');
            const { width, height } = calculateTableDimensions(mockCsvData);
            console.log('[ModelPanel] Table dimensions calculated: width =', width, 'height =', height);

            // Load Table block class
            console.log('[ModelPanel] Loading TableBlock class...');
            await this.client.loadBlockClasses(['DefaultTableBlock']);
            console.log('[ModelPanel] TableBlock class loaded successfully');

            // Create table block
            console.log('[ModelPanel] Creating TableBlock definition...');

            const blockDef: BlockDefinition = {
                className: "DefaultTableBlock",
                boundingBox: {
                    x: 100,
                    y: 100,
                    w: 400,
                    h: 300,
                },
            };
            console.log('[ModelPanel] BlockDefinition created:', blockDef);

            console.log('[ModelPanel] Adding TableBlock to page...');
            const tableBlock = page.addBlock(blockDef) as TableBlockProxy;

            console.log('[ModelPanel] TableBlock added to page successfully');

            // Get row and column counts
            const rowCount = mockCsvData.length;
            const columnCount = mockCsvData[0]?.length || 0;
            console.log('[ModelPanel] Table dimensions from data: rows =', rowCount, 'columns =', columnCount);

            // Get the initial cell to use as reference
            console.log('[ModelPanel] Getting initial rows from table...');
            const rows = tableBlock.getRows();
            console.log('[ModelPanel] Retrieved', rows.length, 'initial rows');

            let lastCell = rows[0].getCells()[0];
            console.log('[ModelPanel] Got reference to first cell');

            // Add rows as needed
            console.log('[ModelPanel] Starting to add', (rowCount - 1), 'additional rows...');
            for (let i = 1; i < rowCount; i++) {
                console.log('[ModelPanel] Adding row', i);
                const newRow = tableBlock.addRow(lastCell);
                lastCell = newRow.getCells()[0];
                console.log('[ModelPanel] Row', i, 'added successfully');
            }
            console.log('[ModelPanel] All rows added successfully');

            // Reset to use first row for column additions
            console.log('[ModelPanel] Resetting reference cell for column additions');
            lastCell = rows[0].getCells()[0];

            // Add columns as needed
            console.log('[ModelPanel] Starting to add', (columnCount - 1), 'additional columns...');
            for (let i = 1; i < columnCount; i++) {
                console.log('[ModelPanel] Adding column', i);
                const newColumn = tableBlock.addColumn(lastCell);
                lastCell = newColumn.getCells()[0];
                console.log('[ModelPanel] Column', i, 'added successfully');
            }
            console.log('[ModelPanel] All columns added successfully');

            // Populate table data
            console.log('[ModelPanel] Starting to populate table data...');
            const updatedRows = tableBlock.getRows();
            console.log('[ModelPanel] Retrieved', updatedRows.length, 'rows for populating data');

            mockCsvData.forEach((rowData, rowIndex) => {
                console.log('[ModelPanel] Populating row', rowIndex, 'with data:', rowData);
                const row = updatedRows[rowIndex];
                const cells = row.getCells();
                console.log('[ModelPanel] Row', rowIndex, 'has', cells.length, 'cells');

                rowData.forEach((cellValue, colIndex) => {
                    console.log('[ModelPanel] Setting cell [', rowIndex, ',', colIndex, '] to value:', cellValue);
                    const cell = cells[colIndex];
                    cell.setText(String(cellValue));

                    // Style header row
                    // if (rowIndex === 0) {
                    //     console.log('[ModelPanel] Styling header cell at column', colIndex);
                    //     cell.setBackgroundColor('#f0f0f0');
                    //     cell.setBold(true);
                    // }
                });
                console.log('[ModelPanel] Finished populating row', rowIndex);
            });

            console.log('[ModelPanel] Table data population completed successfully');
            console.log('[ModelPanel] Table block creation and configuration completed successfully');

        } catch (error) {
            console.error('[ModelPanel] ❌ Error creating table block:', error);
            console.error('[ModelPanel] Error details:', error instanceof Error ? error.stack : 'Unknown error');
            this.messaging.sendMessage(MessageTypes.ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error occurred'
            });
        }
    }

    private async handleSimulationStatusUpdate(
        data: MessagePayloads[MessageTypes.SIMULATION_STATUS_UPDATE]
    ): Promise<void> {
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();

            if (!currentPage) {
                throw new Error('No active page found');
            }

            // Update the simulation status using StorageAdapter
            this.modelManager.getStorageAdapter().setSimulationStatus(currentPage, data.pageStatus);

            // Send a success message back to React
            this.sendTypedMessage(MessageTypes.SIMULATION_STATUS_UPDATE, {
                pageStatus: data.pageStatus
            });
        } catch (error) {
            this.logError('Failed to update page status:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Failed to update simulation status: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
    private async updateModelStructure(): Promise<void> {
        // Get model structure from ModelManager
        this.currentModelStructure = await this.modelManager.getModelStructure();
        this.log('Model structure updated:', this.currentModelStructure);

        // Validate model
        const validationResult = await this.modelManager.validateModel();
        this.log('Model validation result:', validationResult);

        // If we're not in a selection change context, notify the React app of the validation update
        if (!this.isHandlingSelectionChange) {
            this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
        }
    }

    private async createSimulationObjectPayload(
        page: ElementProxy,  // Keep this as PageProxy for the actual page
        item: ItemProxy,  // Change this to ItemProxy to accept both ElementProxy and PageProxy
        basePayload: any
    ): Promise<MessagePayloads[MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT]> {
        const metadata = this.modelManager.getMetadata(item);
        if (!metadata) {
            throw new Error('No metadata found for item');
        }

        const modelItemData = await this.buildModelItemData(item);
        const simulationSelection: SimulationObjectSelectionState = {
            pageId: page.id,  // Use the page parameter here
            selectedId: item.id,
            objectType: metadata.type,
            diagramElementType: item instanceof BlockProxy ? DiagramElementType.BLOCK : DiagramElementType.LINE
        };

        // Create referenceData if it's a Generator
        this.log("DEBUG - Before Generator check:", {
            itemId: item.id,
            metadata,
            type: metadata?.type,
            isGenerator: metadata?.type === SimulationObjectType.Generator
        });

        let referenceData: EditorReferenceData = {};
        if (metadata.type === SimulationObjectType.Generator) {
            const modelDef = await this.modelManager.getModelDefinition();
            if (modelDef) {
                const allEntities = modelDef.entities.getAll();

                referenceData.entities = allEntities.map(e => {
                    this.log("Mapping entity:", e);
                    return {
                        id: e.id,
                        name: e.name
                    };
                });
            }
        }
        if (metadata.type === SimulationObjectType.Activity || metadata.type === SimulationObjectType.Connector) {
            const modelDef = await this.modelManager.getModelDefinition();
            if (modelDef) {
                const requirements = modelDef.resourceRequirements.getAll();
                referenceData.resourceRequirements = requirements
            }
        }

        return {
            ...basePayload,
            simulationSelection,
            modelItemData,
            modelStructure: this.currentModelStructure,
            referenceData
        };
    }


    private async handleConvertElement(
        data: MessagePayloads[MessageTypes.CONVERT_ELEMENT]
    ): Promise<void> {
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                throw new Error('No active page found');
            }

            // Get the element from viewport
            const selectedItems = viewport.getSelectedItems();
            const element = selectedItems.find(item => item.id === data.elementId);
            if (!element) {
                throw new Error(`Element not found in selection: ${data.elementId}`);
            }

            // Get model definition (might be needed by some conversions)
            const modelDef = await this.modelManager.getModelDefinition();
            if (!modelDef) {
                throw new Error('Model definition not found');
            }

            // Create the platform object with conversion flag
            // This will handle all the data creation and storage internally
            const elementFactory = new LucidElementFactory(this.modelManager.getStorageAdapter());
            const platformObject = elementFactory.createPlatformObject(
                element,
                data.type,
                true  // isConversion flag
            );

            await this.updateModelStructure();

            if (!this.currentModelStructure) {
                throw new Error('Failed to update model structure after conversion');
            }

            const payload = await this.createSimulationObjectPayload(
                currentPage,
                element,
                {
                    selectionState: {
                        pageId: currentPage.id,
                        selectedIds: [data.elementId],
                        selectionType: SelectionType.ACTIVITY
                    }
                }
            );
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT, payload);

        } catch (error) {
            this.logError('Error converting element:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Failed to convert element: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    /**
     * Handles tree node expansion state changes
     */
    private handleTreeNodeToggle(nodeId: string, expanded: boolean): void {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (!currentPage) return;

        this.treeStateManager.handleNodeToggle(nodeId, expanded, currentPage);
        this.sendTreeStateUpdate();
    }

    /**
     * Handles bulk tree state updates
     */
    private handleTreeStateUpdate(expandedNodes: string[]): void {
        this.log('Tree state update:', { expandedNodes });
        this.expandedNodes = new Set(expandedNodes);

        // Get current page and save to storage
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (currentPage) {
            this.log('Saving expanded nodes to storage:', expandedNodes);
            this.modelManager.setExpandedNodes(currentPage, expandedNodes);
        }

        this.sendTreeStateUpdate();
    }

    /**
     * Expands the path to a specific node
     */
    private handleExpandPath(nodeId: string): void {
        if (!this.currentModelStructure) return;

        // Get path nodes from ModelManager
        const pathNodes = this.modelManager.findPathToNode(this.currentModelStructure, nodeId);

        // Add all nodes in path to expanded set
        pathNodes.forEach(id => this.expandedNodes.add(id));

        this.sendTreeStateUpdate();
    }

    /**
     * Sends current tree state to React app
     */
    private sendTreeStateUpdate(): void {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (!currentPage) return;

        this.sendTypedMessage(MessageTypes.TREE_STATE_SYNC, {
            expandedNodes: Array.from(this.expandedNodes),
            pageId: currentPage.id
        });
    }
    private async initializeModelManager(): Promise<void> {
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();

        if (!currentPage || !this.modelManager.isQuodsiModel(currentPage)) {
            this.log('Page is not a Quodsi model, skipping initialization');
            return;
        }

        try {
            const modelData = this.modelManager.getElementData<Model>(currentPage);
            if (modelData) {
                await this.modelManager.initializeModel(modelData, currentPage);
                this.log('Model initialization complete');
            }
        } catch (error) {
            this.logError('Error initializing model:', error);
            throw new Error(`Failed to initialize model: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Shows the panel
     */
    public show(): void {
        this.log('Show called');
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        this.log('Current page at show:', currentPage);

        this.initializeModelManager(); // Re-initialize when panel is shown
        super.show();
    }

    /**
     * Hides the panel
     */
    public hide(): void {
        this.log('Hide called');
        super.hide();
    }

    async handleValidateRequest(): Promise<void> {
        const validationResult = await this.modelManager.validateModel();

        // Send separate validation result message for explicit validation requests
        this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);
    }

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

    private async sendSelectionBasedMessage(selectionState: SelectionState, items: ItemProxy[], currentPage: ElementProxy): Promise<void> {
        this.log("DEBUG - sendSelectionBasedMessage START - Selection Type:", selectionState.selectionType);
        if (items.length === 1) {
            const item = items[0];
            this.log("DEBUG - Item metadata:", this.modelManager.getMetadata(item));
        }
        // Convert ElementProxy to PageProxy if needed
        const page = new PageProxy(currentPage.id, this.client);

        // Early check - if page is not a model, always send PAGE_NO_MODEL
        if (!this.modelManager.isQuodsiModel(page)) {
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL, {
                pageId: page.id
            });
            return;
        }
        const modelStructure = this.currentModelStructure || { elements: [], hierarchy: {} };
        const expandedNodes = this.treeStateManager.getExpandedNodes();
        const validationResult = await this.modelManager.validateModel();
        const document = new DocumentProxy(this.client);
        const documentId = document.id;
        const basePayload = {
            selectionState,
            modelStructure,
            expandedNodes,
            validationResult,
            documentId
        };

        switch (selectionState.selectionType) {
            case SelectionType.NONE: {
                // Build model item data for the page since it's a model
                const modelItemData = await this.buildModelItemData(page);

                const payload = {
                    ...basePayload,
                    pageSelection: {
                        pageId: currentPage.id
                    },
                    modelStructure,  // Already in basePayload
                    modelItemData    // Add the page's model data
                };
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL, payload);
                break;
            }

            case SelectionType.MULTIPLE: {
                const modelItemData = await Promise.all(
                    items.map(item => this.buildModelItemData(item))
                );

                const payload = {
                    ...basePayload,
                    multipleSelection: {
                        pageId: currentPage.id,
                        selectedIds: items.map(item => item.id)
                    },
                    modelItemData
                };
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_MULTIPLE, payload);
                break;
            }

            case SelectionType.UNCONVERTED_ELEMENT: {
                if (items.length === 1) {
                    const item = items[0];
                    const modelItemData = await this.buildModelItemData(item);
                    modelItemData.isUnconverted = true;

                    const unconvertedSelection: UnconvertedSelectionState = {
                        pageId: currentPage.id,
                        selectedId: item.id,
                        diagramElementType: item instanceof BlockProxy ? DiagramElementType.BLOCK : DiagramElementType.LINE
                    };

                    const payload = {
                        ...basePayload,
                        unconvertedSelection,
                        modelItemData
                    };
                    this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_UNCONVERTED, payload);
                }
                break;
            }

            case SelectionType.ACTIVITY:
            case SelectionType.CONNECTOR:
            case SelectionType.ENTITY:
            case SelectionType.GENERATOR:
            case SelectionType.RESOURCE:
            case SelectionType.MODEL: {
                if (items.length === 1) {
                    const item = items[0];
                    const metadata = this.modelManager.getMetadata(item);
                    if (metadata) {
                        const payload = await this.createSimulationObjectPayload(
                            currentPage,  // Pass the page
                            item,        // Pass the selected item
                            basePayload
                        );
                        this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_SIMULATION_OBJECT, payload);
                    }
                }
                break;
            }

            default: {
                // Build model item data for the page since it's a model
                const modelItemData = await this.buildModelItemData(page);

                const payload = {
                    ...basePayload,
                    pageSelection: {
                        pageId: currentPage.id
                    },
                    modelStructure,  // Already in basePayload
                    modelItemData    // Add the page's model data
                };
                this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_WITH_MODEL, payload);
                break;
            }
        }
    }

    private handleError(message: string, error: any): void {
        this.logError(`${message}`, error);
        this.sendTypedMessage(MessageTypes.ERROR, {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
    // Keep this as the primary builder
    private async buildModelItemData(item: ItemProxy | PageProxy): Promise<ModelItemData> {
        const rawData = this.modelManager.getElementData(item);
        const metadata = this.modelManager.getMetadata(item);

        // Determine name based on item type
        let name: string;
        if (item instanceof PageProxy) {
            name = item.getTitle() || 'Untitled Model';
        } else if (item instanceof BlockProxy) {
            name = item.id || 'Unnamed Block';
        } else {
            name = 'Unnamed Connector';
        }

        // Ensure metadata has all required fields
        const defaultMetadata: MetaData = {
            type: item instanceof PageProxy ? SimulationObjectType.Model : SimulationObjectType.None,
            version: this.modelManager.CURRENT_VERSION,
            lastModified: new Date().toISOString(),
            id: item.id,
            ...(metadata || {})
        };

        // Handle unconverted elements
        if (item instanceof ItemProxy && this.modelManager.isUnconvertedElement(item)) {
            defaultMetadata.isUnconverted = true;
        }

        // Convert Lucid JsonObject to shared JsonObject type
        const convertedData = rawData ? JSON.parse(JSON.stringify(rawData)) as SharedJsonObject : {};

        return {
            id: item.id,
            data: convertedData,
            metadata: defaultMetadata,
            name
        };
    }

    // Helper method for building multiple items
    private async buildModelItemDataArray(items: (ItemProxy | PageProxy)[]): Promise<ModelItemData[]> {
        return Promise.all(items.map(item => this.buildModelItemData(item)));
    }

    /**
     * Handles model removal request
     */
    private async handleRemoveModel(): Promise<void> {
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) return;

            // Remove the model data from the page
            await this.modelManager.removeModelFromPage(currentPage);

            // Since the model was just removed, we know this is now a non-model page
            // Directly send PAGE_NO_MODEL state - no need for modelRemoved message
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED_PAGE_NO_MODEL, {
                pageId: currentPage.id
            });

        } catch (error) {
            this.handleError('Error removing model:', error);
        }
    }

    private async handleReactReady(): Promise<void> {
        if (this.reactAppReady) {
            this.logError('React app already ready, skipping initialization');
            return;
        }

        this.logError('handleReactReady');
        this.reactAppReady = true;

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            this.logError('No active page found during React ready');
            return;
        }

        try {
            // Check for and handle any needed version upgrades
            // await this.versionManager.handlePageLoad(currentPage);
            // Now initialize the model in response to a user-triggered event
            await this.initializeModelManager();

            // Get current selection state and send appropriate message
            const selectedItems = viewport.getSelectedItems();
            await this.handleSelectionChange(selectedItems);
        } catch (error) {
            this.handleError('Error during React ready initialization:', error);
        }
    }
    /**
     * Handles page conversion request
     */
    private async handlePageConvertRequest(): Promise<void> {
        this.log('Handling convert request');

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            this.sendTypedMessage(MessageTypes.CONVERSION_ERROR, {
                error: 'No active page found'
            });
            return;
        }

        try {

            this.log('Creating dataProxy');
            const dataProxy = new DataProxy(this.client);
            this.log('Creating modelDataSource');
            const modelDataSource = new ModelDataSource(dataProxy);
            this.log('Creating pageSchemaConversionService');
            const pageSchemaConversionService = new PageSchemaConversionService(modelDataSource);
            this.log('pageSchemaConversionService.convertPage');


            // const result2 = await pageSchemaConversionService.convertPage(currentPage);

            const storageAdapter = new StorageAdapter();
            const lucidElementFactory = new LucidElementFactory(storageAdapter)
            const lucidPageConversionService = new LucidPageConversionService(this.modelManager, lucidElementFactory, storageAdapter)
            lucidPageConversionService.convertPage(currentPage)


            const selectedItems = viewport.getSelectedItems();
            await this.handleSelectionChange(selectedItems);

        } catch (error) {
            this.logError('Conversion error:', error);
            this.sendTypedMessage(MessageTypes.CONVERSION_ERROR, {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Handles element data update
     */
    private async handleUpdateElementData(
        updateData: MessagePayloads[MessageTypes.UPDATE_ELEMENT_DATA]
    ): Promise<void> {
        this.log('Received element update data:', updateData);

        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                throw new Error('No active page found');
            }
            // Get the element from viewport
            const selectedItems = viewport.getSelectedItems();
            if (updateData.type == 'Model') {
                this.log('Received element type of Model:', updateData.type);
                this.modelManager.setElementData(
                    currentPage,
                    updateData.data,
                    SimulationObjectType.Model
                );

                // this.modelManager.updateElement({
                //     id: currentPage.id,
                //     type: SimulationObjectType.Model,
                //     ...updateData.data
                // });
            }
            else {

                // Update current selection first
                this.currentSelection = {
                    pageId: currentPage.id,
                    selectedIds: selectedItems.map(item => item.id),
                    selectionType: this.currentSelection.selectionType
                };

                const element = selectedItems.find(item => item.id === updateData.elementId);
                if (!element) {
                    throw new Error(`Element not found in selection: ${updateData.elementId}`);
                }

                // Save element data using ModelManager
                await this.modelManager.saveElementData(
                    element,
                    updateData.data,
                    updateData.type,
                    currentPage
                );
            }

            // Send success message
            this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
                elementId: updateData.elementId
            });
            // Debug logging
            this.log('Debug - Selection state:', {
                currentSelectionIds: this.currentSelection.selectedIds,
                updatedElementId: updateData.elementId,
                isElementInSelection: this.currentSelection.selectedIds.includes(updateData.elementId),
                selectedItems: selectedItems.map(item => item.id)
            });
            // Update validation and selection state
            await this.modelManager.validateModel();

            // Only update selection if this element is selected
            if (this.currentSelection.selectedIds.includes(updateData.elementId)) {
                await this.handleSelectionChange(selectedItems);
            }

        } catch (error) {
            this.logError('Error updating element:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Failed to update element: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    private async handleSimulateModel(): Promise<void> {
        this.log('Handling simulate model request');

        try {
            // Get the document ID using DocumentProxy
            const documentId = new DocumentProxy(this.client).id;
            const viewport = new Viewport(this.client);
            const userId = new UserProxy(this.client).id;
            // const activePageProxy = viewport.getCurrentPage();
            const activePageProxy: PageProxy | null | undefined = viewport.getCurrentPage();

            let pageId: string = 'undefined';

            if (activePageProxy) {
                pageId = activePageProxy.id;
            }
            else {
                this.log('No active page');
                this.sendTypedMessage(MessageTypes.ERROR, {
                    error: `Failed to start simulation: No active page`
                });
                return;
            }


            this.log(`Extension: docId=${documentId}, pageId=${pageId}, userId=${userId}`);

            const modelDefinition = await this.modelManager.getModelDefinition();
            if (modelDefinition) {
                const serializer = ModelSerializerFactory.create(modelDefinition);

                // Attempt serialization
                const serializedModel = serializer.serialize(modelDefinition);
                this.log('serializedModel:', JSON.stringify(serializedModel));

                // Trigger simulation using the data connector
                await this.client.performDataAction({
                    dataConnectorName: 'quodsi_data_connector',
                    actionName: 'SaveAndSubmitSimulation',
                    actionData: { 'documentId': documentId, 'pageId': pageId, 'userId': userId, 'model': serializedModel },
                    asynchronous: true
                });
                // Send success message back to React app
                this.sendTypedMessage(MessageTypes.SIMULATION_STARTED, {
                    documentId: documentId
                });
            }
        } catch (error) {
            this.logError('Error starting simulation:', error);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: `Failed to start simulation: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }

    /**
     * Handles model validation request
     */
    private async handleValidateModel(): Promise<void> {
        this.log('Handling validate model');

        const validationResult = await this.modelManager.validateModel();
        this.log('validationResult:', validationResult);
        // Send separate validation result message for explicit validation requests
        this.sendTypedMessage(MessageTypes.VALIDATION_RESULT, validationResult);

        // If validation succeeded, try to serialize
        if (validationResult.isValid || !validationResult.isValid) {
            try {
                // Get the model definition from the model manager
                const modelDefinition = await this.modelManager.getModelDefinition();

                if (modelDefinition) {
                    // Create a serializer using the factory (will use latest version by default)
                    const serializer = ModelSerializerFactory.create(modelDefinition);

                    // Attempt serialization
                    const serializedModel = serializer.serialize(modelDefinition);
                    this.log('serializedModel:', serializedModel);

                    try {
                        // Prepare the request payload
                        const document = new DocumentProxy(this.client);
                        const documentId = document.id;
                        const viewport = new Viewport(this.client);
                        const user: UserProxy = new UserProxy(this.client);
                        // const activePageProxy = viewport.getCurrentPage();
                        const activePageProxy: PageProxy | null | undefined = viewport.getCurrentPage();
                        let pageId: string = 'undefined';
                        let userId: string = 'undefined';
                        if (user) {
                            userId = user.id;
                        }

                        if (activePageProxy) {
                            pageId = activePageProxy.id;
                        }

                        // Make the request to upload the model definition
                        await this.client.performDataAction({
                            dataConnectorName: 'quodsi_data_connector',
                            actionName: 'UploadModelDefinition',
                            actionData: { documentId: documentId, userId: userId, pageId: pageId, model: serializedModel },
                            asynchronous: true
                        });

                        // Send a message to the React app about the successful upload
                        // this.sendTypedMessage(MessageTypes.MODEL_UPLOAD_SUCCESS, {
                        //     blobUrl: response.data.blobUrl,
                        //     uploadDateTime: response.data.uploadDateTime,
                        //     batchJob: response.data.batchJob
                        // });

                    } catch (uploadError) {
                        this.log('Model upload failed:', uploadError);

                        // Send error message to the React app
                        // this.sendTypedMessage(MessageTypes.MODEL_UPLOAD_ERROR, {
                        //     error: uploadError.message || 'Failed to upload model'
                        // });
                    }

                    // Log success of serialization
                    this.log('Model serialization successful');

                } else {
                    this.log('No model definition available');
                }
            } catch (error) {
                // Handle serialization errors
                this.log('Model serialization failed:', error);
            }
        }
    }
    /**
     * Handles model saved message
     */
    private handleModelSaved(data: any): void {
        this.log('Handling model saved');

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();

        if (currentPage) {
            try {
                this.modelManager.setElementData(
                    currentPage,
                    data,
                    SimulationObjectType.Model
                );

                this.modelManager.updateElement({
                    id: currentPage.id,
                    type: SimulationObjectType.Model,
                    ...data
                });

                this.sendTypedMessage(MessageTypes.UPDATE_SUCCESS, {
                    elementId: currentPage.id
                });
            } catch (error) {
                this.sendTypedMessage(MessageTypes.ERROR, {
                    error: `Failed to save model: ${error}`
                });
            }
        }
    }

    protected sendTypedMessage<T extends MessageTypes>(
        type: T,
        payload?: MessagePayloads[T]
    ): void {
        const message = {
            messagetype: type,
            data: payload ?? null
        } as JsonSerializable;

        this.sendMessage(message);
    }

    // Message frame handling
    protected messageFromFrame(message: any): void {
        if (!isValidMessage(message)) {
            this.logError('Invalid message format:', message);
            this.sendTypedMessage(MessageTypes.ERROR, {
                error: 'Invalid message format'
            });
            return;
        }

        this.messaging.handleIncomingMessage(message);
    }
}