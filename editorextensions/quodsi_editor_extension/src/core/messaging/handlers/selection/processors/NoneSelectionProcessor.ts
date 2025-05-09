import { 
  EditorClient, 
  ItemProxy, 
  ElementProxy,
  PageProxy
} from 'lucid-extension-sdk';
import { SelectionType, ValidationResult } from '@quodsi/shared';
import { BaseSelectionProcessor } from './BaseSelectionProcessor';
import { ModelManager } from '../../../../../core/ModelManager';
import { SelectionStateData } from '../types';
import { itemDataBuilder } from '../utils/itemDataBuilder';

/**
 * Processor for no selection (page-level selection)
 */
export class NoneSelectionProcessor extends BaseSelectionProcessor {
  /**
   * Process a none selection (no items selected)
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items (should be empty)
   * @param selectionType The selection type (should be NONE)
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
    console.log('[NoneSelectionProcessor] Processing none selection');
    
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
      console.log('[NoneSelectionProcessor] Not a Quodsi model');
      return messageData;
    }
    
    // Get validation result
    const validationResult = await this.getValidationResult(modelManager);
    messageData.validationResult = validationResult;
    
    // For NONE selection with a model, build model item data for the page
    try {
      messageData.modelItemData = await itemDataBuilder.buildModelItemData(
        currentPage,
        modelManager
      );
      
      console.log('[NoneSelectionProcessor] Built model data for page:', {
        modelData: messageData.modelItemData ? 'present' : 'absent'
      });
    } catch (error) {
      console.error('[NoneSelectionProcessor] Error building model item data:', error);
      messageData.error = 'Error building model data for page';
    }
    
    return messageData;
  }
}
