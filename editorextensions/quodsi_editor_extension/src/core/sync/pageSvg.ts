// The page SVG that goes with a serialized model, and the coordinate shift
// that puts the model into that SVG's frame -- one place for the run path
// (SimulationHandler) and the Studies snapshot push (scenarioSync).
//
// Lucid's getSvg() wraps the page in `<g transform="translate(Tx Ty)"
// lucid:page-tab-id=...>` to move a page that extends to negative
// coordinates into a positive viewBox. The serialized model (the engine's
// layout.json) uses raw coordinates, so without the same shift the diagram
// background and the animated entities are offset by (Tx, Ty) in the viewer.
// The shift is uniform: relative geometry, and so the simulation, is
// unchanged. The shift itself is @quodsi/shared's offsetLayoutCoordinates,
// which drawio uses too.

import { getLogger, offsetLayoutCoordinates } from '@quodsi/lucid-shared';
import type { ISerializedModel } from '@quodsi/lucid-shared';
import { sampleConnectorPaths, type LineLike } from './connectorPathSampling';

const log = getLogger('PageSvg');

export interface PageTranslate {
  x: number;
  y: number;
}

/** The two things the alignment needs from a Lucid page (a PageProxy). */
export interface SvgPage {
  allLines: { get(id: string): LineLike | undefined };
  /** PageProxy.getSvg(items?, includeBackground?): the whole page when no items are given. */
  getSvg(items?: never[], includeBackground?: boolean): Promise<string>;
}

/**
 * Extract the page group's `translate(Tx Ty)` from a `getSvg()` SVG string.
 * Returns {0,0} when there is no page group, no translate, or a non-translate
 * (e.g. matrix) transform -- all safe no-ops that leave coordinates unchanged.
 */
export function parsePageTranslate(svg: string): PageTranslate {
  const none: PageTranslate = { x: 0, y: 0 };
  if (!svg) return none;
  // The page group's opening tag (the <g> carrying lucid:page-tab-id),
  // independent of attribute order.
  const groupTag = svg.match(/<g\b[^>]*\blucid:page-tab-id\b[^>]*>/);
  if (!groupTag) return none;
  // A matrix()/other transform simply won't match: the safe {0,0} no-op.
  const t = groupTag[0].match(/\btranslate\(\s*(-?\d*\.?\d+)(?:[\s,]+(-?\d*\.?\d+))?\s*\)/);
  if (!t) return none;
  return { x: parseFloat(t[1]), y: t[2] !== undefined ? parseFloat(t[2]) : 0 };
}

/**
 * Capture the page SVG for `doc` and move `doc`'s layout into its frame, in
 * place:
 *  1. sample connector paths for the animation -- BEFORE the shift, so each
 *     `path` moves with its endpoints;
 *  2. capture the page SVG;
 *  3. shift the layout by the SVG's page translate.
 *
 * Returns the SVG. With `bestEffort`, a failure in 1-2 is logged and the
 * document goes out without an SVG (the Studies snapshot: animation renders
 * without a background). Without it the failure is thrown (a run).
 */
export async function alignModelToPageSvg(
  doc: ISerializedModel,
  page: SvgPage,
  opts: { bestEffort: boolean },
): Promise<string | undefined> {
  let svg: string | undefined;
  try {
    const stats = sampleConnectorPaths(doc.connectors, (id) => page.allLines.get(id));
    log.debug('Sampled connector paths', stats);
    svg = await page.getSvg(undefined, true); // whole page, with its background
  } catch (error) {
    if (!opts.bestEffort) throw error;
    log.warn('Page SVG capture failed; sending the model without a diagram', error);
    return undefined;
  }
  const translate = parsePageTranslate(svg);
  if (translate.x !== 0 || translate.y !== 0) {
    offsetLayoutCoordinates(doc, translate.x, translate.y);
    log.debug('Aligned model coordinates to the page SVG translate', translate);
  }
  return svg;
}
