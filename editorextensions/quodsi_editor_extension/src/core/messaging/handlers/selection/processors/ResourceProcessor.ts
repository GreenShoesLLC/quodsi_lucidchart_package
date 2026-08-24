import { 
  EditorClient, 
  ItemProxy, 
  ElementProxy,
  PageProxy
} from 'lucid-extension-sdk';
import { SelectionType, ValidationResult, getLogger } from '@quodsi/lucid-shared';
import { BaseSelectionProcessor } from './BaseSelectionProcessor';
import { ModelManager } from '../../../../../core/ModelManager';
import { SelectionStateData } from '../types';
import { itemDataBuilder } from '../utils/itemDataBuilder';
import { referenceDataBuilder } from '../utils/referenceDataBuilder';

const log = getLogger('ResourceProcessor');

/**
 * Processor for resource selection.
 *
 * The payload a Resource block sends the panel is the FLATTENED POINTER:
 * `{ id: <block id>, type: 'Resource', resourceId? }`. That falls out of
 * itemDataBuilder.buildModelItemData, which serializes the block's own q_data
 * (`{ id, resourceId }` under storage format 2) rather than a domain Resource
 * looked up by id -- deliberately, because since Plan 2b the block does not
 * own a resource: the record lives in the page's q_resources and the panel
 * resolves the pointer against the model root. A block whose pointer has not
 * been set yet simply has no `resourceId` key; nothing here throws on it.
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

        log.trace('Processed resource data:', {
          id: item.id,
          hasModelData: messageData.modelItemData ? 'yes' : 'no',
          hasRefData: messageData.referenceData ? 'yes' : 'no',
          statesCount: messageData.referenceData?.states?.length || 0,
          diagramElementType: messageData.diagramElementType
        });
      } catch (error) {
        log.error('Error processing resource:', error);
        messageData.error = 'Error processing resource data';
      }
    } else {
      log.error('No type info found for resource');
      messageData.error = 'No type info found for resource';
    }
    
    return messageData;
  }
}
