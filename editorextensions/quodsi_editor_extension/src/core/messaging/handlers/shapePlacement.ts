// editorextensions/quodsi_editor_extension/src/core/messaging/handlers/shapePlacement.ts
//
// Pure placement helpers for ShapeOpsHandler's SHAPE_CREATE. No SDK types are
// imported here on purpose -- everything is expressed over plain boxes
// (`{x, y, w, h}`, exactly what `getBoundingBox()` returns) and duck-typed
// "block-like" / "page-like" shapes so this stays unit-testable without the
// Lucid SDK mock, and so ShapeOpsHandler can hand it either a real
// BlockProxy/PageProxy or a fake one in tests.

/** A bounding box, in the same shape `BlockProxy.getBoundingBox()` returns. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Which side of a reference block a new shape should be placed on. */
export type ShapeSide = 'right' | 'below' | 'left' | 'above';

/** The minimum a placement function needs from a block: an id and a box. */
export interface PlacementBlockLike {
  id: string;
  getBoundingBox(): Box;
}

/**
 * The minimum a placement function needs from a page: its blocks, keyed by
 * id. A real PageProxy.allBlocks is a MapProxy; tests can pass a plain Map.
 */
export interface PlacementPageLike {
  allBlocks: {
    values(): Iterable<PlacementBlockLike>;
    get?(id: string): PlacementBlockLike | undefined;
  };
}

/**
 * What placeAtFlowEnd needs from the model manager: the current
 * ModelDefinition's activity/generator LIST MANAGERS (`.getAll()`), used to
 * classify which blocks on the page are part of the process flow.
 *
 * Fix round 1 / I1: this is deliberately `getModelDefinition()`, not
 * `getModel()`. `ModelManager.getModel()` returns the Model ROOT record
 * (name, runTime, seed, ...) -- it has no `activities`/`generators` at all,
 * so calling placeAtFlowEnd against the real ModelManager always found an
 * empty flow set and silently fell back to {x:0,y:0}. `getModelDefinition()`
 * returns the ModelDefinition, whose `activities`/`generators` are list
 * managers (see ModelManager.registerElement/removeElement using
 * `modelDef.activities.add/remove`, and e.g. ModelManager.ts:1686
 * `newModel.activities.getAll()`), which is what actually holds the ids.
 */
export interface PlacementModelManagerLike {
  getModelDefinition(): Promise<{
    activities: { getAll(): Array<{ id: string }> };
    generators: { getAll(): Array<{ id: string }> };
  } | null>;
}

/**
 * Default size for a newly created shape, in the absence of any other size
 * to copy. Matches the fallback box `placeAtFlowEnd` returns when there is
 * nothing on the page to place relative to.
 */
export const DEFAULT_SHAPE_SIZE = { w: 80, h: 80 };

function boxesOverlap(a: Box, b: Box): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

function anyOverlap(page: PlacementPageLike, box: Box): boolean {
  for (const block of page.allBlocks.values()) {
    if (boxesOverlap(box, block.getBoundingBox())) {
      return true;
    }
  }
  return false;
}

/**
 * Places a new shape relative to `anchor`, on the given `side`. The offset
 * from the anchor is `round(1.75 * anchor.w)` on every side (not just
 * right/left) -- this is a deliberately simple, single-formula heuristic,
 * not a tight geometric fit. If the resulting box overlaps any existing
 * block on the page (including, for below/above, possibly the anchor
 * itself, since the offset is width- not height-derived), it is nudged down
 * by `anchor.h` repeatedly until clear.
 */
export function placeNear(
  page: PlacementPageLike,
  anchor: PlacementBlockLike,
  side: ShapeSide
): Box {
  const anchorBox = anchor.getBoundingBox();
  const offset = Math.round(1.75 * anchorBox.w);

  let box: Box;
  switch (side) {
    case 'right':
      box = { x: anchorBox.x + anchorBox.w + offset, y: anchorBox.y, ...DEFAULT_SHAPE_SIZE };
      break;
    case 'left':
      box = { x: anchorBox.x - offset - DEFAULT_SHAPE_SIZE.w, y: anchorBox.y, ...DEFAULT_SHAPE_SIZE };
      break;
    case 'below':
      box = { x: anchorBox.x, y: anchorBox.y + anchorBox.h + offset, ...DEFAULT_SHAPE_SIZE };
      break;
    case 'above':
      box = { x: anchorBox.x, y: anchorBox.y - offset - DEFAULT_SHAPE_SIZE.h, ...DEFAULT_SHAPE_SIZE };
      break;
  }

  while (anyOverlap(page, box)) {
    box = { ...box, y: box.y + anchorBox.h };
  }

  return box;
}

/**
 * Places a new shape at the end of the process flow: to the right of the
 * rightmost block the model manager currently classifies as an Activity or
 * a Generator, on the first generator's row (so a chain of
 * Generator -> Activity -> Activity... reads left to right). Blocks are
 * classified by id membership in `modelManager.getModelDefinition()`'s
 * activities / generators list managers, not by shape class, since a page
 * can hold blocks the model doesn't track.
 *
 * Falls back to `{x:0, y:0, w:80, h:80}` when there is no model yet, or no
 * block on the page is currently part of the flow.
 */
export async function placeAtFlowEnd(
  page: PlacementPageLike,
  modelManager: PlacementModelManagerLike
): Promise<Box> {
  const fallback: Box = { x: 0, y: 0, ...DEFAULT_SHAPE_SIZE };

  const modelDef = await modelManager.getModelDefinition();
  if (!modelDef) {
    return fallback;
  }

  const activityIds = modelDef.activities.getAll().map(a => a.id);
  const generatorIds = modelDef.generators.getAll().map(g => g.id);
  const flowIds = new Set<string>([...activityIds, ...generatorIds]);

  if (flowIds.size === 0) {
    return fallback;
  }

  const flowBlocks: PlacementBlockLike[] = [];
  for (const block of page.allBlocks.values()) {
    if (flowIds.has(block.id)) {
      flowBlocks.push(block);
    }
  }

  if (flowBlocks.length === 0) {
    return fallback;
  }

  let rightmost = flowBlocks[0];
  let rightmostBox = rightmost.getBoundingBox();
  for (const block of flowBlocks.slice(1)) {
    const box = block.getBoundingBox();
    if (box.x + box.w > rightmostBox.x + rightmostBox.w) {
      rightmost = block;
      rightmostBox = box;
    }
  }

  const offset = Math.round(1.75 * rightmostBox.w);

  // Row = the first generator's y, so a fresh Activity lines up with the
  // generator that feeds the flow. If the model has no generator (or its
  // block isn't on the page), fall back to the rightmost block's own row.
  let y = rightmostBox.y;
  const firstGeneratorId = generatorIds[0];
  if (firstGeneratorId) {
    for (const block of page.allBlocks.values()) {
      if (block.id === firstGeneratorId) {
        y = block.getBoundingBox().y;
        break;
      }
    }
  }

  return {
    x: rightmostBox.x + rightmostBox.w + offset,
    y,
    ...DEFAULT_SHAPE_SIZE,
  };
}
