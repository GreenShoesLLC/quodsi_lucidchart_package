import { EnvelopeBase, EnvelopeMessageType, ValidationSeverity, ValidationIssue } from '@quodsi/shared';
import { router } from '../index';

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
        return ModelOpsHandler.handleConvert(msg);
        
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
  private static handleConvert(msg: EnvelopeBase): boolean {
    const data = msg.data as {
      documentId: string;
      elementId?: string;
      targetType?: string;
    };
    
    console.log('[ModelOpsHandler] Model conversion requested', {
      documentId: data.documentId,
      elementId: data.elementId,
      targetType: data.targetType
    });
    
    // TODO: Perform actual conversion
    // For now, send a mock conversion result
    setTimeout(() => {
      // Send conversion result
      router.send('model', {
        id: msg.id, // Use same ID for correlation
        type: EnvelopeMessageType.MODEL_CONVERSION_RESULT,
        source: 'host',
        target: 'model-iframe',
        version: '1.0',
        data: {
          success: true,
          convertedElementIds: data.elementId ? [data.elementId] : ['element-1', 'element-2', 'element-3']
        }
      });
    }, 1000);
    
    return true;
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
