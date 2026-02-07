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
 * Processor for resource selection
 */
export class ResourceProcessor extends BaseSelectionProcessor {
  /**
   * Process a resource selection
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items (should be single resource)
   * @param selectionType The selection type (should be RESOURCE)
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
    console.log('[ResourceProcessor] Processing resource selection');
    
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
      console.log('[ResourceProcessor] Not a Quodsi model or multiple items selected');
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

        console.log('[ResourceProcessor] Processed resource data:', {
          id: item.id,
          hasModelData: messageData.modelItemData ? 'yes' : 'no',
          hasRefData: messageData.referenceData ? 'yes' : 'no',
          statesCount: messageData.referenceData?.states?.length || 0,
          diagramElementType: messageData.diagramElementType
        });
      } catch (error) {
        console.error('[ResourceProcessor] Error processing resource:', error);
        messageData.error = 'Error processing resource data';
      }
    } else {
      console.error('[ResourceProcessor] No type info found for resource');
      messageData.error = 'No type info found for resource';
    }
    
    return messageData;
  }
}
