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
import { referenceDataBuilder } from '../utils/referenceDataBuilder';

/**
 * Processor for model selection
 */
export class ModelProcessor extends BaseSelectionProcessor {
  /**
   * Process a model selection
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items (should be single model)
   * @param selectionType The selection type (should be MODEL)
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
    console.log('[ModelProcessor] Processing model selection');

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
      console.log('[ModelProcessor] Not a Quodsi model');
      return messageData;
    }

    // Ensure ModelManager has the current page set so ModelDefinition can be built
    modelManager.setCurrentPage(currentPage);

    // Get validation result
    const validationResult = await this.getValidationResult(modelManager);
    messageData.validationResult = validationResult;

    try {
      // For MODEL type, build model item data for the page
      messageData.modelItemData = await itemDataBuilder.buildModelItemData(
        currentPage,
        modelManager
      );

      // Get complete reference data for all editors
      messageData.referenceData = await referenceDataBuilder.buildAllReferenceData(
        modelManager
      );

      console.log('[ModelProcessor] Processed model data:', {
        pageId: currentPage.id,
        hasModelData: messageData.modelItemData ? 'yes' : 'no',
        hasRefData: messageData.referenceData ? 'yes' : 'no',
        refDataSummary: messageData.referenceData ? {
          activities: messageData.referenceData.activities?.length || 0,
          resources: messageData.referenceData.resources?.length || 0,
          entities: messageData.referenceData.entities?.length || 0,
          resourceRequirements: messageData.referenceData.resourceRequirements?.length || 0
        } : 'none'
      });
    } catch (error) {
      console.error('[ModelProcessor] Error processing model:', error);
      messageData.error = 'Error processing model data';
    }
    
    return messageData;
  }
}
