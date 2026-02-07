import { EnvelopeBase, EnvelopeMessageType, ValidationSeverity, ValidationIssue, Model, SimulationObjectType, ModelSerializerFactory } from '@quodsi/shared';
import { router } from '../index';
import { Viewport, DocumentProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { StorageAdapter } from '../../StorageAdapter';
import { LucidElementFactory } from '../../../services/LucidElementFactory';
import { LucidPageConversionService } from '../../../services/conversion/LucidPageConversionService';
import { SimulationResultsDashboard } from '../../../dashboard/SimulationResultsDashboard';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
// Simple ID generator for extension context (crypto.getRandomValues not available)
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';

/**
 * Handler for model operations (validate, convert, remove, results page)
 */
export class ModelOpsHandler {
  private static logger = ExtensionDebugService.forComponent('ModelOpsHandler');

  /**
   * Last validation results by document ID
   */
  private static validationResults: Map<string, {
    isValid: boolean;
    issues: ValidationIssue[];
    timestamp: Date;
  }> = new Map();

  /**
   * Handle messages related to model operations
   * 
   * @param msg The received message
   * @returns Whether the message was handled
   */
  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.MODEL_VALIDATE:
        return ModelOpsHandler.handleValidate(msg);

      case EnvelopeMessageType.MODEL_VALIDATION_RESULT:
        return ModelOpsHandler.handleValidationResult(msg);

      case EnvelopeMessageType.MODEL_CONVERT:
        // Start async process but return true immediately
        ModelOpsHandler.handleConvert(msg)
          .catch(err => ModelOpsHandler.logger.error('Error handling MODEL_CONVERT:', err));
        return true;

      case EnvelopeMessageType.MODEL_CONVERSION_RESULT:
        return ModelOpsHandler.handleConversionResult(msg);

      case EnvelopeMessageType.MODEL_REMOVE:
        return ModelOpsHandler.handleRemove(msg);

      case EnvelopeMessageType.MODEL_REMOVE_RESULT:
        return ModelOpsHandler.handleRemoveResult(msg);

      case EnvelopeMessageType.MODEL_JSON_REQUEST:
        return ModelOpsHandler.handleModelJsonRequest(msg);

      case EnvelopeMessageType.MODEL_JSON_RESPONSE:
        return ModelOpsHandler.handleModelJsonResponse(msg);

      case EnvelopeMessageType.RESULTS_PAGE_CREATE:
        return ModelOpsHandler.handleResultsPageCreate(msg);

      case EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT:
        return ModelOpsHandler.handleResultsPageCreateResult(msg);

      // Not a model operations message
      default:
        return false;
    }
  }
  
  /**
   * Handle model validation request
   *
   * @param msg MODEL_VALIDATE message
   * @returns True indicating message was handled
   */
  private static handleValidate(msg: EnvelopeBase): boolean {
    const data = msg.data as { documentId: string };

    ModelOpsHandler.logger.log('Model validation requested', {
      documentId: data.documentId
    });

    // Perform async validation
    ModelOpsHandler.performValidation(msg, data)
      .catch(err => ModelOpsHandler.logger.error('Error handling MODEL_VALIDATE:', err));

    return true;
  }

  /**
   * Perform the actual validation using ModelManager
   */
  private static async performValidation(msg: EnvelopeBase, data: { documentId: string }): Promise<void> {
    try {
      const modelManager = ModelManager.getInstance();

      // Call real validation service through ModelManager
      const validationResult = await modelManager.validateModel();

      if (!validationResult) {
        ModelOpsHandler.logger.warn('Validation returned null result');

        // Send empty result
        router.send('model', {
          id: msg.id,
          type: EnvelopeMessageType.MODEL_VALIDATION_RESULT,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            isValid: true,
            issues: [],
            summary: {
              errorCount: 0,
              warningCount: 0,
              infoCount: 0
            }
          }
        });

        return;
      }

      // ValidationResult already has the correct structure with issues and summary
      // Store validation result
      ModelOpsHandler.validationResults.set(data.documentId, {
        isValid: validationResult.isValid,
        issues: validationResult.issues,
        timestamp: new Date()
      });

      ModelOpsHandler.logger.log('Validation complete', {
        isValid: validationResult.isValid,
        errorCount: validationResult.summary.errorCount,
        warningCount: validationResult.summary.warningCount,
        infoCount: validationResult.summary.infoCount
      });

      // Send validation result
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_VALIDATION_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          isValid: validationResult.isValid,
          issues: validationResult.issues,
          summary: validationResult.summary
        }
      });

    } catch (error) {
      ModelOpsHandler.logger.error('Error performing validation:', error);

      // Send error as validation issue
      const errorIssue: ValidationIssue = {
        id: `validation-error-${Date.now()}`,
        severity: ValidationSeverity.ERROR,
        code: 'validation_failed',
        message: error instanceof Error ? error.message : 'Validation failed with unknown error'
      };

      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_VALIDATION_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          isValid: false,
          issues: [errorIssue],
          summary: {
            errorCount: 1,
            warningCount: 0,
            infoCount: 0
          }
        }
      });
    }
  }
  
  /**
   * Handle validation result
   * 
   * @param msg MODEL_VALIDATION_RESULT message
   * @returns True indicating message was handled
   */
  private static handleValidationResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      isValid: boolean;
      issues: ValidationIssue[];
      summary: {
        errorCount: number;
        warningCount: number;
        infoCount: number;
      };
    };
    
    ModelOpsHandler.logger.log('Validation result received', {
      isValid: data.isValid,
      errorCount: data.summary.errorCount,
      warningCount: data.summary.warningCount,
      infoCount: data.summary.infoCount
    });
    
    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness
    
    return true;
  }
  
  /**
   * Handle model conversion request
   * 
   * @param msg MODEL_CONVERT message
   * @returns True indicating message was handled
   */
  private static async handleConvert(msg: EnvelopeBase): Promise<boolean> {
    try {
      const data = msg.data as {
        documentId?: string;
        elementId?: string;
        targetType?: string;
      };
      
      ModelOpsHandler.logger.log('Model conversion requested', {
        documentId: data.documentId,
        elementId: data.elementId,
        targetType: data.targetType
      });
      
      // Get the necessary instances
      const client = ModelManager.getClient();
      const modelManager = ModelManager.getInstance();
      
      // Get the viewport and current page
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();
      const document = new DocumentProxy(client);
      
      if (!currentPage) {
        throw new Error('Current page not available');
      }
      
      // Check if this is a page conversion request (no elementId)
      if (!data.elementId) {
        ModelOpsHandler.logger.log('Converting page to Quodsi model');
        
        try {
          // Set up required services
          const storageAdapter = new StorageAdapter();
          const lucidElementFactory = new LucidElementFactory(storageAdapter);
          const pageConversionService = new LucidPageConversionService(
            modelManager,
            lucidElementFactory,
            storageAdapter
          );
          
          // Check if page can be converted
          if (!pageConversionService.canConvertPage(currentPage)) {
            throw new Error('Page cannot be converted to a model');
          }
          
          // Convert the page
          const result = await pageConversionService.convertPage(currentPage);
          ModelOpsHandler.logger.log('Page conversion successful:', result);
          
          // Send success response
          router.send('model', {
            id: msg.id, // Use same ID for correlation
            type: EnvelopeMessageType.MODEL_CONVERSION_RESULT,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: {
              success: true,
              convertedElementIds: [] // No specific elements for page conversion
            }
          });
          
          // Send both MODEL_CONTEXT and SELECTION_CHANGED messages to force UI refresh
          // Use immediate Promise execution since timing functions may not be available
          Promise.resolve().then(() => {
            const documentId = document.id;
            const isQuodsiModel = modelManager.isQuodsiModel(currentPage);
            const title = document.getTitle() || 'Untitled Document';

            ModelOpsHandler.logger.log('Sending context refresh messages after conversion:', {
              documentId,
              pageId: currentPage.id,
              title,
              isQuodsiModel,
              hasValidModel: isQuodsiModel
            });
            
            // Send MODEL_CONTEXT message
            router.send('model', {
              id: generateId(),
              type: EnvelopeMessageType.MODEL_CONTEXT,
              source: 'host',
              target: 'model-iframe',
              version: '1.0',
              data: {
                documentId,
                title,
                pageId: currentPage.id,
                isQuodsiModel,
                hasValidModel: isQuodsiModel
              }
            });
            
            // Send SELECTION_CHANGED message with embedded document context to force complete refresh
            router.send('model', {
              id: generateId(),
              type: EnvelopeMessageType.SELECTION_CHANGED,
              source: 'host',
              target: 'model-iframe',
              version: '1.0',
              data: {
                selectionType: 'page',
                documentId: documentId,
                hasModel: true,
                selectionState: {
                  pageId: currentPage.id,
                  selectedIds: [],
                  selectionType: 'page'
                },
                documentContext: {
                  documentId,
                  pageId: currentPage.id,
                  title,
                  isQuodsiModel,
                  metadata: {}
                }
              }
            });
            
            ModelOpsHandler.logger.log('Sent both MODEL_CONTEXT and SELECTION_CHANGED messages');
          }).catch(error => {
            ModelOpsHandler.logger.error('Error sending context refresh messages:', error);
          });
          
          return true;
        } catch (error) {
          ModelOpsHandler.logger.error('Page conversion error:', error);
          throw error; // rethrow to be caught by outer catch
        }
      }
      
      // Handle element-specific conversion (if we have an elementId)
      // This is now handled by ElementOpsHandler.handleElementConvert
      // But we'll keep a basic implementation here for backward compatibility
      ModelOpsHandler.logger.log('Element conversion not implemented here, use ELEMENT_CONVERT');
      
      // Send response indicating we're not handling element conversion here
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_CONVERSION_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          convertedElementIds: [],
          error: 'Element conversion should use ELEMENT_CONVERT message type'
        }
      });
      
      return false;
    } catch (error) {
      ModelOpsHandler.logger.error('Error in model conversion:', error);
      
      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_CONVERSION_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          convertedElementIds: [],
          error: error instanceof Error ? error.message : String(error)
        }
      });
      
      return false;
    }
  }
  
  /**
   * Handle conversion result
   * 
   * @param msg MODEL_CONVERSION_RESULT message
   * @returns True indicating message was handled
   */
  private static handleConversionResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      convertedElementIds: string[];
      error?: string;
    };
    
    ModelOpsHandler.logger.log('Conversion result received', {
      success: data.success,
      convertedCount: data.convertedElementIds.length,
      error: data.error
    });
    
    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness
    
    return true;
  }
  
  /**
   * Handle model removal request
   * 
   * @param msg MODEL_REMOVE message
   * @returns True indicating message was handled
   */
  private static handleRemove(msg: EnvelopeBase): boolean {
    const data = msg.data as { documentId: string };
    
    ModelOpsHandler.logger.log('Model removal requested', {
      documentId: data.documentId
    });
    
    // Start async process but return true immediately
    ModelOpsHandler.performRemove(msg, data)
      .catch(err => ModelOpsHandler.logger.error('Error handling MODEL_REMOVE:', err));
    
    return true;
  }

  /**
   * Perform the actual model removal
   */
  private static async performRemove(msg: EnvelopeBase, data: { documentId: string }): Promise<void> {
    try {
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();
      
      if (!currentPage) {
        throw new Error('No current page available for model removal');
      }
      
      ModelOpsHandler.logger.log('Removing model from current page');
      
      // Perform the actual model removal
      const modelManager = ModelManager.getInstance();
      modelManager.removeModelFromPage(currentPage);
      
      ModelOpsHandler.logger.log('Model removal successful');
      
      // Send success response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_REMOVE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true
        }
      });
      
      // Send both MODEL_CONTEXT and SELECTION_CHANGED messages to force UI refresh
      // Use immediate Promise execution since timing functions may not be available
      Promise.resolve().then(() => {
        const client = ModelManager.getClient();
        const document = new DocumentProxy(client);
        const documentId = document.id;
        const title = document.getTitle() || 'Untitled Document';
        const isQuodsiModel = modelManager.isQuodsiModel(currentPage);
        
        ModelOpsHandler.logger.log('Sending context refresh messages after removal:', {
          documentId,
          pageId: currentPage.id,
          title,
          isQuodsiModel,
          hasValidModel: isQuodsiModel
        });
        
        // Send MODEL_CONTEXT message
        router.send('model', {
          id: generateId(),
          type: EnvelopeMessageType.MODEL_CONTEXT,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            documentId,
            title,
            pageId: currentPage.id,
            isQuodsiModel,
            hasValidModel: isQuodsiModel
          }
        });
        
        // Send SELECTION_CHANGED message with embedded document context to force complete refresh
        router.send('model', {
          id: generateId(),
          type: EnvelopeMessageType.SELECTION_CHANGED,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            selectionType: 'page',
            documentId: documentId,
            hasModel: false,
            selectionState: {
              pageId: currentPage.id,
              selectedIds: [],
              selectionType: 'page'
            },
            documentContext: {
              documentId,
              pageId: currentPage.id,
              title,
              isQuodsiModel,
              metadata: {}
            }
          }
        });
        
        ModelOpsHandler.logger.log('Sent both MODEL_CONTEXT and SELECTION_CHANGED messages');
      }).catch(error => {
        ModelOpsHandler.logger.error('Error sending context refresh messages after removal:', error);
      });
      
    } catch (error) {
      ModelOpsHandler.logger.error('Error removing model:', error);
      
      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_REMOVE_RESULT,
        source: 'host', 
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
  
  /**
   * Handle removal result
   * 
   * @param msg MODEL_REMOVE_RESULT message
   * @returns True indicating message was handled
   */
  private static handleRemoveResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      error?: string;
    };
    
    ModelOpsHandler.logger.log('Removal result received', {
      success: data.success,
      error: data.error
    });
    
    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness
    
    return true;
  }
  
  /**
   * Handle results page creation request
   *
   * @param msg RESULTS_PAGE_CREATE message
   * @returns True indicating message was handled
   */
  private static handleResultsPageCreate(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      scenarioId: string;
      documentId: string;
      pageTitle?: string;
      createDashboard?: boolean;
    };

    ModelOpsHandler.logger.log('Results page creation requested', {
      scenarioId: data.scenarioId,
      documentId: data.documentId,
      pageTitle: data.pageTitle,
      createDashboard: data.createDashboard
    });

    // Start async process but return true immediately
    ModelOpsHandler.createResultsPage(msg, data)
      .catch(err => ModelOpsHandler.logger.error('Error creating results page:', err));

    return true;
  }
  
  /**
   * Async method to create the results page
   */
  private static async createResultsPage(msg: EnvelopeBase, data: {
    scenarioId: string;
    documentId: string;
    pageTitle?: string;
    createDashboard?: boolean;
  }): Promise<void> {
    try {
      ModelOpsHandler.logger.log('Creating simulation results dashboard...');

      const client = ModelManager.getClient();

      // Validate required parameters
      if (!data.scenarioId) {
        throw new Error('scenarioId is required to create results page');
      }

      // Always import results before creating dashboard
      // Note: Every results page needs data, so we always call ImportSimulationResults
      await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_data_connector',
        actionName: 'ImportSimulationResults',
        actionData: {
          documentId: data.documentId,
          scenarioId: data.scenarioId,
          collectionsToImport: [
            'activity_cross_rep',
            'entity_cross_rep',
            'resource_cross_rep',
          ]
        },
        asynchronous: true
      });
      
      // Create dashboard instance
      const dashboard = new SimulationResultsDashboard(client);
      
      // Generate a dashboard with the current date/time in the name
      const timestamp = new Date().toLocaleString().replace(/[/\\:]/g, '-');
      const pageName = data.pageTitle || `Quodsi - ${timestamp}`;
      const result = await dashboard.createDashboard(pageName);
      
      ModelOpsHandler.logger.log(`Dashboard created with ${result.tables.length} tables`);
      
      // Check for issues
      if (result.emptyDataTypes.length > 0) {
        ModelOpsHandler.logger.log(`The following data types had no data: ${result.emptyDataTypes.join(', ')}`);
      }
      
      if (result.errors.length > 0) {
        ModelOpsHandler.logger.warn(`${result.errors.length} errors occurred while creating the dashboard`);
        result.errors.forEach(err => {
          ModelOpsHandler.logger.error(`Error creating ${err.type} table:`, err.error);
        });
      }
      
      // Mark results as viewed
      await LucidDataActionUtility.performDataAction(client, {
        dataConnectorName: 'quodsi_data_connector',
        actionName: 'MarkResultsViewed',
        actionData: {
          documentId: data.documentId,
          scenarioId: data.scenarioId
        },
        asynchronous: true
      });
      
      // Send success response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true,
          pageId: result.page.id,
          tablesCreated: result.tables.length,
          emptyDataTypes: result.emptyDataTypes,
          errors: result.errors.map(err => ({
            type: err.type,
            message: err.error instanceof Error ? err.error.message : String(err.error)
          }))
        }
      });
      
    } catch (error) {
      ModelOpsHandler.logger.error('Error creating simulation results dashboard:', error);
      
      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
  
  /**
   * Handle results page creation result
   * 
   * @param msg RESULTS_PAGE_CREATE_RESULT message
   * @returns True indicating message was handled
   */
  private static handleResultsPageCreateResult(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      pageId?: string;
      error?: string;
    };
    
    ModelOpsHandler.logger.log('Results page creation result received', {
      success: data.success,
      pageId: data.pageId,
      error: data.error
    });
    
    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness
    
    return true;
  }
  
  /**
   * Handle model JSON request
   *
   * @param msg MODEL_JSON_REQUEST message
   * @returns True indicating message was handled
   */
  private static handleModelJsonRequest(msg: EnvelopeBase): boolean {
    const data = msg.data as { documentId: string };

    ModelOpsHandler.logger.log('Model JSON requested', {
      documentId: data.documentId
    });

    // Start async process but return true immediately
    ModelOpsHandler.serializeAndSendModel(msg, data)
      .catch(err => ModelOpsHandler.logger.error('Error handling MODEL_JSON_REQUEST:', err));

    return true;
  }

  /**
   * Serialize the model and send it back
   */
  private static async serializeAndSendModel(msg: EnvelopeBase, data: { documentId: string }): Promise<void> {
    try {
      const modelManager = ModelManager.getInstance();
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const documentProxy = new DocumentProxy(client);
      const activePageProxy = viewport.getCurrentPage();

      // Verify we have an active page
      if (!activePageProxy) {
        ModelOpsHandler.logger.error('No active page found');

        router.send('model', {
          id: msg.id,
          type: EnvelopeMessageType.MODEL_JSON_RESPONSE,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            success: false,
            error: 'No active page found'
          }
        });

        return;
      }

      // Ensure the model is loaded for the current page
      ModelOpsHandler.logger.log('Ensuring model is loaded for current page...');
      try {
        // Check if current page is set in ModelManager
        let currentModelDef = await modelManager.getModelDefinition();
        if (!currentModelDef) {
          // Try to initialize/reload the model for the current page
          ModelOpsHandler.logger.log('No current model definition, attempting to initialize...');

          // Check if this is a Quodsi model page
          const isQuodsiModel = modelManager.isQuodsiModel(activePageProxy);
          if (!isQuodsiModel) {
            ModelOpsHandler.logger.error('Current page is not a Quodsi model');

            router.send('model', {
              id: msg.id,
              type: EnvelopeMessageType.MODEL_JSON_RESPONSE,
              source: 'host',
              target: 'model-iframe',
              version: '1.0',
              data: {
                success: false,
                error: 'Current page is not a Quodsi model. Please convert it first.'
              }
            });

            return;
          }

          // Try to initialize the model for the current page
          ModelOpsHandler.logger.log('Initializing model for current page...');
          const basicModel = Model.createDefault(documentProxy.id);
          await modelManager.initializeModel(basicModel, activePageProxy);

          // Get the model definition again after initialization
          currentModelDef = await modelManager.getModelDefinition();
        }

        // Final check if we have a model definition
        if (!currentModelDef) {
          ModelOpsHandler.logger.error('No model definition found after initialization attempt');

          router.send('model', {
            id: msg.id,
            type: EnvelopeMessageType.MODEL_JSON_RESPONSE,
            source: 'host',
            target: 'model-iframe',
            version: '1.0',
            data: {
              success: false,
              error: 'No model definition found. Please ensure the page contains Quodsi model elements.'
            }
          });

          return;
        }

        // Serialize the model (same as simulation button)
        ModelOpsHandler.logger.log('Serializing model...');
        const serializer = ModelSerializerFactory.create(currentModelDef);
        const serializedModel = serializer.serialize(currentModelDef);
        ModelOpsHandler.logger.log('Model serialized successfully');

        // Send success response with JSON
        router.send('model', {
          id: msg.id,
          type: EnvelopeMessageType.MODEL_JSON_RESPONSE,
          source: 'host',
          target: 'model-iframe',
          version: '1.0',
          data: {
            success: true,
            modelJson: serializedModel
          }
        });

      } catch (initError) {
        ModelOpsHandler.logger.error('Error during model initialization:', initError);
        throw initError;
      }

    } catch (error) {
      ModelOpsHandler.logger.error('Error serializing model:', error);

      // Send error response
      router.send('model', {
        id: msg.id,
        type: EnvelopeMessageType.MODEL_JSON_RESPONSE,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: false,
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }

  /**
   * Handle model JSON response
   *
   * @param msg MODEL_JSON_RESPONSE message
   * @returns True indicating message was handled
   */
  private static handleModelJsonResponse(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      success: boolean;
      modelJson?: any;
      error?: string;
    };

    ModelOpsHandler.logger.log('Model JSON response received', {
      success: data.success,
      hasJson: !!data.modelJson,
      error: data.error
    });

    // This is usually sent by the extension, not received
    // But we'll handle it anyway for completeness

    return true;
  }

  /**
   * Get the last validation result for a document
   */
  public static getValidationResult(documentId: string) {
    return ModelOpsHandler.validationResults.get(documentId);
  }
}
