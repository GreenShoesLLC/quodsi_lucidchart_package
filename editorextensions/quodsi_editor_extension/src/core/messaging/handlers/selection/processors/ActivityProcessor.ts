import {
  EditorClient,
  ItemProxy,
  ElementProxy,
  PageProxy
} from 'lucid-extension-sdk';
import { SelectionType, SwimLaneQuodsiData, ValidationResult } from '@quodsi/lucid-shared';
import { BaseSelectionProcessor } from './BaseSelectionProcessor';
import { ModelManager } from '../../../../../core/ModelManager';
import { SelectionStateData } from '../types';
import { itemDataBuilder } from '../utils/itemDataBuilder';
import { referenceDataBuilder } from '../utils/referenceDataBuilder';
import { isCenterInBox } from '../../../../../services/swimLaneGeometry';

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

        // Check if this activity is contained in a swimlane lane
        if (messageData.referenceData) {
          this.detectSwimLaneContainment(item, currentPage, messageData);
        }

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
      console.error('[ActivityProcessor] No type info found for activity');
      messageData.error = 'No type info found for activity';
    }
    
    return messageData;
  }

  /**
   * Check if the selected activity's center falls within a mapped swimlane lane
   * and populate swimLaneContainment on referenceData if so.
   */
  private detectSwimLaneContainment(
    item: ItemProxy,
    currentPage: PageProxy,
    messageData: Partial<SelectionStateData>
  ): void {
    const SWIMLANE_DATA_KEY = 'q_swimlane';

    try {
      const itemBB = (item as any).getBoundingBox();

      for (const [blockId, block] of currentPage.allBlocks) {
        if (block.getClassName() !== 'AdvancedSwimLaneBlock') continue;

        const dataStr = block.shapeData.get(SWIMLANE_DATA_KEY);
        if (!dataStr) continue;

        let swimlaneData: SwimLaneQuodsiData;
        try {
          swimlaneData = JSON.parse(dataStr as string);
        } catch {
          continue;
        }

        let lanes: any[];
        try {
          lanes = (block as any).getPrimaryLanes();
        } catch {
          continue;
        }

        for (let i = 0; i < swimlaneData.lanes.length; i++) {
          const mapping = swimlaneData.lanes[i];
          if (!mapping || i >= lanes.length) continue;

          const laneBB = lanes[i].getBoundingBox();
          if (isCenterInBox(
            { x: itemBB.x, y: itemBB.y, w: itemBB.w, h: itemBB.h },
            { x: laneBB.x, y: laneBB.y, w: laneBB.w, h: laneBB.h }
          )) {
            messageData.referenceData!.swimLaneContainment = {
              swimlaneBlockId: blockId,
              laneIndex: i,
              laneName: mapping.titleSnapshot,
              resourceId: mapping.resource.id,
              resourceName: mapping.resource.name,
              assignmentMode: mapping.assignmentMode,
            };
            return; // Found the containing lane, stop searching
          }
        }
      }
    } catch (error) {
      console.error('[ActivityProcessor] Error detecting swimlane containment:', error);
    }
  }
}
