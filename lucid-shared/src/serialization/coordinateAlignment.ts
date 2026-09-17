/**
 * Reconcile LucidChart `getSvg()` output with the engine's layout coordinates.
 *
 * `getSvg()` draws shapes at their raw model coordinates but wraps the whole
 * page in `<g transform="translate(Tx Ty)" lucid:page-tab-id=...>` to normalize
 * the page (which may extend to negative coordinates) into a positive viewBox.
 * `layout.json` uses the raw model coordinates with no such shift, so the
 * background and the skeleton/entities end up offset by (Tx, Ty) in the viewer.
 *
 * This file reads (Tx, Ty) from the SVG; @quodsi/shared's
 * offsetLayoutCoordinates applies the shift (the same function drawio uses).
 */

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
