import {
  EditorClient,
  ItemProxy,
  PageProxy
} from 'lucid-extension-sdk';
import { SelectionType, SimulationObjectType } from '@quodsi/lucid-shared';
import { BaseSelectionProcessor } from './BaseSelectionProcessor';
import { ModelManager } from '../../../../../core/ModelManager';
import { SelectionStateData } from '../types';
import { referenceDataBuilder } from '../utils/referenceDataBuilder';

/**
 * Processor for swimlane block selection.
 * Reads lane structure from Lucid SDK and q_swimlane data from shapeData.
 */
export class SwimLaneProcessor extends BaseSelectionProcessor {
  async process(
    client: EditorClient,
    currentPage: PageProxy,
    items: ItemProxy[],
    selectionType: SelectionType,
    modelManager: ModelManager
  ): Promise<Partial<SelectionStateData>> {
    console.log('[SwimLaneProcessor] Processing swimlane selection');

    const documentId = this.getDocumentId(client);
    const isQuodsiModel = modelManager.isQuodsiModel(currentPage);

    const messageData = this.createBaseMessageData(
      items,
      currentPage,
      selectionType,
      documentId,
      isQuodsiModel
    );

    if (!isQuodsiModel || items.length !== 1) {
      return messageData;
    }

    const item = items[0] as any; // SwimLaneBlockProxy
    try {
      // Read existing q_swimlane data
      const swimlaneDataStr = item.shapeData.get('q_swimlane');
      const swimlaneData = swimlaneDataStr ? JSON.parse(swimlaneDataStr) : null;

      // Read lane structure from SDK
      const lanes = item.getPrimaryLanes();
      const isVertical = item.getPrimaryLanesVertical();
      const bb = item.getBoundingBox();

      const laneInfos = lanes.map((lane: any, index: number) => ({
        index,
        title: lane.getTitle() || '',
        size: lane.getSize(),
        boundingBox: lane.getBoundingBox(),
      }));

      // Build modelItemData with swimlane-specific structure
      messageData.modelItemData = {
        id: item.id,
        name: item.getClassName() || 'SwimLane',
        data: {
          blockId: item.id,
          className: item.getClassName(),
          isVertical,
          isMagnetized: item.getMagnetized(),
          boundingBox: { x: bb.x, y: bb.y, w: bb.w, h: bb.h },
          lanes: laneInfos,
          swimlaneData, // null if not yet configured
        },
        metadata: {
          type: SimulationObjectType.None,
          id: item.id,
        },
      };

      messageData.diagramElementType = this.getDiagramElementType(item);

      // Include reference data so the editor can show existing resources
      messageData.referenceData = await referenceDataBuilder.buildAllReferenceData(
        modelManager
      );

      console.log('[SwimLaneProcessor] Processed swimlane data:', {
        id: item.id,
        laneCount: laneInfos.length,
        hasExistingData: !!swimlaneData,
      });
    } catch (error) {
      console.error('[SwimLaneProcessor] Error processing swimlane:', error);
      messageData.error = 'Error processing swimlane data';
    }

    return messageData;
  }
}
