import { EnvelopeBase, EnvelopeMessageType, ValidationSeverity, ValidationIssue, SimulationObjectType, resolveModelName } from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport, DocumentProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { StorageAdapter } from '../../StorageAdapter';
import { LucidElementFactory } from '../../../services/LucidElementFactory';
import { LucidPageConversionService } from '../../../services/conversion/LucidPageConversionService';
import { LucidDataActionUtility } from '../../../utils/LucidDataActionUtility';
// Simple ID generator for extension context (crypto.getRandomValues not available)
const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
import { getLogger } from '@quodsi/lucid-shared';
import { SelectionHandler } from './selection';
import { AnalyticsHandler } from './analyticsHandler';

/**
 * Handler for model operations (validate, convert, remove, results page)
 */
export class ModelOpsHandler {
  private static logger = getLogger('ModelOpsHandler');

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

      case EnvelopeMessageType.MODEL_CONVERT:
        // Start async process but return true immediately
        ModelOpsHandler.handleConvert(msg)
          .catch(err => ModelOpsHandler.logger.error('Error handling MODEL_CONVERT:', err));
        return true;

      case EnvelopeMessageType.MODEL_REMOVE:
        return ModelOpsHandler.handleRemove(msg);

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

    ModelOpsHandler.logger.debug('Model validation requested', {
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

      // Explicit Validate: run now, not in the coalesced window.
      const validationResult = await modelManager.validateModelNow();

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

      ModelOpsHandler.logger.debug('Validation complete', {
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
      
      ModelOpsHandler.logger.debug('Model conversion requested', {
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
        ModelOpsHandler.logger.debug('Converting page to Quodsi model');
        
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
          ModelOpsHandler.logger.debug('Page conversion successful:', result);
          
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
          
          // Send context refresh messages using SelectionHandler for proper modelItemData & referenceData
          Promise.resolve().then(async () => {
            const documentId = document.id;
            const title = resolveModelName(document.getTitle(), new Date());

            ModelOpsHandler.logger.debug('Sending context refresh messages after conversion:', {
              documentId,
              pageId: currentPage.id,
              title
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
                isQuodsiModel: true,
                hasValidModel: true
              }
            });

            // Use SelectionHandler to send proper SELECTION_CHANGED with modelItemData & referenceData
            SelectionHandler.setDocumentContext(
              documentId,
              currentPage.id,
              title,
              true
            );

            // Page just became a Quodsi model — activation milestone.
            AnalyticsHandler.fire('first_model_created', { model_id: documentId });

            ModelOpsHandler.logger.debug('Sent MODEL_CONTEXT and triggered SelectionHandler refresh');
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
      ModelOpsHandler.logger.debug('Element conversion not implemented here, use ELEMENT_CONVERT');
      
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
   * Handle model removal request
   * 
   * @param msg MODEL_REMOVE message
   * @returns True indicating message was handled
   */
  private static handleRemove(msg: EnvelopeBase): boolean {
    const data = msg.data as { documentId: string };
    
    ModelOpsHandler.logger.debug('Model removal requested', {
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
      
      ModelOpsHandler.logger.debug('Removing model from current page');
      
      // Perform the actual model removal
      const modelManager = ModelManager.getInstance();
      modelManager.removeModelFromPage(currentPage);
      
      ModelOpsHandler.logger.debug('Model removal successful');
      
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
        const title = resolveModelName(document.getTitle(), new Date());
        const isQuodsiModel = modelManager.isQuodsiModel(currentPage);
        
        ModelOpsHandler.logger.debug('Sending context refresh messages after removal:', {
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
        
        ModelOpsHandler.logger.debug('Sent both MODEL_CONTEXT and SELECTION_CHANGED messages');

        // Remove model from quodsi_api database (fire-and-forget)
        LucidDataActionUtility.performDataAction(client, {
          dataConnectorName: 'quodsi_api_data_connector',
          actionName: 'RemoveModel',
          actionData: {
            documentId,
            pageId: currentPage.id
          },
          asynchronous: false
        }).then(() => {
          ModelOpsHandler.logger.debug('Model removed from database after unmap');
        }).catch(err => {
          ModelOpsHandler.logger.error('Failed to remove model from database:', err);
        });
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
   * Get the last validation result for a document
   */
  public static getValidationResult(documentId: string) {
    return ModelOpsHandler.validationResults.get(documentId);
  }
}
