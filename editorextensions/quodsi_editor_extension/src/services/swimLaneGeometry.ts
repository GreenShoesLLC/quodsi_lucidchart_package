/**
 * Shared geometry utilities for swimlane lane containment checks.
 * Used by SwimLaneResourceInjector, DevtoolsHandler, and ActivityProcessor.
 */

export interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Returns true if the center of `blockBB` falls within `laneBB`.
 */
export function isCenterInBox(blockBB: BoundingBox, laneBB: BoundingBox): boolean {
  const cx = blockBB.x + blockBB.w / 2;
  const cy = blockBB.y + blockBB.h / 2;
  return cx >= laneBB.x && cx <= laneBB.x + laneBB.w
      && cy >= laneBB.y && cy <= laneBB.y + laneBB.h;
}
