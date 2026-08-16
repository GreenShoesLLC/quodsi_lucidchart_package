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
 * activities, generators, and resources. Entities are not laid out as
 * shapes and are left untouched. Mutates `model` in place; a (0,0) shift is
 * a no-op. This is a uniform translation, so relative geometry — and the
 * simulation — is unchanged.
 *
 * Wire-cleanup Phase B2 Task 9: two changes from the pre-clean version.
 * (1) Connectors are no longer shifted — `CleanConnectorDoc` (engine
 * `document/clean/routing.py`) carries NO geometry at all (verified against
 * the engine schema: connector positions were never part of the animation
 * layout read from the model document; the viewer derives connector paths
 * from the two endpoint node positions instead), and `Connector.toJSON()`
 * no longer emits `x`/`y`/`sourceX`/`sourceY`/`targetX`/`targetY` — there is
 * nothing left on a serialized connector to shift. (2) `x`/`y` on
 * activities/generators/resources are now sparse-omitted at 0 (Task 7), so
 * an element sitting exactly at the origin arrives here with `x`/`y`
 * `undefined`, not `0` — `undefined + dx` would silently become `NaN`.
 * Every accumulator below defaults a missing coordinate to 0 before adding.
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
}
