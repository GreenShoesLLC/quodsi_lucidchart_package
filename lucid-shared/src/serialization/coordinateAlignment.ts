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
 * activities, generators, resources, and connectors. Entities are not laid
 * out as shapes and are left untouched. Mutates `model` in place; a (0,0)
 * shift is a no-op. This is a uniform translation, so relative geometry —
 * and the simulation — is unchanged.
 *
 * Wire-cleanup Phase B2 Task 9 fix round (review F3): the initial pass
 * wrongly claimed `CleanConnectorDoc` carries no geometry at all and
 * dropped connector shifting entirely. It does carry `sourceX`/`sourceY`/
 * `targetX`/`targetY` (engine `document/clean/routing.py:284-287`,
 * display-only `float = Field(default=0.0, ...)`), and `Connector.toJSON()`
 * (shared) already emits them, sparse-omitted at 0 — restored below. The
 * midpoint `x`/`y` genuinely has no slot on `CleanConnectorDoc` and stays
 * unshifted (there is nothing to shift).
 *
 * `x`/`y` on activities/generators/resources, and now `sourceX`/`sourceY`/
 * `targetX`/`targetY` on connectors, are all sparse-omitted at 0 (Task 7),
 * so an element/edge sitting exactly at the origin arrives here with the
 * coordinate `undefined`, not `0`. Two different rules apply depending on
 * why the key might be absent:
 *   - activities/generators/resources: EVERY one of these always has a real
 *     captured position (`block.getBoundingBox()`), so an absent `x`/`y` can
 *     only mean "the true value happens to be 0" — shifting materializes it
 *     (`(a.x ?? 0) + dx`), which is what a real 0-valued position shifted by
 *     dx should become.
 *   - connectors: shifting an ABSENT key must NOT materialize a `dx`-valued
 *     coordinate from nothing — only keys already present are shifted, so a
 *     sparse-omitted 0 stays sparse-omitted (`omit@0` is preserved, not
 *     silently turned into an explicit `dx`).
 *
 * `path` (host-drawn polyline, Connector.ts/`ISerializedConnector`) is
 * additive-optional and follows the same "only shift what's present" rule
 * as sourceX/Y and targetX/Y — a connector without `path` is left alone
 * rather than gaining one.
 */
export function offsetSerializedModelCoordinates(
  model: ISerializedModel,
  dx: number,
  dy: number,
): void {
  if (dx === 0 && dy === 0) return;
  for (const a of model.activities ?? []) {
    a.x = (a.x ?? 0) + dx;
    a.y = (a.y ?? 0) + dy;
  }
  for (const g of model.generators ?? []) {
    g.x = (g.x ?? 0) + dx;
    g.y = (g.y ?? 0) + dy;
  }
  for (const r of model.resources ?? []) {
    r.x = (r.x ?? 0) + dx;
    r.y = (r.y ?? 0) + dy;
  }
  for (const c of model.connectors ?? []) {
    if (c.sourceX !== undefined) c.sourceX += dx;
    if (c.sourceY !== undefined) c.sourceY += dy;
    if (c.targetX !== undefined) c.targetX += dx;
    if (c.targetY !== undefined) c.targetY += dy;
    if (Array.isArray(c.path)) c.path = c.path.map(([x, y]) => [x + dx, y + dy]);
  }
}
