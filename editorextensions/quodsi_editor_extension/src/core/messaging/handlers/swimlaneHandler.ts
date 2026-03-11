import {
  EnvelopeBase,
  EnvelopeMessageType,
  SwimLaneQuodsiData,
  generateUUID,
} from '@quodsi/shared';
import { router } from '../index';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { ExtensionDebugService } from '../../logging/ExtensionDebugService';

const SWIMLANE_DATA_KEY = 'q_swimlane';

/**
 * Handler for swimlane lane-resource mapping operations.
 *
 * Resource creation is handled extension-side (not in React) because:
 * - Lanes are not BlockProxy instances, so ResourceLucid.createFromConversion() can't be used
 * - The extension has authoritative access to ModelDefinition via ModelManager
 * - This follows the pattern where the extension owns all model mutations
 */
export class SwimLaneHandler {
  private static logger = ExtensionDebugService.forComponent('SwimLaneHandler');

  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SWIMLANE_UPDATE:
        SwimLaneHandler.handleUpdate(msg);
        return true;
      case EnvelopeMessageType.SWIMLANE_CONVERT_LANE:
        SwimLaneHandler.handleConvertLane(msg)
          .catch(err => SwimLaneHandler.logger.error('Error in SWIMLANE_CONVERT_LANE:', err));
        return true;
      case EnvelopeMessageType.SWIMLANE_UPDATE_RESULT:
      case EnvelopeMessageType.SWIMLANE_CONVERT_LANE_RESULT:
        return true; // Sent by extension, not received
      default:
        return false;
    }
  }

  /**
   * Handle SWIMLANE_UPDATE: save q_swimlane data (e.g., assignment mode changes)
   */
  private static handleUpdate(msg: EnvelopeBase): void {
    try {
      const data = msg.data as {
        swimlaneBlockId: string;
        swimlaneData: SwimLaneQuodsiData;
      };

      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();

      if (!currentPage) {
        SwimLaneHandler.sendUpdateResult(msg.id, false, 'No current page');
        return;
      }

      const block = currentPage.allBlocks.get(data.swimlaneBlockId);
      if (!block) {
        SwimLaneHandler.sendUpdateResult(msg.id, false, 'Swimlane block not found');
        return;
      }

      block.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(data.swimlaneData));

      SwimLaneHandler.logger.log('Saved swimlane data', {
        blockId: data.swimlaneBlockId,
        laneCount: data.swimlaneData.lanes.length,
        mappedLanes: data.swimlaneData.lanes.filter(l => l !== null).length,
      });

      SwimLaneHandler.sendUpdateResult(msg.id, true);
    } catch (error) {
      SwimLaneHandler.logger.error('Error updating swimlane:', error);
      SwimLaneHandler.sendUpdateResult(msg.id, false, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Handle SWIMLANE_CONVERT_LANE: create a Resource for a lane.
   */
  private static async handleConvertLane(msg: EnvelopeBase): Promise<void> {
    try {
      const data = msg.data as {
        swimlaneBlockId: string;
        laneIndex: number;
        resourceName: string;
      };

      const client = ModelManager.getClient();
      const viewport = new Viewport(client);
      const currentPage = viewport.getCurrentPage();

      if (!currentPage) {
        SwimLaneHandler.sendConvertResult(msg.id, data.swimlaneBlockId, data.laneIndex, false, 'No current page');
        return;
      }

      const block = currentPage.allBlocks.get(data.swimlaneBlockId);
      if (!block) {
        SwimLaneHandler.sendConvertResult(msg.id, data.swimlaneBlockId, data.laneIndex, false, 'Swimlane block not found');
        return;
      }

      // Generate resource identity — the full Resource object will be created
      // during the next model rebuild via loadSwimLaneResources()
      const resourceId = generateUUID();

      // Read existing q_swimlane data or create new
      const existingStr = block.shapeData.get(SWIMLANE_DATA_KEY) as string | undefined;
      let swimlaneData: SwimLaneQuodsiData;
      if (existingStr) {
        swimlaneData = JSON.parse(existingStr);
      } else {
        const swimlaneProxy = block as any;
        const laneCount = swimlaneProxy.getPrimaryLanes().length;
        swimlaneData = {
          lanes: new Array(laneCount).fill(null),
          lastSyncedAt: new Date().toISOString(),
        };
      }

      // Ensure lanes array is large enough
      while (swimlaneData.lanes.length <= data.laneIndex) {
        swimlaneData.lanes.push(null);
      }

      // Create the lane mapping with inline Resource data
      const laneId = generateUUID();
      swimlaneData.lanes[data.laneIndex] = {
        laneId,
        titleSnapshot: data.resourceName,
        assignmentMode: 'runtime-derive',
        resource: {
          id: resourceId,
          name: data.resourceName,
          capacity: 1,
          description: '',
        },
      };
      swimlaneData.lastSyncedAt = new Date().toISOString();

      // Persist q_swimlane
      block.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(swimlaneData));

      // Invalidate model cache so loadSwimLaneResources picks up the new resource
      const modelManager = ModelManager.getInstance();
      modelManager.invalidateModelCache();

      SwimLaneHandler.logger.log('Created Resource for lane', {
        resourceId,
        resourceName: data.resourceName,
        laneIndex: data.laneIndex,
      });

      // Send success result with updated swimlaneData so React can update its state
      SwimLaneHandler.sendConvertResult(
        msg.id, data.swimlaneBlockId, data.laneIndex, true,
        undefined, swimlaneData
      );
    } catch (error) {
      SwimLaneHandler.logger.error('Error converting lane:', error);
      const data = msg.data as { swimlaneBlockId: string; laneIndex: number };
      SwimLaneHandler.sendConvertResult(
        msg.id, data?.swimlaneBlockId || '', data?.laneIndex || 0, false,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private static sendUpdateResult(correlationId: string, success: boolean, error?: string): void {
    router.send('model', {
      id: correlationId,
      type: EnvelopeMessageType.SWIMLANE_UPDATE_RESULT,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: { success, error },
    });
  }

  private static sendConvertResult(
    correlationId: string,
    swimlaneBlockId: string,
    laneIndex: number,
    success: boolean,
    error?: string,
    swimlaneData?: SwimLaneQuodsiData
  ): void {
    router.send('model', {
      id: correlationId,
      type: EnvelopeMessageType.SWIMLANE_CONVERT_LANE_RESULT,
      source: 'host',
      target: 'model-iframe',
      version: '1.0',
      data: { success, swimlaneBlockId, laneIndex, swimlaneData, error },
    });
  }
}
