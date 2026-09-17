import {
  EnvelopeBase,
  EnvelopeMessageType,
  SwimLaneQuodsiData,
} from '@quodsi/lucid-shared';
import { Viewport } from 'lucid-extension-sdk';
import { ModelManager } from '../../ModelManager';
import { getLogger } from '@quodsi/lucid-shared';

const SWIMLANE_DATA_KEY = 'q_swimlane';

/**
 * Handler for swimlane lane-resource mapping operations.
 *
 * ONE message reaches here now: SWIMLANE_UPDATE, which persists the
 * q_swimlane blob the panel composed. There is no longer a lane-side
 * resource-CREATION route -- the lane-convert message and its result were
 * retired wholesale (Plan 2b, Task 9). Under storage format 2 a lane is a
 * POINTER at a model-level record in the page's q_resources, and the panel
 * mints that record through the shared ResourceLinkPicker (create ->
 * confirmed model-root write -> link) exactly as a Resource BLOCK does.
 * Reinstating an extension-side creation path would give lanes a second,
 * divergent way to make a resource.
 */
export class SwimLaneHandler {
  private static logger = getLogger('SwimLaneHandler');

  public static handleMessage(msg: EnvelopeBase): boolean {
    switch (msg.type) {
      case EnvelopeMessageType.SWIMLANE_UPDATE:
        SwimLaneHandler.handleUpdate(msg)
          .catch(err => SwimLaneHandler.logger.error('Error in SWIMLANE_UPDATE:', err));
        return true;
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
   *
   * No reply is sent: SwimLaneEditor's SWIMLANE_UPDATE is fire-and-forget,
   * so a failure here is only logged.
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
        SwimLaneHandler.logger.error('SWIMLANE_UPDATE: no current page');
        return;
      }

      const block = currentPage.allBlocks.get(data.swimlaneBlockId);
      if (!block) {
        SwimLaneHandler.logger.error('SWIMLANE_UPDATE: swimlane block not found', { blockId: data.swimlaneBlockId });
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
    } catch (error) {
      SwimLaneHandler.logger.error('Error updating swimlane:', error);
    }
  }
}
