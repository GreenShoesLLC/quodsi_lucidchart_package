import { PageProxy } from 'lucid-extension-sdk';
import { SwimLaneQuodsiData, ISerializedModel, ActionType, createSeizeAction, createReleaseAction } from '@quodsi/lucid-shared';
import type { ISerializedSeizeAction, ISerializedReleaseAction } from '@quodsi/lucid-shared';
import { getLogger } from '@quodsi/lucid-shared';
import { isCenterInBox } from './swimLaneGeometry';

const SWIMLANE_DATA_KEY = 'q_swimlane';

/**
 * Injects Seize/Release action brackets for swimlane lanes
 * with assignmentMode === 'runtime-derive'.
 *
 * For each Activity whose bounding-box center falls within a runtime-derive lane:
 * - Prepends a SeizeAction as the first action
 * - Appends a ReleaseAction as the last action
 *
 * Operates on the serialized model (ISerializedModel) — does NOT mutate
 * the in-memory ModelDefinition or shapeData.
 */
export class SwimLaneResourceInjector {
  private static logger = getLogger('SwimLaneResourceInjector');

  /**
   * Scan the page for swimlane mappings and inject Seize/Release actions
   * into the serialized model for any lane with runtime-derive mode.
   *
   * @param serializedModel The serialized model object (will be mutated)
   * @param page The current LucidChart page
   * @returns The mutated serializedModel (same reference)
   */
  static inject(serializedModel: ISerializedModel, page: PageProxy): ISerializedModel {
    const allBlocks = page.allBlocks;
    let injectedCount = 0;

    for (const [, block] of allBlocks) {
      if (block.getClassName() !== 'AdvancedSwimLaneBlock') continue;

      const dataStr = block.shapeData.get(SWIMLANE_DATA_KEY);
      if (!dataStr) continue;

      let swimlaneData: SwimLaneQuodsiData;
      try {
        swimlaneData = JSON.parse(dataStr as string);
      } catch {
        continue;
      }

      // Get lane bounding boxes from SDK
      const swimlaneProxy = block as any;
      let lanes: any[];
      try {
        lanes = swimlaneProxy.getPrimaryLanes();
      } catch {
        continue;
      }

      for (let i = 0; i < swimlaneData.lanes.length; i++) {
        const mapping = swimlaneData.lanes[i];
        if (!mapping || mapping.assignmentMode !== 'runtime-derive') continue;
        if (i >= lanes.length) continue; // Lane index out of range

        // A mapped-but-UNLINKED lane (no resourceId) has nothing to seize.
        // The auto-requirement the builder derives for a resource carries the
        // resource's own id, so the lane's pointer doubles as the requirement id.
        const reqId = mapping.resourceId;
        if (!reqId) continue;

        // ...and the pointer may be DANGLING. Deleting a resource from the
        // Resources tab does not rewrite q_swimlane (the builder reports the
        // leftover pointer as `resource_link_dangling`), so a lane can name a
        // resource that no longer exists. No resource means
        // reconcileAutoRequirements derived no auto-requirement under that id,
        // and a Seize naming an unresolvable requirement id must never reach
        // the engine.
        if (!serializedModel.resourceRequirements?.some((r) => String(r.id) === reqId)) continue;

        const laneBB = lanes[i].getBoundingBox();

        // Find activity blocks whose center falls within this lane
        for (const [, candidateBlock] of allBlocks) {
          if (candidateBlock.getClassName() === 'AdvancedSwimLaneBlock') continue;

          const candidateBB = candidateBlock.getBoundingBox();
          if (!isCenterInBox(
            { x: candidateBB.x, y: candidateBB.y, w: candidateBB.w, h: candidateBB.h },
            { x: laneBB.x, y: laneBB.y, w: laneBB.w, h: laneBB.h }
          )) continue;

          // Check if this block is an Activity in the serialized model
          const activity = serializedModel.activities.find(
            (a) => a.id === candidateBlock.id
          );
          if (!activity) continue;

          // Skip if activity already has a SeizeAction for this resource requirement
          // (user set it up explicitly — don't double-seize)
          if (!activity.actions) activity.actions = [];
          const alreadyHasSeize = activity.actions.some(
            (action) => action.type === ActionType.SEIZE && (action as ISerializedSeizeAction).resourceRequirementId === reqId
          );
          if (alreadyHasSeize) {
            SwimLaneResourceInjector.logger.debug(
              `Activity ${activity.id} already has SeizeAction for ${reqId}, skipping`
            );
            continue;
          }

          // Prepend SeizeAction as first action
          const seizeAction: ISerializedSeizeAction = createSeizeAction(reqId);
          activity.actions.unshift(seizeAction);

          // Append ReleaseAction as last action
          const releaseAction: ISerializedReleaseAction = createReleaseAction(reqId);
          activity.actions.push(releaseAction);

          injectedCount++;
          SwimLaneResourceInjector.logger.debug(
            `Injected Seize/Release for activity ${activity.id} → resource ${reqId}`
          );
        }
      }
    }

    if (injectedCount > 0) {
      SwimLaneResourceInjector.logger.debug(
        `Injected Seize/Release brackets on ${injectedCount} activities`
      );
    }

    return serializedModel;
  }
}
