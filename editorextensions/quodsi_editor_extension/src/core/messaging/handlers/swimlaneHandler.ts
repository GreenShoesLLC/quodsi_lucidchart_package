import {
  EnvelopeBase,
  EnvelopeMessageType,
  SwimLaneQuodsiData,
  generateUniqueName,
  generateUUID,
} from '@quodsi/lucid-shared';
import { router } from '../index';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { getLogger } from '@quodsi/lucid-shared';

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
  private static logger = getLogger('SwimLaneHandler');

  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SWIMLANE_UPDATE:
        SwimLaneHandler.handleUpdate(msg)
          .catch(err => SwimLaneHandler.logger.error('Error in SWIMLANE_UPDATE:', err));
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
   * Handle SWIMLANE_UPDATE: save q_swimlane data (e.g., assignment mode
   * changes, lane unconverts).
   *
   * Unlinking a lane does NOT delete a resource. Under storage format 2 the
   * record lives in the page's q_resources and outlives every claimant, so a
   * lane that lets go of one simply leaves it unclaimed -- cascading a delete
   * from here would destroy model-level data the user never asked to remove.
   */
  private static async handleUpdate(msg: EnvelopeBase): Promise<void> {
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

      // Write new data
      block.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(data.swimlaneData));

      // Invalidate model cache so the next rebuild re-reads the lane claims
      const modelManager = ModelManager.getInstance();
      modelManager.invalidateModelCache();

      SwimLaneHandler.logger.debug('Saved swimlane data', {
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

      const modelManager = ModelManager.getInstance();
      const storageAdapter = modelManager.getStorageAdapter();

      // Format 2: the resource is a MODEL-LEVEL record on the page and the
      // lane keeps only a pointer at it. The name is de-duplicated against the
      // records already there, exactly as block conversion does.
      const resourceId = generateUUID();
      const existingResources = storageAdapter.getResources(currentPage);
      const takenNames = new Set(existingResources.map(r => r.name));
      const resourceName = generateUniqueName(data.resourceName, (n) => takenNames.has(n));

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

      // Persist the record, then point the lane at it.
      storageAdapter.setResources(currentPage, [
        ...existingResources,
        { id: resourceId, name: resourceName, capacity: 1, description: '' },
      ]);

      // The lane's TITLE is what the user typed; only the record's name is
      // de-duplicated.
      const laneId = generateUUID();
      swimlaneData.lanes[data.laneIndex] = {
        laneId,
        titleSnapshot: data.resourceName,
        assignmentMode: 'runtime-derive',
        resourceId,
      };
      swimlaneData.lastSyncedAt = new Date().toISOString();

      // Persist q_swimlane
      block.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(swimlaneData));

      // Invalidate model cache so the next rebuild picks up the new resource
      modelManager.invalidateModelCache();

      SwimLaneHandler.logger.debug('Created Resource for lane', {
        resourceId,
        resourceName,
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
