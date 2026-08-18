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

const log = getLogger('GeneratorProcessor');

/**
 * Processor for generator selection
 */
export class GeneratorProcessor extends BaseSelectionProcessor {
  /**
   * Process a generator selection
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items (should be single generator)
   * @param selectionType The selection type (should be GENERATOR)
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

    // Ensure ModelManager has the current page set so ModelDefinition can be built
    modelManager.setCurrentPage(currentPage);

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
        
        log.trace('Processed generator data:', {
          id: item.id,
          hasModelData: messageData.modelItemData ? 'yes' : 'no',
          hasRefData: messageData.referenceData ? 'yes' : 'no',
          entityCount: messageData.referenceData?.entities?.length,
          diagramElementType: messageData.diagramElementType
        });
      } catch (error) {
        log.error('Error processing generator:', error);
        messageData.error = 'Error processing generator data';
      }
    } else {
      log.error('No type info found for generator');
      messageData.error = 'No type info found for generator';
    }
    
    return messageData;
  }
}
