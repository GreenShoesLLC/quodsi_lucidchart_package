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
 * Processor for unconverted element selection
 */
export class UnconvertedProcessor extends BaseSelectionProcessor {
  /**
   * Process an unconverted element selection
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items (should be a single unconverted element)
   * @param selectionType The selection type (should be UNCONVERTED_ELEMENT)
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
    console.log('[UnconvertedProcessor] Processing unconverted element selection');
    
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
    
    // If this isn't a Quodsi model or we don't have exactly one item, return basic info
    if (!isQuodsiModel || items.length !== 1) {
      console.log('[UnconvertedProcessor] Not a Quodsi model or multiple items selected');
      return messageData;
    }
    
    // Get validation result
    const validationResult = await this.getValidationResult(modelManager);
    messageData.validationResult = validationResult;
    
    const item = items[0];
    
    try {
      // Build model item data for the unconverted element
      const modelItemData = await itemDataBuilder.buildModelItemData(
        item,
        modelManager
      );
      
      // Mark as unconverted
      modelItemData.isUnconverted = true;
      messageData.modelItemData = modelItemData;
      
      // Set diagram element type
      messageData.diagramElementType = this.getDiagramElementType(item);
      
      console.log('[UnconvertedProcessor] Processed unconverted element:', {
        id: item.id,
        diagramElementType: messageData.diagramElementType
      });
    } catch (error) {
      console.error('[UnconvertedProcessor] Error building model item data:', error);
      messageData.error = 'Error building model data for unconverted element';
    }
    
    return messageData;
  }
}
