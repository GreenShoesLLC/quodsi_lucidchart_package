import { EnvelopeBase, EnvelopeMessageType, ValidationSeverity, ValidationIssue, Model, SimulationObjectType } from '@quodsi/shared';
import { router } from '../index';
import { Viewport, DocumentProxy } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { StorageAdapter } from '../../StorageAdapter';
import { LucidElementFactory } from '../../../services/LucidElementFactory';
import { LucidPageConversionService } from '../../../services/conversion/LucidPageConversionService';

/**
 * Handler for model operations (validate, convert, remove, results page)
 */
export class ModelOpsHandler {
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
          .catch(err => console.error('[ModelOpsHandler] Error handling MODEL_CONVERT:', err));
        return true;
        
      case EnvelopeMessageType.MODEL_CONVERSION_RESULT:
        return ModelOpsHandler.handleConversionResult(msg);
        
      case EnvelopeMessageType.MODEL_REMOVE:
        return ModelOpsHandler.handleRemove(msg);
        
      case EnvelopeMessageType.MODEL_REMOVE_RESULT:
        return ModelOpsHandler.handleRemoveResult(msg);
        
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
    
    console.log('[ModelOpsHandler] Model validation requested', {
      documentId: data.documentId
    });
    
    // TODO: Perform actual validation
    // For now, send a mock validation result
    setTimeout(() => {
      // Generate some mock issues
      const issues: ValidationIssue[] = [
        {
          id: `issue-${Date.now()}-1`,
          elementId: 'element-1',
          severity: ValidationSeverity.ERROR,
          code: 'missing_connection',
          message: 'Entity has no outgoing connections'
        },
        {
          id: `issue-${Date.now()}-2`,
          elementId: 'element-2',
          severity: ValidationSeverity.WARNING,
          code: 'missing_property',
          message: 'Resource capacity not specified'
        },
        {
          id: `issue-${Date.now()}-3`,
          severity: ValidationSeverity.INFO,
          code: 'performance_tip',
          message: 'Consider adding more parallel activities for better throughput'
        }
      ];
      
      // Store validation result
      ModelOpsHandler.validationResults.set(data.documentId, {
        isValid: false,
        issues,
        timestamp: new Date()
      });
      
      // Send validation result
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.MODEL_VALIDATION_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          isValid: false,
          issues,
          summary: {
            errorCount: 1,
            warningCount: 1,
            infoCount: 1
          }
        }
      });
    }, 1000);
    
    return true;
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
    
    console.log('[ModelOpsHandler] Validation result received', {
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
      
      console.log('[ModelOpsHandler] Model conversion requested', {
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
        console.log('[ModelOpsHandler] Converting page to Quodsi model');
        
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
          console.log('[ModelOpsHandler] Page conversion successful:', result);
          
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
          
          // Update the current selection to refresh the UI
          const selectedItems = viewport.getSelectedItems();
          viewport.setSelectedItems(selectedItems);
          
          return true;
        } catch (error) {
          console.error('[ModelOpsHandler] Page conversion error:', error);
          throw error; // rethrow to be caught by outer catch
        }
      }
      
      // Handle element-specific conversion (if we have an elementId)
      // This is now handled by ElementOpsHandler.handleElementConvert
      // But we'll keep a basic implementation here for backward compatibility
      console.log('[ModelOpsHandler] Element conversion not implemented here, use ELEMENT_CONVERT');
      
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
      console.error('[ModelOpsHandler] Error in model conversion:', error);
      
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
    
    console.log('[ModelOpsHandler] Conversion result received', {
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
    
    console.log('[ModelOpsHandler] Model removal requested', {
      documentId: data.documentId
    });
    
    // TODO: Perform actual model removal
    // For now, send a mock removal result
    setTimeout(() => {
      // Send removal result
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.MODEL_REMOVE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true
        }
      });
    }, 1000);
    
    return true;
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
    
    console.log('[ModelOpsHandler] Removal result received', {
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
      jobId: string;
      documentId: string;
      pageTitle?: string;
    };
    
    console.log('[ModelOpsHandler] Results page creation requested', {
      jobId: data.jobId,
      documentId: data.documentId,
      pageTitle: data.pageTitle
    });
    
    // TODO: Create actual results page
    // For now, send a mock creation result
    setTimeout(() => {
      // Send creation result
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.RESULTS_PAGE_CREATE_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true,
          pageId: `page-${Date.now()}`
        }
      });
    }, 1500);
    
    return true;
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
    
    console.log('[ModelOpsHandler] Results page creation result received', {
      success: data.success,
      pageId: data.pageId,
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
