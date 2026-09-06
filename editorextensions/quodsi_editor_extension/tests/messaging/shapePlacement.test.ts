// editorextensions/quodsi_editor_extension/tests/messaging/shapePlacement.test.ts
//
// Pure tests over fake boxes -- no SDK, no ModelManager. `placeNear` and
// `placeAtFlowEnd` are exercised directly against plain objects shaped like
// `{ id, getBoundingBox() }` for blocks and `{ allBlocks: Map }` for pages,
// matching what ShapeOpsHandler will hand them from a real BlockProxy /
// PageProxy at runtime.

import { placeNear, placeAtFlowEnd, Box } from '../../src/core/messaging/handlers/shapePlacement';

function block(id: string, box: Box) {
  return { id, getBoundingBox: () => box };
}

function page(...blocks: ReturnType<typeof block>[]) {
  const allBlocks = new Map(blocks.map(b => [b.id, b]));
  return { allBlocks };
}

describe('placeNear', () => {
  it('places to the right, offset round(1.75 * anchor.w)', () => {
    const anchor = block('a1', { x: 100, y: 200, w: 80, h: 60 });
    const p = page(anchor);

    const result = placeNear(p, anchor, 'right');

    // round(1.75 * 80) = 140
    expect(result).toEqual({ x: 100 + 80 + 140, y: 200, w: 80, h: 80 });
  });

  it('places to the left, offset round(1.75 * anchor.w)', () => {
    const anchor = block('a1', { x: 300, y: 200, w: 80, h: 60 });
    const p = page(anchor);

    const result = placeNear(p, anchor, 'left');

    expect(result).toEqual({ x: 300 - 140 - 80, y: 200, w: 80, h: 80 });
  });

  it('places below, offset round(1.75 * anchor.w)', () => {
    const anchor = block('a1', { x: 100, y: 200, w: 80, h: 60 });
    const p = page(anchor);

    const result = placeNear(p, anchor, 'below');

    expect(result).toEqual({ x: 100, y: 200 + 60 + 140, w: 80, h: 80 });
  });

  it('places above, offset round(1.75 * anchor.w)', () => {
    const anchor = block('a1', { x: 100, y: 400, w: 80, h: 60 });
    const p = page(anchor);

    const result = placeNear(p, anchor, 'above');

    expect(result).toEqual({ x: 100, y: 400 - 140 - 80, w: 80, h: 80 });
  });

  it('rounds a fractional offset to the nearest integer', () => {
    // w = 51 -> 1.75 * 51 = 89.25 -> round -> 89
    const anchor = block('a1', { x: 0, y: 0, w: 51, h: 40 });
    const p = page(anchor);

    const result = placeNear(p, anchor, 'right');

    expect(result.x).toBe(0 + 51 + 89);
  });

  it('nudges down by anchor.h while the placed box overlaps an existing block', () => {
    const anchor = block('a1', { x: 0, y: 0, w: 80, h: 60 });
    // round(1.75*80) = 140, so the naive right placement is x:220,y:0,w:80,h:80.
    // Put a blocker exactly there, the same height as the anchor, so a single
    // anchor.h nudge clears it exactly (edges touching don't count as overlap).
    const blocker = block('b1', { x: 220, y: 0, w: 80, h: 60 });
    const p = page(anchor, blocker);

    const result = placeNear(p, anchor, 'right');

    // Nudged down by anchor.h (60) once, clearing the blocker.
    expect(result).toEqual({ x: 220, y: 60, w: 80, h: 80 });
  });

  it('keeps nudging down through multiple stacked overlaps', () => {
    const anchor = block('a1', { x: 0, y: 0, w: 80, h: 60 });
    const blocker1 = block('b1', { x: 220, y: 0, w: 80, h: 60 });
    const blocker2 = block('b2', { x: 220, y: 60, w: 80, h: 60 });
    const p = page(anchor, blocker1, blocker2);

    const result = placeNear(p, anchor, 'right');

    expect(result).toEqual({ x: 220, y: 120, w: 80, h: 80 });
  });
});

describe('placeAtFlowEnd', () => {
  // Fix round 1 / I1: placeAtFlowEnd reads modelManager.getModelDefinition()
  // (a ModelDefinition, whose activities/generators are list managers with
  // .getAll()) -- NOT modelManager.getModel() (the Model ROOT record, which
  // has no activities/generators at all). A stub shaped like the Model root
  // would let this pass for the wrong reason, so the stub below mirrors the
  // real list-manager shape.
  function modelDefStub(activityIds: string[], generatorIds: string[]) {
    return {
      getModelDefinition: async () => ({
        activities: { getAll: () => activityIds.map(id => ({ id })) },
        generators: { getAll: () => generatorIds.map(id => ({ id })) },
      }),
    };
  }

  it('places right of the rightmost Activity/Generator block, on the first generator\'s row', async () => {
    const gen = block('g1', { x: 0, y: 500, w: 80, h: 80 });
    const act1 = block('a1', { x: 200, y: 0, w: 80, h: 60 });
    const act2 = block('a2', { x: 400, y: 100, w: 100, h: 60 }); // rightmost: 400+100=500
    // A non-flow block further right than everything -- must be ignored.
    const decoy = block('d1', { x: 900, y: 900, w: 50, h: 50 });
    const p = page(gen, act1, act2, decoy);

    const modelManager = modelDefStub(['a1', 'a2'], ['g1']);

    const result = await placeAtFlowEnd(p, modelManager);

    // rightmost is act2: x=400,w=100 -> right edge 500; offset round(1.75*100)=175
    expect(result).toEqual({ x: 500 + 175, y: 500, w: 80, h: 80 });
  });

  it('falls back to {x:0,y:0,w:80,h:80} when there is no model yet', async () => {
    const p = page();
    const modelManager = { getModelDefinition: async () => null };

    expect(await placeAtFlowEnd(p, modelManager)).toEqual({ x: 0, y: 0, w: 80, h: 80 });
  });

  it('falls back to the default box when no block on the page is part of the flow', async () => {
    const decoy = block('d1', { x: 900, y: 900, w: 50, h: 50 });
    const p = page(decoy);
    const modelManager = modelDefStub(['a1'], []);

    expect(await placeAtFlowEnd(p, modelManager)).toEqual({ x: 0, y: 0, w: 80, h: 80 });
  });

  it('falls back to the rightmost flow block\'s own row when the model has no generator', async () => {
    const act1 = block('a1', { x: 0, y: 30, w: 80, h: 60 });
    const p = page(act1);
    const modelManager = modelDefStub(['a1'], []);

    const result = await placeAtFlowEnd(p, modelManager);

    expect(result.y).toBe(30);
  });
});
