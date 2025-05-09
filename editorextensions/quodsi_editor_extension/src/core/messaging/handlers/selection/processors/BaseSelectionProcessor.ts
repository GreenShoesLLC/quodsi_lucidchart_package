import { 
  EditorClient, 
  ItemProxy, 
  ElementProxy,
  DocumentProxy,
  Viewport,
  PageProxy
} from 'lucid-extension-sdk';
import { 
  SelectionType,
  DiagramElementType,
  ValidationResult,
  ValidationMessage,
  ValidationMessageType
} from '@quodsi/shared';
import { ModelManager } from '../../../../../core/ModelManager';
import { SelectionStateData } from '../types';
import { selectionTypeUtils } from '../utils/selectionTypeUtils';

/**
 * Base class for all selection processors
 */
export abstract class BaseSelectionProcessor {
  /**
   * Process a selection and generate message data
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items
   * @param selectionType The selection type
   * @param modelManager The model manager
   * @returns The message data
   */
  abstract process(
    client: EditorClient,
    currentPage: PageProxy,
    items: ItemProxy[],
    selectionType: SelectionType,
    modelManager: ModelManager
  ): Promise<Partial<SelectionStateData>>;
  
  /**
   * Create base message data common to all selection types
   * @param items The selected items
   * @param currentPage The current page
   * @param selectionType The selection type
   * @param documentId The document ID
   * @param isQuodsiModel Whether this is a Quodsi model
   * @returns Base message data
   */
  protected createBaseMessageData(
    items: ItemProxy[],
    currentPage: PageProxy,
    selectionType: SelectionType,
    documentId: string,
    isQuodsiModel: boolean
  ): Partial<SelectionStateData> {
    const elements = selectionTypeUtils.createElementShapes(items);
    const selectedIds = items.map(item => item.id);
    
    return {
      selectionType,
      documentId,
      hasModel: isQuodsiModel,
      selectionState: {
        pageId: currentPage.id,
        selectedIds,
        selectionType
      },
      selectedElements: elements,
      selectionCount: items.length,
      totalElementCount: currentPage.allBlocks.size + currentPage.allLines.size,
      
      // For single selections, set elementId
      ...(items.length === 1 ? { elementId: items[0].id } : {})
    };
  }
  
  /**
   * Get the validation result from the model manager
   * @param modelManager The model manager
   * @returns The validation result
   */
  protected async getValidationResult(modelManager: ModelManager): Promise<ValidationResult> {
    try {
      const result = await modelManager.validateModel();
      return result;
    } catch (error) {
      console.error('[BaseSelectionProcessor] Error getting validation result:', error);
      
      // Create a properly formatted ValidationResult
      const errorMessage: ValidationMessage = {
        type: 'error', // Use string literal as defined in ValidationMessageType
        message: 'Error validating model',
        elementId: undefined, // Use undefined instead of null
        code: 'VALIDATION_ERROR'
      };
      
      // Create validation result with the same structure as ModelManager.validateModel
      const messages = [errorMessage];
      const errorCount = messages.filter(m => m.type === 'error').length;
      const warningCount = messages.filter(m => m.type === 'warning').length;
      
      return {
        isValid: false,
        messages,
        errorCount,
        warningCount
      };
    }
  }
  
  /**
   * Get the document ID from the client
   * @param client The editor client
   * @returns The document ID
   */
  protected getDocumentId(client: EditorClient): string {
    return new DocumentProxy(client).id;
  }
  
  /**
   * Get the current page from the client
   * @param client The editor client
   * @returns The current page or undefined if none
   */
  protected getCurrentPage(client: EditorClient): PageProxy | undefined {
    return new Viewport(client).getCurrentPage();
  }
  
  /**
   * Determine if an element is a block or line
   * @param item The item proxy
   * @returns The diagram element type
   */
  protected getDiagramElementType(item: ItemProxy): DiagramElementType {
    // Check if this is an instance of line using the className property
    // This is safer than using instanceof which may not work as expected
    // due to how types are loaded in the extension environment
    const className = (item as any).className || '';
    return className.includes('Line') ? DiagramElementType.LINE : DiagramElementType.BLOCK;
  }
}
