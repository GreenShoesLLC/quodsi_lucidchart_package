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
 * Processor for activity selection
 */
export class ActivityProcessor extends BaseSelectionProcessor {
  /**
   * Process an activity selection
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items (should be single activity)
   * @param selectionType The selection type (should be ACTIVITY)
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
    console.log('[ActivityProcessor] Processing activity selection');

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
      console.log('[ActivityProcessor] Not a Quodsi model or multiple items selected');
      return messageData;
    }

    // Ensure ModelManager has the current page set so ModelDefinition can be built
    modelManager.setCurrentPage(currentPage);

    // Get validation result
    const validationResult = await this.getValidationResult(modelManager);
    messageData.validationResult = validationResult;

    const item = items[0];
    const metadata = modelManager.getMetadata(item);

    if (metadata) {
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

        console.log('[ActivityProcessor] Processed activity data:', {
          id: item.id,
          hasModelData: messageData.modelItemData ? 'yes' : 'no',
          hasRefData: messageData.referenceData ? 'yes' : 'no',
          refDataSummary: messageData.referenceData ? {
            resources: messageData.referenceData.resources?.length || 0,
            resourceRequirements: messageData.referenceData.resourceRequirements?.length || 0,
            connectors: messageData.referenceData.connectors?.length || 0
          } : 'none',
          diagramElementType: messageData.diagramElementType
        });
      } catch (error) {
        console.error('[ActivityProcessor] Error processing activity:', error);
        messageData.error = 'Error processing activity data';
      }
    } else {
      console.error('[ActivityProcessor] No metadata found for activity');
      messageData.error = 'No metadata found for activity';
    }
    
    return messageData;
  }
}
