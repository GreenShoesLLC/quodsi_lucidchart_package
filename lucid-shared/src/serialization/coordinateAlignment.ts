/**
 * Reconcile LucidChart `getSvg()` output with the engine's layout coordinates.
 *
 * `getSvg()` draws shapes at their raw model coordinates but wraps the whole
 * page in `<g transform="translate(Tx Ty)" lucid:page-tab-id=...>` to normalize
 * the page (which may extend to negative coordinates) into a positive viewBox.
 * `layout.json` uses the raw model coordinates with no such shift, so the
 * background and the skeleton/entities end up offset by (Tx, Ty) in the viewer.
 */

import { ISerializedModel } from './interfaces/ISerializedModel';

export interface PageTranslate {
  x: number;
  y: number;
}

/**
 * Extract the page group's `translate(Tx Ty)` from a `getSvg()` SVG string.
 * Returns {0,0} when there is no page group, no translate, or a non-translate
 * (e.g. matrix) transform — all safe no-ops that leave coordinates unchanged.
 */
export function parsePageTranslate(svg: string): PageTranslate {
  const none: PageTranslate = { x: 0, y: 0 };
  if (!svg) return none;
  // Isolate the page group's opening tag (the <g> carrying lucid:page-tab-id),
  // independent of attribute order.
  const groupTag = svg.match(/<g\b[^>]*\blucid:page-tab-id\b[^>]*>/);
  if (!groupTag) return none;
  // Pull a translate(tx[, ty]) out of that tag. A matrix()/other transform
  // simply won't match, leaving the safe {0,0} no-op.
  const t = groupTag[0].match(/\btranslate\(\s*(-?\d*\.?\d+)(?:[\s,]+(-?\d*\.?\d+))?\s*\)/);
  if (!t) return none;
  return { x: parseFloat(t[1]), y: t[2] !== undefined ? parseFloat(t[2]) : 0 };
}

/**
 * Add (dx, dy) to every layout-bearing coordinate in the serialized model:
 * activities, generators, resources, and each activity's connectors
 * (source/target/midpoint). Entities are not laid out as shapes and are left
 * untouched. Mutates `model` in place; a (0,0) shift is a no-op. This is a
 * uniform translation, so relative geometry — and the simulation — is unchanged.
 */
export function offsetSerializedModelCoordinates(
  model: ISerializedModel,
  dx: number,
  dy: number,
): void {
  if (dx === 0 && dy === 0) return;
  for (const a of model.activities ?? []) {
    a.x += dx;
    a.y += dy;
    for (const c of a.connectors ?? []) {
      c.sourceX += dx;
      c.sourceY += dy;
      c.targetX += dx;
      c.targetY += dy;
      c.x += dx;
      c.y += dy;
    }
  }
  for (const g of model.generators ?? []) {
    g.x += dx;
    g.y += dy;
  }
  for (const r of model.resources ?? []) {
    r.x += dx;
    r.y += dy;
  }
}
