// editorextensions/quodsi_editor_extension/src/core/lucidDrawSizing.ts
//
// Sizing for every block Quodsi draws on a Lucid page: documents drawn whole
// (the onboarding example, from drawio's geometry, and the Advisor's built
// models, the shared layout's positions with no sizes) and the Advisor's single
// new shapes. drawio layouts are sized for drawio's smaller label text; drawn
// as-is in Lucid, the names overflow their blocks.

/** Block text size: Lucid's ProcessBlock default overflows 80px and 120px
 *  blocks (Daniel's smoke, 2026-10-19). */
export const DRAW_TEXT_SIZE = 10;

/** drawio layouts are sized for drawio's smaller label text; in Lucid the
 *  names overflowed them even at DRAW_TEXT_SIZE (smoke 2, 2026-10-19). */
export const LAYOUT_SCALE = 1.5;

/** The shared layout's node size (quodsi_shared drawio-render/layout.ts
 *  NODE_SIZE), for a block whose record carries no size of its own. */
const LAYOUT_NODE_SIZE = 80;

/** A drawn block with no size of its own: the layout's node, scaled for Lucid.
 *  The Advisor's single new shapes get it too, so they match a built model. */
export const DRAWN_BLOCK_SIZE = { w: LAYOUT_NODE_SIZE * LAYOUT_SCALE, h: LAYOUT_NODE_SIZE * LAYOUT_SCALE };

/** Names a newly drawn block, at DRAW_TEXT_SIZE. */
export async function labelBlock(block: any, name: string): Promise<void> {
  block.textAreas.set('Text', name);
  await block.textStyles.set('Text', { size: DRAW_TEXT_SIZE });
}

const BLOCK_LISTS = ['generators', 'activities', 'resources'] as const;

/** A copy of `doc` with every block's x/y/width/height multiplied by `k`, so
 *  centres stay aligned and lines stay straight. Never mutates `doc`. */
export function scaleLayout(doc: Record<string, any>, k: number): Record<string, any> {
  const scaleBlock = (b: Record<string, any>) => {
    const out = { ...b };
    for (const key of ['x', 'y', 'width', 'height']) {
      if (typeof out[key] === 'number') out[key] = out[key] * k;
    }
    return out;
  };
  const out = { ...doc };
  for (const key of BLOCK_LISTS) {
    if (Array.isArray(doc[key])) out[key] = doc[key].map(scaleBlock);
  }
  return out;
}

/** `doc` as Lucid draws it: a block with a position but no size gets the
 *  layout's node size (Advisor documents carry none), then the whole layout is
 *  scaled by LAYOUT_SCALE. Never mutates `doc`. */
export function sizeForLucid(doc: Record<string, any>): Record<string, any> {
  const sized = { ...doc };
  for (const key of BLOCK_LISTS) {
    if (!Array.isArray(doc[key])) continue;
    sized[key] = doc[key].map((b: Record<string, any>) => {
      if (typeof b.x !== 'number' || typeof b.y !== 'number') return b;
      return {
        ...b,
        width: typeof b.width === 'number' ? b.width : LAYOUT_NODE_SIZE,
        height: typeof b.height === 'number' ? b.height : LAYOUT_NODE_SIZE,
      };
    });
  }
  return scaleLayout(sized, LAYOUT_SCALE);
}
