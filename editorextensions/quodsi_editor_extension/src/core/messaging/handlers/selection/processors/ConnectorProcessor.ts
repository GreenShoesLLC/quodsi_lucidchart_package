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
 * Processor for connector selection
 */
export class ConnectorProcessor extends BaseSelectionProcessor {
  /**
   * Process a connector selection
   * @param client The editor client
   * @param currentPage The current page
   * @param items The selected items (should be single connector)
   * @param selectionType The selection type (should be CONNECTOR)
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
    console.log('[ConnectorProcessor] Processing connector selection');
    
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
      console.log('[ConnectorProcessor] Not a Quodsi model or multiple items selected');
      return messageData;
    }
    
    // Ensure ModelManager knows about the current page for model definition building
    console.log('[ConnectorProcessor] Setting current page on ModelManager:', {
      pageId: currentPage.id,
      pageTitle: currentPage.getTitle(),
      hasSetCurrentPageMethod: typeof modelManager.setCurrentPage === 'function'
    });
    
    if (modelManager.setCurrentPage) {
      modelManager.setCurrentPage(currentPage);
    } else {
      console.error('[ConnectorProcessor] ModelManager does not have setCurrentPage method');
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
        
        console.log('[ConnectorProcessor] Processed connector data:', {
          id: item.id,
          hasModelData: messageData.modelItemData ? 'yes' : 'no',
          hasRefData: messageData.referenceData ? 'yes' : 'no',
          diagramElementType: messageData.diagramElementType,
          refDataSummary: {
            activities: messageData.referenceData?.activities?.length || 0,
            resources: messageData.referenceData?.resources?.length || 0,
            entities: messageData.referenceData?.entities?.length || 0,
            hasMarker: !!(messageData.referenceData as any)?._debugMarker
          }
        });
        
        // Test JSON serialization of the entire message data to see if it survives
        try {
          const serialized = JSON.stringify(messageData);
          const deserialized = JSON.parse(serialized);
          console.log('[ConnectorProcessor] CHECKPOINT_3: Message serialization test', {
            originalSize: serialized.length,
            deserializedHasRefData: !!deserialized.referenceData,
            deserializedActivitiesLength: deserialized.referenceData?.activities?.length,
            hasMarkerAfterSerialization: !!deserialized.referenceData?._debugMarker
          });
        } catch (serError) {
          console.error('[ConnectorProcessor] CHECKPOINT_3: Message serialization failed:', serError);
        }
      } catch (error) {
        console.error('[ConnectorProcessor] Error processing connector:', error);
        messageData.error = 'Error processing connector data';
      }
    } else {
      console.error('[ConnectorProcessor] No type info found for connector');
      messageData.error = 'No type info found for connector';
    }
    
    return messageData;
  }
}
