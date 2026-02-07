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
import { referenceDataBuilder } from '../utils/referenceDataBuilder';

/**
 * Processor for entity selection
 */
export class EntityProcessor extends BaseSelectionProcessor {
  /**
   * Process an entity selection
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items (should be single entity)
   * @param selectionType The selection type (should be ENTITY)
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
    console.log('[EntityProcessor] Processing entity selection');
    
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
      console.log('[EntityProcessor] Not a Quodsi model or multiple items selected');
      return messageData;
    }
    
    // Get validation result
    const validationResult = await this.getValidationResult(modelManager);
    messageData.validationResult = validationResult;
    
    const item = items[0];
    const typeInfo = modelManager.getElementType(item);

    if (typeInfo) {
      try {
        // Get model item data
        messageData.modelItemData = await itemDataBuilder.buildModelItemData(
          item,
          modelManager
        );

        // Get complete reference data for all editors
        messageData.referenceData = await referenceDataBuilder.buildAllReferenceData(
          modelManager
        );

        // Set diagram element type
        messageData.diagramElementType = this.getDiagramElementType(item);

        console.log('[EntityProcessor] Processed entity data:', {
          id: item.id,
          hasModelData: messageData.modelItemData ? 'yes' : 'no',
          hasRefData: messageData.referenceData ? 'yes' : 'no',
          statesCount: messageData.referenceData?.states?.length || 0,
          diagramElementType: messageData.diagramElementType
        });
      } catch (error) {
        console.error('[EntityProcessor] Error processing entity:', error);
        messageData.error = 'Error processing entity data';
      }
    } else {
      console.error('[EntityProcessor] No type info found for entity');
      messageData.error = 'No type info found for entity';
    }
    
    return messageData;
  }
}
