// src/handlers/ActionMessageHandler.ts
import {
    DocumentProxy,
    Viewport,
    BlockProxy,
    PageProxy,
    UserProxy,
    DataProxy,
    ElementProxy,
    ItemProxy
} from 'lucid-extension-sdk';
import {
    ExtensionMessaging,
    JsonObject,
    ModelSerializerFactory,
    DiagramElementType,
    SimulationObjectType,
    SelectionType,
    ActionType,
    ActionRequest,
    ActionResponse,
    MessageTypes
} from '@quodsi/shared';
import { ModelManager } from '../core/ModelManager';
import { SelectionManager } from '../managers';
import { LucidElementFactory } from '../services/LucidElementFactory';
import { ModelDataSource } from '../data_sources/model/ModelDataSource';
import { SimulationResultsDashboard } from '../dashboard/SimulationResultsDashboard';

const BASELINE_SCENARIO_ID = '00000000-0000-0000-0000-000000000000';

/**
 * Handler for all consolidated action messages in the extension.
 * This class centralizes the handling of ACTION_REQUEST messages and
 * the generation of appropriate ACTION_RESPONSE messages.
 */
export class ActionMessageHandler {
    private static readonly LOG_PREFIX = '[ActionMessageHandler]';
    private client: any; // Using any to avoid SDK dependency issues
    private modelManager: ModelManager;
    private selectionManager: SelectionManager;
    private messaging: ExtensionMessaging;
    private loggingEnabled: boolean = false;

    constructor(client: any, modelManager: ModelManager, selectionManager: SelectionManager) {
        this.client = client;
        this.modelManager = modelManager;
        this.selectionManager = selectionManager;
        this.messaging = ExtensionMessaging.getInstance();
        
        // Register handler for ACTION_REQUEST messages
        this.messaging.onMessage(MessageTypes.ACTION_REQUEST, (payload: ActionRequest) => {
            this.handleActionRequest(payload);
        });
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
            console.log(`${ActionMessageHandler.LOG_PREFIX} ${message}`, ...args);
        }
    }

    private logError(message: string, ...args: any[]): void {
        if (this.isLoggingEnabled()) {
            console.error(`${ActionMessageHandler.LOG_PREFIX} ${message}`, ...args);
        }
    }

    /**
     * Main handler for ACTION_REQUEST messages.
     * Routes the request to the appropriate specific handler based on actionType.
     */
    private handleActionRequest(request: ActionRequest): void {
        this.log(`Received ACTION_REQUEST: ${request.actionType}`, request.data);
        
        if (!request.actionType) {
            this.logError('Invalid action request: missing actionType');
            this.sendErrorResponse(request.actionType, 'Missing actionType in request');
            return;
        }
        
        try {
            // Route to specific handler based on action type
            switch (request.actionType) {
                case ActionType.CONVERT_PAGE:
                    this.handleConvertPage(request);
                    break;
                    
                case ActionType.REMOVE_MODEL:
                    this.handleRemoveModel(request);
                    break;
                    
                case ActionType.UPDATE_ELEMENT_DATA:
                    this.handleUpdateElementData(request);
                    break;
                    
                case ActionType.CONVERT_ELEMENT:
                    this.handleConvertElement(request);
                    break;
                    
                case ActionType.VALIDATE_MODEL:
                    this.handleValidateModel(request);
                    break;
                    
                case ActionType.SIMULATE_MODEL:
                    this.handleSimulateModel(request);
                    break;
                    
                case ActionType.SIMULATION_STATUS_CHECK:
                    this.handleSimulationStatusCheck(request);
                    break;
                    
                case ActionType.CREATE_RESULTS_PAGE:
                    this.handleCreateResultsPage(request);
                    break;
                    
                case ActionType.VIEW_SIMULATION_RESULTS:
                    this.handleViewSimulationResults(request);
                    break;
                    
                case ActionType.MARK_RESULTS_VIEWED:
                    this.handleMarkResultsViewed(request);
                    break;
                    
                default:
                    this.logError(`Unhandled action type: ${request.actionType}`);
                    this.sendErrorResponse(request.actionType, `Unhandled action type: ${request.actionType}`);
            }
        } catch (error) {
            this.logError(`Error handling action ${request.actionType}:`, error);
            this.sendErrorResponse(
                request.actionType,
                `Error processing action: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Send a success response for an action.
     */
    private sendActionResponse(
        actionType: ActionType,
        success: boolean,
        data?: any
    ): void {
        this.log(`Sending ACTION_RESPONSE for ${actionType}:`, { success, data });
        
        this.messaging.sendMessage(MessageTypes.ACTION_RESPONSE, {
            actionType,
            success,
            data
        });
    }

    /**
     * Send an error response for an action.
     */
    private sendErrorResponse(
        actionType: ActionType | undefined,
        errorMessage: string
    ): void {
        this.logError(`Sending error response for ${actionType}:`, errorMessage);
        
        this.messaging.sendMessage(MessageTypes.ACTION_RESPONSE, {
            actionType: actionType || ActionType.CONVERT_PAGE, // Default to avoid undefined
            success: false,
            data: {
                errorMessage
            }
        });
    }

    /**
     * Handler for CONVERT_PAGE action requests.
     * Converts the current page to a Quodsi model.
     */
    private async handleConvertPage(request: ActionRequest): Promise<void> {
        this.log('Handling CONVERT_PAGE action');
        
        const viewport = new Viewport(this.client);
        const currentPage = viewport.getCurrentPage();
        
        if (!currentPage) {
            this.sendErrorResponse(request.actionType, 'No active page found');
            return;
        }
        
        try {
            // Implementation of page conversion
            // This is a placeholder until we migrate the actual code
            const success = true; // Replace with actual conversion result
            
            // Handle selection after conversion
            const selectedItems = viewport.getSelectedItems();
            await this.selectionManager.handleSelectionChange(this.client, selectedItems);
            
            this.sendActionResponse(request.actionType, success);
        } catch (error) {
            this.logError('Conversion error:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to convert page: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Handler for REMOVE_MODEL action requests.
     * Removes the Quodsi model from the current page.
     */
    private async handleRemoveModel(request: ActionRequest): Promise<void> {
        this.log('Handling REMOVE_MODEL action');
        
        try {
            const document = new DocumentProxy(this.client);
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            
            if (!currentPage) {
                this.sendErrorResponse(request.actionType, 'No active page found');
                return;
            }
            
            // Remove the model data from the page
            await this.modelManager.removeModelFromPage(currentPage);
            
            // Delete the model definition
            const dataProxy = new DataProxy(this.client);
            const modelDataSource = new ModelDataSource(dataProxy);
            await modelDataSource.initialize();
            
            const success = await modelDataSource.deleteModelDefinition(
                document.id,
                currentPage.id
            );
            
            // Send response
            this.sendActionResponse(request.actionType, success, {
                documentId: document.id
            });
            
            // Update selection state since the model was removed
            // This would be done by sending a SELECTION_CHANGED message
            // Code will be added during migration
        } catch (error) {
            this.logError('Error removing model:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to remove model: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Handler for UPDATE_ELEMENT_DATA action requests.
     * Updates the data of a specific element.
     */
    private async handleUpdateElementData(request: ActionRequest): Promise<void> {
        this.log('Handling UPDATE_ELEMENT_DATA action:', request.data);
        
        if (!request.data || !request.data.elementId) {
            this.sendErrorResponse(request.actionType, 'Missing elementId in request data');
            return;
        }
        
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            
            if (!currentPage) {
                this.sendErrorResponse(request.actionType, 'No active page found');
                return;
            }
            
            // Element update logic
            // Will be implemented during migration
            const success = true; // Replace with actual result
            
            this.sendActionResponse(request.actionType, success, {
                elementId: request.data.elementId
            });
        } catch (error) {
            this.logError('Error updating element:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to update element: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Handler for CONVERT_ELEMENT action requests.
     * Converts an element to a specific simulation object type.
     */
    private async handleConvertElement(request: ActionRequest): Promise<void> {
        this.log('Handling CONVERT_ELEMENT action:', request.data);
        
        if (!request.data || !request.data.elementId || !request.data.convertToType) {
            this.sendErrorResponse(request.actionType, 'Missing elementId or convertToType in request data');
            return;
        }
        
        try {
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            
            if (!currentPage) {
                this.sendErrorResponse(request.actionType, 'No active page found');
                return;
            }
            
            // Get the element from viewport
            const selectedItems = viewport.getSelectedItems();
            const element = selectedItems.find(item => item.id === request.data?.elementId);
            
            if (!element) {
                this.sendErrorResponse(request.actionType, `Element not found: ${request.data.elementId}`);
                return;
            }
            
            // Element conversion logic
            // Will be implemented during migration
            const success = true; // Replace with actual result
            
            this.sendActionResponse(request.actionType, success, {
                elementId: request.data.elementId
            });
        } catch (error) {
            this.logError('Error converting element:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to convert element: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Handler for VALIDATE_MODEL action requests.
     * Validates the current model.
     */
    private async handleValidateModel(request: ActionRequest): Promise<void> {
        this.log('Handling VALIDATE_MODEL action');
        
        try {
            const validationResult = await this.modelManager.validateModel();
            
            this.sendActionResponse(request.actionType, true, {
                validationResult
            });
        } catch (error) {
            this.logError('Error validating model:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to validate model: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Handler for SIMULATE_MODEL action requests.
     * Starts a simulation of the current model.
     */
    private async handleSimulateModel(request: ActionRequest): Promise<void> {
        this.log('Handling SIMULATE_MODEL action:', request.data);
        
        try {
            // Get document ID
            const documentId = new DocumentProxy(this.client).id;
            const viewport = new Viewport(this.client);
            const activePageProxy = viewport.getCurrentPage();
            
            if (!activePageProxy) {
                this.sendErrorResponse(request.actionType, 'No active page found');
                return;
            }
            
            const pageId = activePageProxy.id;
            
            // Get model definition and serialize
            const modelDefinition = await this.modelManager.getModelDefinition();
            
            if (!modelDefinition) {
                this.sendErrorResponse(request.actionType, 'No model definition found');
                return;
            }
            
            const serializer = ModelSerializerFactory.create(modelDefinition);
            const serializedModel = serializer.serialize(modelDefinition);
            
            // Trigger simulation using the data connector
            await this.client.performDataAction({
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'SaveAndSubmitSimulation',
                actionData: { 
                    'documentId': documentId,
                    scenarioId: BASELINE_SCENARIO_ID,
                    'model': serializedModel,
                    'scenarioName': request.data?.scenarioName,
                    'appVersion': "1.0"
                },
                asynchronous: true
            });
            
            // Send success message back
            this.sendActionResponse(request.actionType, true, {
                documentId: documentId
            });
        } catch (error) {
            this.logError('Error starting simulation:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to start simulation: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Handler for SIMULATION_STATUS_CHECK action requests.
     * Checks the status of an ongoing simulation.
     */
    private async handleSimulationStatusCheck(request: ActionRequest): Promise<void> {
        this.log('Handling SIMULATION_STATUS_CHECK action:', request.data);
        
        if (!request.data || !request.data.documentId) {
            this.sendErrorResponse(request.actionType, 'Missing documentId in request data');
            return;
        }
        
        try {
            // This would normally check the simulation status from a service
            // For now, we'll just send a dummy response
            
            const viewport = new Viewport(this.client);
            const currentPage = viewport.getCurrentPage();
            
            if (!currentPage) {
                this.sendErrorResponse(request.actionType, 'No active page found');
                return;
            }
            
            // Get the simulation status from the storage adapter
            const pageStatus = this.modelManager.getStorageAdapter().getSimulationStatus(currentPage);
            
            if (!pageStatus) {
                this.sendErrorResponse(request.actionType, 'No simulation status available');
                return;
            }
            
            this.sendActionResponse(request.actionType, true, {
                documentId: request.data.documentId,
                pageStatus,
                newResultsAvailable: false // This would be determined by the status check
            });
        } catch (error) {
            this.logError('Error checking simulation status:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to check simulation status: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Handler for CREATE_RESULTS_PAGE action requests.
     * Creates a page for displaying simulation results.
     */
    private async handleCreateResultsPage(request: ActionRequest): Promise<void> {
        this.log('Handling CREATE_RESULTS_PAGE action');
        
        try {
            const document = new DocumentProxy(this.client);
            
            this.handleViewSimulationResults({
                actionType: ActionType.VIEW_SIMULATION_RESULTS,
                data: {
                    documentId: document.id,
                    scenarioId: BASELINE_SCENARIO_ID
                }
            });
            
            this.sendActionResponse(request.actionType, true);
        } catch (error) {
            this.logError('Error creating results page:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to create results page: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Handler for VIEW_SIMULATION_RESULTS action requests.
     * Displays simulation results for a scenario.
     */
    private async handleViewSimulationResults(request: ActionRequest): Promise<void> {
        this.log('Handling VIEW_SIMULATION_RESULTS action:', request.data);
        
        if (!request.data || !request.data.documentId) {
            this.sendErrorResponse(request.actionType, 'Missing documentId in request data');
            return;
        }
        
        try {
            const importResults = true;
            
            if (importResults) {
                await this.client.performDataAction({
                    dataConnectorName: 'quodsi_data_connector',
                    actionName: 'ImportSimulationResults',
                    actionData: {
                        documentId: request.data.documentId,
                        scenarioId: request.data.scenarioId || BASELINE_SCENARIO_ID,
                        collectionsToImport: [
                            'activity_cross_rep',
                            'entity_cross_rep',
                            'resource_cross_rep',
                        ]
                    },
                    asynchronous: true
                });
            }
            
            // Create dashboard
            const dashboard = new SimulationResultsDashboard(this.client);
            const timestamp = new Date().toLocaleString().replace(/[/\\:]/g, '-');
            const result = await dashboard.createDashboard(`Quodsi - ${timestamp}`);
            
            // Mark results as viewed
            await this.handleMarkResultsViewed({
                actionType: ActionType.MARK_RESULTS_VIEWED,
                data: {
                    documentId: request.data.documentId,
                    scenarioId: request.data.scenarioId || BASELINE_SCENARIO_ID
                }
            });
            
            this.sendActionResponse(request.actionType, true, {
                documentId: request.data.documentId
            });
        } catch (error) {
            this.logError('Error viewing simulation results:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to view simulation results: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Handler for MARK_RESULTS_VIEWED action requests.
     * Marks simulation results as viewed for a scenario.
     */
    private async handleMarkResultsViewed(request: ActionRequest): Promise<void> {
        this.log('Handling MARK_RESULTS_VIEWED action:', request.data);
        
        if (!request.data || !request.data.documentId) {
            this.sendErrorResponse(request.actionType, 'Missing documentId in request data');
            return;
        }
        
        try {
            await this.client.performDataAction({
                dataConnectorName: 'quodsi_data_connector',
                actionName: 'MarkResultsViewed',
                actionData: { 
                    documentId: request.data.documentId, 
                    scenarioId: request.data.scenarioId || BASELINE_SCENARIO_ID 
                },
                asynchronous: true
            });
            
            this.sendActionResponse(request.actionType, true, {
                documentId: request.data.documentId
            });
        } catch (error) {
            this.logError('Error marking results as viewed:', error);
            this.sendErrorResponse(
                request.actionType,
                `Failed to mark results as viewed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }
}