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
    Panel,
    UserProxy,
    DataProxy,
    JsonObject
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
    JsonObject as SharedJsonObject,
    SelectionType,
    Model,
    SimulationObjectType,
    SelectionState,
    EditorReferenceData,
    DiagramElementType,
    ModelSerializerFactory,
    AuthActionType,
    ActionType,
    ActionRequest

} from '@quodsi/shared';
import { ModelManager } from '../core/ModelManager';
import { SelectionManager } from '../managers';
import { PageSchemaConversionService } from '../services/conversion/PageSchemaConversionService';
import { ModelDataSource } from '../data_sources/model/ModelDataSource';
import { LucidElementFactory } from '../services/LucidElementFactory';
import { LucidPageConversionService } from '../services/conversion/LucidPageConversionService';
import { StorageAdapter } from '../core/StorageAdapter';
import LucidVersionManager from '../versioning';
import { SimulationResultsDashboard } from '../dashboard/SimulationResultsDashboard';
import { AuthPanel } from './AuthPanel';
import {
    EnumMapper
} from '@quodsi/shared';
import { LucidDataActionUtility } from '../utils/LucidDataActionUtility';


const BASELINE_SCENARIO_ID = '00000000-0000-0000-0000-000000000000';

export class ModelPanel extends Panel {
    private static readonly LOG_PREFIX = '[ModelPanel]';
    private loggingEnabled: boolean = false;
    private selectionManager: SelectionManager;
    private messaging: ExtensionMessaging;
    private reactAppReady: boolean = false;
    private modelManager: ModelManager;
    private authPanel: AuthPanel;
    private currentModelStructure?: ModelStructure = undefined;
    private currentSelection: SelectionState = {
        pageId: '',
        selectedIds: [],
        selectionType: SelectionType.NONE
    };
    private isHandlingSelectionChange: boolean = false;
    private isAuthenticated: boolean = false;
    private userInfo: any = null;
    private versionManager: LucidVersionManager;

    constructor(client: EditorClient, modelManager: ModelManager, authPanel: AuthPanel) {
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
        this.authPanel = authPanel;
        this.selectionManager = new SelectionManager(
            modelManager,
            <T extends MessageTypes>(type: T, payload?: MessagePayloads[T]) => {
                this.sendTypedMessage(type, payload);
            }
        );
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
    protected frameLoaded(): void {
        console.log('[ModelPanel] Frame loaded');

        // When the frame loads, request the current auth status
        this.sendAuthMessage(AuthActionType.STATUS_REQUEST);

        // Also send panel initialization
        this.sendAuthMessage(AuthActionType.PANEL_INIT, {
            panelType: 'model'
        });
        
        // Set a timeout to send the panel init message again in case the React app wasn't ready
        // This helps when switching between panels
        setTimeout(() => {
            console.log('[ModelPanel] Sending delayed panel init message');
            this.sendAuthMessage(AuthActionType.PANEL_INIT, {
                panelType: 'model'
            });
        }, 500);
    }
    protected sendAuthMessage(
        type: AuthActionType,
        data?: any
    ): void {
        this.sendTypedMessage(MessageTypes.AUTH, {
            type,
            data: data || null
        });
    }
    private setupModelMessageHandlers(): void {
        this.logError('Setting up message handlers START');

        // React App Ready - already handled by BasePanel
        this.messaging.onMessage(MessageTypes.REACT_APP_READY, () => {
            this.logError('REACT_APP_READY message received in handler');
            this.handleReactReady();
        });

        // Consolidated AUTH message handler
        this.messaging.onMessage(MessageTypes.AUTH, (payload) => {
            console.log('[ModelPanel] Received AUTH message:', payload);

            if (!payload || !payload.type) {
                this.logError('Invalid AUTH message received:', payload);
                return;
            }

            switch (payload.type) {
                case AuthActionType.STATUS_RESPONSE:
                    console.log('[ModelPanel] Processing AUTH status response:', payload.data);
                    if (payload.data && typeof payload.data.isAuthenticated === 'boolean') {
                        this.isAuthenticated = payload.data.isAuthenticated;
                        this.userInfo = payload.data.userInfo || null;

                        // If authenticated, notify React app
                        if (this.isAuthenticated && this.reactAppReady) {
                            this.sendAuthMessage(AuthActionType.STATUS_RESPONSE, {
                                isAuthenticated: this.isAuthenticated,
                                userInfo: this.userInfo
                            });
                        }
                    }
                    break;

                case AuthActionType.COMPLETED:
                    console.log('[ModelPanel] Processing AUTH completed:', payload.data);
                    if (payload.data && payload.data.success) {
                        this.isAuthenticated = true;
                        this.userInfo = payload.data.userInfo || null;

                        // If React app is ready, notify it
                        if (this.reactAppReady) {
                            this.sendAuthMessage(AuthActionType.STATUS_RESPONSE, {
                                isAuthenticated: true,
                                userInfo: this.userInfo
                            });
                        }
                    }
                    break;

                case AuthActionType.SHOW_PANEL:
                    this.log('Processing AUTH show panel request');
                    // Get the AuthPanel instance and show it
                    this.authPanel.show();
                    break;
            }
        });

        // Setup error handler
        // this.messaging.onMessage(MessageTypes.ERROR, (payload) => {
        //     this.logError('Error received:', payload);
        // });

        // NEW: Consolidated ACTION_REQUEST handler
        this.messaging.onMessage(MessageTypes.ACTION_REQUEST, (payload) => {
            console.log('[ModelPanel] Received ACTION_REQUEST message:', payload);

            if (!payload || !payload.actionType) {
                this.logError('Invalid ACTION_REQUEST message received:', payload);
                return;
            }

            switch (payload.actionType) {
                case ActionType.VIEW_SIMULATION_RESULTS:
                    this.logError('VIEW_SIMULATION_RESULTS action requested');
                    if (payload.data) {
                        this.handleOutputCreateDashboard(payload.data, true);
                    } else {
                        this.logError('Missing data in VIEW_SIMULATION_RESULTS action');
                        this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                            actionType: ActionType.VIEW_SIMULATION_RESULTS,
                            success: false,
                            data: {
                                errorMessage: 'Missing data in VIEW_SIMULATION_RESULTS action'
                            }
                        });
                    }
                    break;

                case ActionType.SIMULATE_MODEL:
                    if (payload.data) {
                        this.handleSimulateModel(payload.data);
                    } else {
                        this.logError('Missing data in SIMULATE_MODEL action');
                        this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                            actionType: ActionType.SIMULATE_MODEL,
                            success: false,
                            data: {
                                errorMessage: 'Missing data in SIMULATE_MODEL action'
                            }
                        });
                    }
                    break;

                // First, update the switch case with a type check:
                case ActionType.CONVERT_ELEMENT:
                    if (payload.data &&
                        typeof payload.data.elementId === 'string' &&
                        typeof payload.data.type === 'string') {
                        // Now TypeScript knows these are string values
                        this.handleConvertElement({
                            elementId: payload.data.elementId,
                            type: payload.data.type
                        });
                    } else {
                        this.logError('Missing required data (elementId or type) in CONVERT_ELEMENT action');
                        this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                            actionType: ActionType.CONVERT_ELEMENT,
                            success: false,
                            data: {
                                errorMessage: 'Missing required data (elementId or type) in CONVERT_ELEMENT action'
                            }
                        });
                    }
                    break;

                case ActionType.REMOVE_MODEL:
                    this.handleRemoveModel();
                    break;

                case ActionType.CONVERT_PAGE:
                    this.handlePageConvertRequest();
                    break;

                case ActionType.VALIDATE_MODEL:
                    this.handleValidateModel();
                    break;

                case ActionType.UPDATE_ELEMENT_DATA:
                    if (payload.data &&
                        typeof payload.data.type === 'string' &&
                        payload.data.data) {
                        // Properly construct object with validated properties
                        this.handleUpdateElementData({
                            elementId: payload.data.elementId,
                            type: payload.data.type,
                            data: payload.data.data
                        });
                    } else {
                        this.logError('Missing required data (type or data) in UPDATE_ELEMENT_DATA action');
                        this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                            actionType: ActionType.UPDATE_ELEMENT_DATA,
                            success: false,
                            data: {
                                errorMessage: 'Missing required data (type or data) in UPDATE_ELEMENT_DATA action'
                            }
                        });
                    }
                    break;

                case ActionType.CREATE_RESULTS_PAGE:
                    this.handleOutputCreatePage();
                    break;

                default:
                    this.logError(`Unhandled action type: ${payload.actionType}`);
            }
        });

        // Keep original handlers during migration
        // this.messaging.onMessage(MessageTypes.VIEW_SIMULATION_RESULTS, (payload) => {
        //     this.logError('VIEW_SIMULATION_RESULTS message received in handler');
        //     this.handleOutputCreateDashboard(payload, true);
        // });

        // this.messaging.onMessage(MessageTypes.SIMULATE_MODEL, (payload) =>
        //     this.handleSimulateModel(payload)
        // );

        // this.messaging.onMessage(MessageTypes.SIMULATION_STATUS_UPDATE, (data) =>
        //     this.handleSimulationStatusUpdate(data)
        // );

        // this.messaging.onMessage(MessageTypes.CONVERT_ELEMENT, (data) =>
        //     this.handleConvertElement(data));

        // this.messaging.onMessage(MessageTypes.REMOVE_MODEL, () => this.handleRemoveModel());

        // this.messaging.onMessage(MessageTypes.CONVERT_PAGE, () => this.handlePageConvertRequest());

        // this.messaging.onMessage(MessageTypes.VALIDATE_MODEL, () => this.handleValidateModel());

        // this.messaging.onMessage(MessageTypes.UPDATE_ELEMENT_DATA, (data) =>
        //     this.handleUpdateElementData(data));

        // this.messaging.onMessage(MessageTypes.OUTPUT_CREATE_PAGE, (data) => {
        //     this.handleOutputCreatePage();
        // });

        this.logError('Setting up message handlers END');
    }
    // Improved model initialization code with better logging and error handling
    async initializeOrUpdateModel() {
        try {
            console.log("[ModelPanel] Starting model initialization or update");
            const document = new DocumentProxy(this.client);
            const viewport = new Viewport(this.client);
            const dataProxy = new DataProxy(this.client);
            // Log all existing data sources
            console.log("[ModelPanel] Available data sources:");
            for (const [id, source] of dataProxy.dataSources) {
                try {
                    const name = source.getName();
                    const config = source.getSourceConfig();
                    console.log(`[ModelPanel]   - ${id}: name="${name}", config:`, config);
                } catch (e) {
                    console.log(`[ModelPanel]   - ${id}: error accessing details`, e);
                }
            }

            // Create the ModelDataSource
            const modelDataSource = new ModelDataSource(dataProxy);
            console.log("[ModelPanel] ModelDataSource created");

            // Initialize the data source
            const initResult = await modelDataSource.initialize();
            console.log("[ModelPanel] ModelDataSource initialization result:", initResult);

            if (!initResult) {
                console.error("[ModelPanel] Failed to initialize model data source");
                return null;
            }

            // Get current page
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                console.error("[ModelPanel] No current page found");
                return null;
            }

            const documentId = document.id;
            const pageId = currentPage.id;
            const modelName = "Process Model";  // Name for your model

            console.log("[ModelPanel] Current context:", {
                documentId,
                pageId,
                modelName
            });

            // Get the repository for debugging
            const repo = modelDataSource.getModelDefinitionRepository();
            // This requires exposing dataSourceId as a property or adding a getter in ModelDefinitionRepository
            console.log("[ModelPanel] Using data source ID:", repo.getDataSourceId ? repo.getDataSourceId() : "unknown");

            // First check if a model definition already exists
            console.log("[ModelPanel] Checking for existing model definition");
            const existingModel = await modelDataSource.findModelDefinition(documentId, pageId);

            console.log("[ModelPanel] Existing model check result:", existingModel);

            // Create or update the model definition
            let modelDefinition;

            if (existingModel) {
                console.log("[ModelPanel] Updating existing model:", existingModel.id);

                // Only update if needed
                if (existingModel.name !== modelName) {
                    console.log("[ModelPanel] Model name has changed, updating...");
                    modelDefinition = await modelDataSource.updateModelDefinition({
                        id: existingModel.id,
                        name: modelName
                    });
                } else {
                    console.log("[ModelPanel] No changes needed, using existing model");
                    modelDefinition = existingModel;
                }
            } else {
                console.log("[ModelPanel] No existing model found, creating new one");

                // For debugging, try to list all models
                const allModels = await modelDataSource.listModelDefinitions();
                console.log("[ModelPanel] All existing models:", allModels);

                modelDefinition = await modelDataSource.createModelDefinition(
                    documentId,
                    pageId,
                    modelName
                );
            }

            // Check the result
            if (modelDefinition) {
                console.log("[ModelPanel] Model operation successful:", modelDefinition);
                return modelDefinition;
            } else {
                console.error("[ModelPanel] Failed to create/update model definition");
                return null;
            }
        } catch (error) {
            console.error("[ModelPanel] Error in initializeOrUpdateModel:", error);
            return null;
        }
    }

    private async handleOutputCreatePage(): Promise<void> {
        console.log('[ModelPanel] Output page creation requested:');

        try {
            const document = new DocumentProxy(this.client);
            this.handleOutputCreateDashboard(
                { documentId: document.id, scenarioId: BASELINE_SCENARIO_ID },
                true,
            );
        } catch (error) {
            this.handleActionResponseError(
                '[SimulationResultsTableGenerator] Error creating output page',
                error
            );
        }
    }

    private async handleOutputCreateDashboard(
        payload: {
            documentId?: string;
            scenarioId?: string;
        },
        importResults: boolean = false
    ): Promise<void> {
        try {
            console.log('[ModelPanel] Creating simulation results dashboard...');

            // Extract data from the payload
            const documentId = payload.documentId;
            const scenarioId = payload.scenarioId;

            if (!documentId) {
                console.error('[ModelPanel] Missing documentId in dashboard creation payload');
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.VIEW_SIMULATION_RESULTS,
                    success: false,
                    data: {
                        errorMessage: 'Missing documentId in dashboard creation payload'
                    }
                });
                return;
            }

            if (importResults) {
                await LucidDataActionUtility.performDataAction(this.client, {
                    dataConnectorName: 'quodsi_data_connector',
                    actionName: 'ImportSimulationResults',
                    actionData: {
                        documentId: documentId,
                        scenarioId: scenarioId,
                        collectionsToImport: [
                            'activity_cross_rep',
                            // 'activity_rep',
                            'entity_cross_rep',
                            // 'entity_rep',
                            'resource_cross_rep',
                            // 'resource_rep'
                        ]
                    },
                    asynchronous: true
                });
            }

            // Create dashboard instance with default configuration
            const dashboard = new SimulationResultsDashboard(this.client);

            // Generate a dashboard with the current date/time in the name
            const timestamp = new Date().toLocaleString().replace(/[/\\:]/g, '-');
            const result = await dashboard.createDashboard(`Quodsi - ${timestamp}`);

            console.log(`[ModelPanel] Dashboard created with ${result.tables.length} tables`);

            // Check for issues
            if (result.emptyDataTypes.length > 0) {
                console.log(`[ModelPanel] The following data types had no data: ${result.emptyDataTypes.join(', ')}`);
            }

            if (result.errors.length > 0) {
                console.warn(`[ModelPanel] ${result.errors.length} errors occurred while creating the dashboard`);
                result.errors.forEach(err => {
                    console.error(`[ModelPanel] Error creating ${err.type} table:`, err.error);
                });
            }

            // Mark results as viewed
            await LucidDataActionUtility.performDataAction(this.client, {
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'MarkResultsViewed',
                actionData: { documentId: documentId, scenarioId: scenarioId },
                asynchronous: true
            });

            // Send success response
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.VIEW_SIMULATION_RESULTS,
                success: true,
                data: {
                    documentId: documentId
                }
            });

        } catch (error) {
            console.error('[ModelPanel] Error creating simulation results dashboard:', error);

            // Send error response
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.VIEW_SIMULATION_RESULTS,
                success: false,
                data: {
                    errorMessage: `Error creating dashboard: ${error instanceof Error ? error.message : String(error)}`
                }
            });
        }
    }
    private async list_blocks(): Promise<void> {

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        if (currentPage) {
            for (const [blockId, block] of currentPage.allBlocks) {
                console.log('[ModelPanel] Block of class ' + block.getClassName() + ' (' + blockId + '):')
                for (const [propertyName, propertyValue] of block.properties) {
                    console.log('[ModelPanel] ' + propertyName, propertyValue);
                }
            }
        }

    }

    private async handleConvertElement(
        data: {
            elementId: string;
            type: string;
        }
    ): Promise<void> {
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.CONVERT_ELEMENT,
                    success: false,
                    data: {
                        errorMessage: 'No active page found'
                    }
                });
                return;
            }

            // Get the element from viewport
            const selectedItems = viewport.getSelectedItems();
            const element = selectedItems.find(item => item.id === data.elementId);
            if (!element) {
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.CONVERT_ELEMENT,
                    success: false,
                    data: {
                        errorMessage: `Element not found in selection: ${data.elementId}`
                    }
                });
                return;
            }

            // Get model definition (might be needed by some conversions)
            const modelDef = await this.modelManager.getModelDefinition();
            if (!modelDef) {
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.CONVERT_ELEMENT,
                    success: false,
                    data: {
                        errorMessage: 'Model definition not found'
                    }
                });
                return;
            }

            // Convert string type to SimulationObjectType using EnumMapper
            const enumMapper = new EnumMapper(SimulationObjectType);
            let elementType: SimulationObjectType;

            try {
                // Try to convert the string to an enum value
                elementType = enumMapper.toEnum(data.type);
            } catch (error) {
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.CONVERT_ELEMENT,
                    success: false,
                    data: {
                        errorMessage: `Invalid element type: ${data.type}`
                    }
                });
                return;
            }

            // Create the platform object with conversion flag
            const elementFactory = new LucidElementFactory(this.modelManager.getStorageAdapter());
            const platformObject = elementFactory.createPlatformObject(
                element,
                elementType,
                true  // isConversion flag
            );

            if (!this.currentModelStructure) {
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.CONVERT_ELEMENT,
                    success: false,
                    data: {
                        errorMessage: 'Failed to update model structure after conversion'
                    }
                });
                return;
            }

            // Get the metadata from the newly converted element
            const metadata = this.modelManager.getMetadata(element);
            if (!metadata) {
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.CONVERT_ELEMENT,
                    success: false,
                    data: {
                        errorMessage: 'No metadata found for newly converted element'
                    }
                });
                return;
            }

            // Map the simulation object type to selection type
            const selectionType = this.selectionManager.mapElementTypeToSelectionType(metadata.type);

            // Build model item data for the element
            const modelItemData = await this.selectionManager.buildModelItemData(element);

            // Create the diagram element type based on element type
            const diagramElementType = element instanceof BlockProxy ?
                DiagramElementType.BLOCK : DiagramElementType.LINE;

            // Get the validation result
            const validationResult = await this.modelManager.validateModel();

            // Create a document proxy to get the document ID
            const document = new DocumentProxy(this.client);

            // Send success response for the element conversion
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.CONVERT_ELEMENT,
                success: true,
                data: {
                    elementId: data.elementId
                }
            });

            // Send the SELECTION_CHANGED message to update the UI
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                selectionType: selectionType,
                documentId: document.id,
                hasModel: true,
                selectionState: {
                    pageId: currentPage.id,
                    selectedIds: [element.id],
                    selectionType: selectionType
                },
                validationResult: validationResult,
                modelItemData: modelItemData,
                diagramElementType: diagramElementType,
            });

        } catch (error) {
            this.logError('Error converting element:', error);
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.CONVERT_ELEMENT,
                success: false,
                data: {
                    errorMessage: `Failed to convert element: ${error instanceof Error ? error.message : String(error)}`
                }
            });
        }
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

        // Request current auth status when panel is shown
        this.sendAuthMessage(AuthActionType.STATUS_REQUEST);
        this.sendAuthMessage(AuthActionType.MODEL_PANEL_FOCUS);

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
        // Delegate to SelectionManager
        this.log('Executing handleSelectionChange');
        await this.selectionManager.handleSelectionChange(this.client, items);
    }

    // Authentication-specific error handler
    private handleAuthError(message: string, error: any): void {
        this.logError(`${message}`, error);
        this.sendMessage({
            messagetype: MessageTypes.AUTH,
            data: {
                type: AuthActionType.ERROR,
                data: {
                    error: error instanceof Error ? error.message : 'Unknown authentication error',
                    errorCode: 'AUTH_HANDLER_ERROR'
                }
            }
        });
    }

    // Action response error handler
    private handleActionResponseError(message: string, error: any): void {
        this.logError(`${message}`, error);
        this.sendMessage({
            messagetype: MessageTypes.ACTION_RESPONSE,
            data: {
                actionType: ActionType.CONVERT_PAGE, // Using a default action type
                success: false,
                data: {
                    errorMessage: error instanceof Error ? error.message : 'Unknown action response error',
                    errorCode: 'ACTION_RESPONSE_ERROR'
                }
            }
        });
    }

    /**
     * Handles model removal request
     */
    private async handleRemoveModel(): Promise<void> {
        try {
            const document = new DocumentProxy(this.client);
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) return;

            // Remove the model data from the page
            await this.modelManager.removeModelFromPage(currentPage);

            // 1. Create an instance of DataProxy
            const dataProxy = new DataProxy(this.client);

            // 2. Create the ModelDataSource
            const modelDataSource = new ModelDataSource(dataProxy);

            // 3. Initialize the data source
            await modelDataSource.initialize();

            // 4. Delete the model definition
            const success = await modelDataSource.deleteModelDefinition(
                document.id,  // The document ID 
                currentPage.id       // The page ID
            );

            // 5. Check the result
            if (success) {
                console.log("Model definition deleted successfully");
            } else {
                console.error("Failed to delete model definition");
            }

            // Since the model was just removed, we know this is now a non-model page
            // Send the consolidated SELECTION_CHANGED message instead of PAGE_NO_MODEL
            this.sendTypedMessage(MessageTypes.SELECTION_CHANGED, {
                selectionType: SelectionType.NONE,
                documentId: document.id,
                hasModel: false,
                selectionState: {
                    pageId: currentPage.id,
                    selectedIds: [],
                    selectionType: SelectionType.NONE
                }
            });

        } catch (error) {
            this.handleActionResponseError('Error removing model:', error);
        }
    }

    private async handleReactReady(): Promise<void> {
        if (this.reactAppReady) {
            this.selectionManager.setReactAppReady(true);
            this.log('React app already ready, skipping initialization');
            return;
        }

        this.log('reactAppReady = false');
        this.reactAppReady = true;
        this.selectionManager.setReactAppReady(true);
        this.log('reactAppReady = true');
        this.log('reactAppReady = true');

        // Send MODEL_PANEL_INIT message to tell React this is ModelPanel
        this.sendAuthMessage(AuthActionType.PANEL_INIT, {
            panelType: 'model'
        });

        // Request current authentication status
        this.sendAuthMessage(AuthActionType.STATUS_REQUEST);

        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        const document = new DocumentProxy(this.client);

        if (!currentPage) {
            this.logError('No active page found during React ready');
            return;
        }

        try {
            // If we're already authenticated, send that to React immediately
            if (this.isAuthenticated) {
                this.sendAuthMessage(AuthActionType.STATUS_RESPONSE, {
                    isAuthenticated: true,
                    userInfo: this.userInfo
                });
            }

            // Check for and handle any needed version upgrades
            // await this.versionManager.handlePageLoad(currentPage);
            // Now initialize the model in response to a user-triggered event
            await this.initializeModelManager();

            // Get current selection state and send appropriate message
            const selectedItems = viewport.getSelectedItems();
            this.log('handleReactReady: handleSelectionChange');
            await this.handleSelectionChange(selectedItems);

        } catch (error) {
            this.handleActionResponseError('Error during React ready initialization: ', error);
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
            // Send an error response using the new ACTION_RESPONSE format
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.CONVERT_PAGE,
                success: false,
                data: {
                    errorMessage: 'No active page found'
                }
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

            // Send a success response (new)
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.CONVERT_PAGE,
                success: true,
                data: {
                    documentId: document.id
                }
            });

        } catch (error) {
            this.logError('Conversion error:', error);
            // Send an error response using the new ACTION_RESPONSE format
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.CONVERT_PAGE,
                success: false,
                data: {
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                }
            });
        }
    }

    /**
     * Handles element data update
     */
    private async handleUpdateElementData(
        updateData: {
            elementId?: string;
            type: string;
            data: JsonObject;
        }
    ): Promise<void> {
        this.log('Received element update data:', updateData);

        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            if (!currentPage) {
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.UPDATE_ELEMENT_DATA,
                    success: false,
                    data: {
                        errorMessage: 'No active page found'
                    }
                });
                return;
            }

            // Get the element from viewport
            const selectedItems = viewport.getSelectedItems();

            if (updateData.type === 'Model') {
                this.log('Received element type of Model:', updateData.type);
                this.modelManager.setElementData(
                    currentPage,
                    updateData.data,
                    SimulationObjectType.Model
                );
            } else {
                // Update current selection first
                this.currentSelection = {
                    pageId: currentPage.id,
                    selectedIds: selectedItems.map(item => item.id),
                    selectionType: this.currentSelection.selectionType
                };

                if (!updateData.elementId) {
                    this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                        actionType: ActionType.UPDATE_ELEMENT_DATA,
                        success: false,
                        data: {
                            errorMessage: 'Element ID is required for non-Model updates'
                        }
                    });
                    return;
                }

                const element = selectedItems.find(item => item.id === updateData.elementId);
                if (!element) {
                    this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                        actionType: ActionType.UPDATE_ELEMENT_DATA,
                        success: false,
                        data: {
                            errorMessage: `Element not found in selection: ${updateData.elementId}`
                        }
                    });
                    return;
                }

                // Convert string type to SimulationObjectType using EnumMapper
                const enumMapper = new EnumMapper(SimulationObjectType);
                let elementType: SimulationObjectType | undefined;

                try {
                    // Try to convert the string to an enum value
                    elementType = enumMapper.toEnum(updateData.type);

                    // Use LucidElementFactory to get platform-specific data
                    const storageAdapter = this.modelManager.getStorageAdapter();
                    const elementFactory = new LucidElementFactory(storageAdapter);

                    // Create a platform object with platform-specific data
                    const platformObject = elementFactory.createPlatformObject(
                        element,
                        elementType,
                        false  // Not a conversion, just updating
                    );

                    // Save element data using ModelManager with merged data
                    await this.modelManager.saveElementData(
                        element,
                        {
                            ...updateData.data,
                            x: platformObject.getSimulationObject().x,
                            y: platformObject.getSimulationObject().y
                        },
                        elementType,
                        currentPage
                    );
                } catch (error) {
                    this.logError(`Type conversion failed for ${updateData.type}, using fallback method`);

                    // Fallback type conversion logic
                    const fallbackType = SimulationObjectType[updateData.type as keyof typeof SimulationObjectType];

                    if (fallbackType !== undefined) {
                        await this.modelManager.saveElementData(
                            element,
                            updateData.data,
                            fallbackType,
                            currentPage
                        );
                    } else {
                        this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                            actionType: ActionType.UPDATE_ELEMENT_DATA,
                            success: false,
                            data: {
                                errorMessage: `Invalid element type: ${updateData.type}`
                            }
                        });
                        return;
                    }
                }
            }

            // Send success message
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.UPDATE_ELEMENT_DATA,
                success: true,
                data: {
                    elementId: updateData.elementId
                }
            });

            // Update validation and selection state
            await this.modelManager.validateModel();

            // Only update selection if this element is selected
            if (updateData.elementId && this.currentSelection.selectedIds.includes(updateData.elementId)) {
                await this.handleSelectionChange(selectedItems);
            }

        } catch (error) {
            this.logError('Error updating element:', error);
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.UPDATE_ELEMENT_DATA,
                success: false,
                data: {
                    errorMessage: `Failed to update element: ${error instanceof Error ? error.message : String(error)}`
                }
            });
        }
    }

    private async handleSimulateModel(
        payload: {
            scenarioName?: string;
        }
    ): Promise<void> {
        this.log('Handling simulate model request');

        try {
            // Get the document ID using DocumentProxy
            const documentId = new DocumentProxy(this.client).id;
            const viewport = new Viewport(this.client);
            const userId = new UserProxy(this.client).id;
            const activePageProxy: PageProxy | null | undefined = viewport.getCurrentPage();

            let pageId: string = 'undefined';

            if (activePageProxy) {
                pageId = activePageProxy.id;
            }
            else {
                this.log('No active page');
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.SIMULATE_MODEL,
                    success: false,
                    data: {
                        errorMessage: 'Failed to start simulation: No active page'
                    }
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
                await LucidDataActionUtility.performDataAction(this.client, {
                    dataConnectorName: 'quodsi_data_connector',
                    actionName: 'SaveAndSubmitSimulation',
                    actionData: {
                        'documentId': documentId,
                        scenarioId: BASELINE_SCENARIO_ID,
                        'model': serializedModel,
                        'scenarioName': payload.scenarioName,
                        'appVersion': "1.0"
                    },
                    asynchronous: true
                });

                // Send success message back to React app using the new ACTION_RESPONSE format
                this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                    actionType: ActionType.SIMULATE_MODEL,
                    success: true,
                    data: {
                        documentId: documentId
                    }
                });
            }
        } catch (error) {
            this.logError('Error starting simulation:', error);
            this.sendTypedMessage(MessageTypes.ACTION_RESPONSE, {
                actionType: ActionType.SIMULATE_MODEL,
                success: false,
                data: {
                    errorMessage: `Failed to start simulation: ${error instanceof Error ? error.message : String(error)}`
                }
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

        // Send validation result as an ACTION_REQUEST
        this.sendTypedMessage(MessageTypes.ACTION_REQUEST, {
            actionType: ActionType.VALIDATE_MODEL,
            data: {
                documentId: new DocumentProxy(this.client).id,
                elementId: '', // Add if needed
                type: 'validation', // Optional additional context
                data: {
                    isValid: validationResult.isValid,
                    errorCount: validationResult.messages.filter(m => m.type === 'error').length,
                    warningCount: validationResult.messages.filter(m => m.type === 'warning').length,
                    messages: validationResult.messages.map(message => ({
                        type: message.type,
                        message: message.message,
                        elementId: message.elementId ?? null,
                        code: message.code ?? null
                    }))
                }
            }
        });

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
                        await LucidDataActionUtility.performDataAction(this.client, {
                            dataConnectorName: 'quodsi_data_connector',
                            actionName: 'UploadModelDefinition',
                            actionData: { documentId: documentId, scenarioId: BASELINE_SCENARIO_ID, model: serializedModel },
                            asynchronous: true
                        });

                    } catch (uploadError) {
                        this.log('Model upload failed:', uploadError);
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
            this.handleActionResponseError('Invalid message format', message);
            return;
        }

        this.messaging.handleIncomingMessage(message);
    }


}