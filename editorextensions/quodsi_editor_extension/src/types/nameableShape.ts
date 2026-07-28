// editorextensions/quodsi_editor_extension/src/types/nameableShape.ts
//
// Adapter: Lucid SDK proxies → the platform-neutral `NameableShape` that
// @quodsi/shared's naming policy consumes.
//
// This is the whole reason Lucid can share the policy at all. drawio and Visio
// already fed the same policy through their `ShapeInfoLike` struct; Lucid's
// conversion read `BlockProxy`/`LineProxy` inline, so the policy had to be
// forked — and the fork drifted until connector naming was correct in drawio
// and broken in Lucid (ClickUp 86e233g6f). Keep platform access in here so the
// naming rules stay in one shared place.

import { BlockProxy, LineProxy } from 'lucid-extension-sdk';
import type { NameableShape } from '@quodsi/lucid-shared';

/** First non-empty text area on a shape — what the user typed on the canvas. */
function firstText(shape: { textAreas?: Map<string, string> }): string | null {
    const areas = shape.textAreas;
    if (!areas || areas.size === 0) return null;
    for (const text of areas.values()) {
        if (text && text.trim()) return text.trim();
    }
    return null;
}

/**
 * Describe a block for naming.
 *
 * Both `name` and `masterName` are deliberately left empty:
 *
 * - `name`: Lucid has no shape name separate from the canvas text, so the
 *   policy's "the user renamed this shape" step is a no-op here rather than
 *   something fabricated.
 * - `masterName`: the nearest candidate is `getClassName()`, but that returns
 *   an SDK class ("ProcessBlock"), not a stencil the user picked the way
 *   Visio's master is ("Process"). The old Lucid-only chain surfaced it as
 *   "Act ProcessBlock"; letting the policy fall through to "Activity 1"
 *   instead reads better AND is unique per shape, which the class name never
 *   was — every unnamed block of a type collided on it.
 */
export function blockToNameable(block: BlockProxy): NameableShape {
    return {
        shapeId: block.id,
        text: firstText(block as unknown as { textAreas?: Map<string, string> }),
        masterName: null,
    };
}

/**
 * Describe a line for naming. Lines carry labels too ("Yes" / "No" on a
 * decision branch), and the shared policy prefers that label over a derived
 * "<source> → <target>" — a user who labelled the arrow already said what it
 * should be called.
 */
export function lineToNameable(line: LineProxy): NameableShape {
    return {
        shapeId: line.id,
        text: firstText(line as unknown as { textAreas?: Map<string, string> }),
        masterName: null,
    };
}

