import { EnvelopeBase, EnvelopeMessageType, SwimLaneScanResult, SwimLaneScanItem, SwimLaneScanLane, SwimLaneScanLaneBlock } from '@quodsi/shared';
import { router } from '../index';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { StorageAdapter } from '../../StorageAdapter';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';

const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function isBlockInLane(blockBB: { x: number; y: number; w: number; h: number }, laneBB: { x: number; y: number; w: number; h: number }): boolean {
  const centerX = blockBB.x + blockBB.w / 2;
  const centerY = blockBB.y + blockBB.h / 2;
  return centerX >= laneBB.x && centerX <= laneBB.x + laneBB.w
      && centerY >= laneBB.y && centerY <= laneBB.y + laneBB.h;
}

/**
 * Handler for DevTools diagnostic operations
 */
export class DevtoolsHandler {
  private static logger = ExtensionDebugService.forComponent('DevtoolsHandler');

  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.DEVTOOLS_SWIMLANE_SCAN_REQUEST:
        DevtoolsHandler.handleSwimlaneScanRequest(msg);
        return true;
      default:
        return false;
    }
  }

  private static handleSwimlaneScanRequest(msg: EnvelopeBase): void {
    try {
      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();

      if (!currentPage) {
        DevtoolsHandler.sendResult(msg.id, { swimlanes: [], nonSwimLaneBlocks: [], totalBlockCount: 0 });
        return;
      }

      const storageAdapter = new StorageAdapter();
      const allBlocks = currentPage.allBlocks;
      const swimlaneBlocks: any[] = [];
      const nonSwimLaneBlockProxies: any[] = [];

      // Separate swimlanes from other blocks
      for (const [, block] of allBlocks) {
        // Check if this is a swimlane by class name
        const className = block.getClassName();
        if (className === 'AdvancedSwimLaneBlock') {
          swimlaneBlocks.push(block);
        } else {
          nonSwimLaneBlockProxies.push(block);
        }
      }

      const swimlanes: SwimLaneScanItem[] = [];

      for (const swimlane of swimlaneBlocks) {
        const bb = swimlane.getBoundingBox();
        const boundingBox = { x: bb.x, y: bb.y, w: bb.w, h: bb.h };

        // Get orientation and magnetization
        let isVertical = false;
        let isMagnetized = false;
        try {
          isVertical = swimlane.getPrimaryLanesVertical();
        } catch (e) {
          DevtoolsHandler.logger.log('Could not get lane orientation', e);
        }
        try {
          isMagnetized = swimlane.getMagnetized();
        } catch (e) {
          DevtoolsHandler.logger.log('Could not get magnetized state', e);
        }

        // Get lanes
        const lanes: SwimLaneScanLane[] = [];
        try {
          const primaryLanes = swimlane.getPrimaryLanes();
          let offset = 0;

          for (let i = 0; i < primaryLanes.length; i++) {
            const lane = primaryLanes[i];
            const laneTitle = lane.getTitle() || '';
            const laneSize = lane.getSize();

            // Compute lane bounding box based on orientation
            let laneBB: { x: number; y: number; w: number; h: number };
            if (isVertical) {
              laneBB = { x: bb.x + offset, y: bb.y, w: laneSize, h: bb.h };
            } else {
              laneBB = { x: bb.x, y: bb.y + offset, w: bb.w, h: laneSize };
            }

            // Find blocks contained in this lane
            const containedBlocks: SwimLaneScanLaneBlock[] = [];
            for (const block of nonSwimLaneBlockProxies) {
              const blockBB = block.getBoundingBox();
              const blockBox = { x: blockBB.x, y: blockBB.y, w: blockBB.w, h: blockBB.h };
              if (isBlockInLane(blockBox, laneBB)) {
                containedBlocks.push(DevtoolsHandler.buildBlockInfo(block, storageAdapter));
              }
            }

            lanes.push({
              index: i,
              title: laneTitle,
              size: laneSize,
              boundingBox: laneBB,
              containedBlocks,
            });

            offset += laneSize;
          }
        } catch (e) {
          DevtoolsHandler.logger.log('Could not get primary lanes', e);
        }

        // Collect all block IDs that are contained in lanes
        const containedBlockIds = new Set<string>();
        for (const lane of lanes) {
          for (const block of lane.containedBlocks) {
            containedBlockIds.add(block.id);
          }
        }

        swimlanes.push({
          blockId: swimlane.id,
          className: swimlane.getClassName(),
          boundingBox,
          isVertical,
          isMagnetized,
          lanes,
        });
      }

      // Collect IDs of blocks contained in any lane
      const allContainedIds = new Set<string>();
      for (const sl of swimlanes) {
        for (const lane of sl.lanes) {
          for (const block of lane.containedBlocks) {
            allContainedIds.add(block.id);
          }
        }
      }

      // Non-swimlane blocks that aren't contained in any lane
      const nonSwimLaneBlocks: SwimLaneScanLaneBlock[] = [];
      for (const block of nonSwimLaneBlockProxies) {
        if (!allContainedIds.has(block.id)) {
          nonSwimLaneBlocks.push(DevtoolsHandler.buildBlockInfo(block, storageAdapter));
        }
      }

      const result: SwimLaneScanResult = {
        swimlanes,
        nonSwimLaneBlocks,
        totalBlockCount: allBlocks.size,
      };

      DevtoolsHandler.logger.log('Swimlane scan complete', {
        swimlaneCount: swimlanes.length,
        nonSwimLaneBlockCount: nonSwimLaneBlocks.length,
        totalBlockCount: result.totalBlockCount,
      });

      DevtoolsHandler.sendResult(msg.id, result);
    } catch (error) {
      DevtoolsHandler.logger.error('Error scanning swimlanes:', error);
      DevtoolsHandler.sendResult(msg.id, { swimlanes: [], nonSwimLaneBlocks: [], totalBlockCount: 0 });
    }
  }

  private static buildBlockInfo(block: any, storageAdapter: StorageAdapter): SwimLaneScanLaneBlock {
    // Get block text from textAreas
    let text = '';
    try {
      const textAreas = block.textAreas;
      if (textAreas) {
        for (const [, value] of textAreas) {
          if (value) {
            text = String(value);
            break;
          }
        }
      }
    } catch (e) {
      // Ignore text retrieval errors
    }

    // Check for quodsi data
    let hasQuodsiData = false;
    let quodsiType: string | null = null;
    try {
      const typeInfo = storageAdapter.getElementType(block);
      if (typeInfo) {
        hasQuodsiData = true;
        quodsiType = typeInfo.type;
      }
    } catch (e) {
      // Ignore
    }

    return {
      id: block.id,
      className: block.getClassName(),
      text,
      hasQuodsiData,
      quodsiType,
    };
  }

  private static sendResult(correlationId: string, result: SwimLaneScanResult): void {
    router.send('model', {
      id: correlationId,
      type: EnvelopeMessageType.DEVTOOLS_SWIMLANE_SCAN_RESULT,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: result,
    });
  }
}
