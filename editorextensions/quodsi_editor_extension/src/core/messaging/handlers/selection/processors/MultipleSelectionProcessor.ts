import { 
  EditorClient, 
  ItemProxy, 
  ElementProxy,
  PageProxy
} from 'lucid-extension-sdk';
import { SelectionType, ValidationResult } from '@quodsi/lucid-shared';
import { BaseSelectionProcessor } from './BaseSelectionProcessor';
import { ModelManager } from '../../../../../core/ModelManager';
import { SelectionStateData } from '../types';
import { itemDataBuilder } from '../utils/itemDataBuilder';

/**
 * Processor for multiple item selection
 */
export class MultipleSelectionProcessor extends BaseSelectionProcessor {
  /**
   * Process a multiple selection
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items (multiple)
   * @param selectionType The selection type (should be MULTIPLE)
   * @param modelManager The model manager
   * @returns The message data
   */
  async process(
    client: EditorClient,
    currentPage: PageProxy,
    items: ItemProxy[],
    selectionType: SelectionType,
    modelManager: ModelManager
  ): Promise<Partial<SelectionStateData>> {
    console.log('[MultipleSelectionProcessor] Processing multiple selection', {
      itemCount: items.length
    });
    
    const documentId = this.getDocumentId(client);
    const isQuodsiModel = modelManager.isQuodsiModel(currentPage);
    
    // Create the base message
    const messageData = this.createBaseMessageData(
      items,
      currentPage,
      selectionType,
      documentId,
      isQuodsiModel
    );
    
    // If this isn't a Quodsi model, return the basic info
    if (!isQuodsiModel) {
      console.log('[MultipleSelectionProcessor] Not a Quodsi model');
      return messageData;
    }
    
    // Get validation result
    const validationResult = await this.getValidationResult(modelManager);
    messageData.validationResult = validationResult;
    
    try {
      // Build model item data for all selected items
      messageData.modelItemData = await itemDataBuilder.buildMultipleModelItemData(
        items,
        modelManager
      );
      
      console.log('[MultipleSelectionProcessor] Built model data for multiple items:', {
        count: Array.isArray(messageData.modelItemData) ? messageData.modelItemData.length : 0
      });
    } catch (error) {
      console.error('[MultipleSelectionProcessor] Error building model item data:', error);
      messageData.error = 'Error building model data for multiple items';
    }
    
    return messageData;
  }
}
