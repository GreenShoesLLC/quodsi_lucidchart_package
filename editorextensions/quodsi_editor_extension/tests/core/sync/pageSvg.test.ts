// The page SVG + coordinate alignment shared by the run path and the Studies
// snapshot push (src/core/sync/pageSvg.ts). parsePageTranslate's cases moved
// here from lucid-shared with the function.

import type { ISerializedModel } from '@quodsi/lucid-shared';
import { alignModelToPageSvg, parsePageTranslate, type SvgPage } from '../../../src/core/sync/pageSvg';
import type { LineLike } from '../../../src/core/sync/connectorPathSampling';

describe('parsePageTranslate', () => {
  it('parses a space-separated translate on the page group', () => {
    const svg = `<svg><g transform="translate(500 0)" lucid:page-tab-id="0_0"><path/></g></svg>`;
    expect(parsePageTranslate(svg)).toEqual({ x: 500, y: 0 });
  });

  it('parses a comma-separated translate regardless of attribute order', () => {
    const svg = `<svg><g lucid:page-tab-id="0_0" transform="translate(-40, 12.5)"></g></svg>`;
    expect(parsePageTranslate(svg)).toEqual({ x: -40, y: 12.5 });
  });

  it('treats a single-value translate as y=0', () => {
    const svg = `<svg><g transform="translate(500)" lucid:page-tab-id="0_0"></g></svg>`;
    expect(parsePageTranslate(svg)).toEqual({ x: 500, y: 0 });
  });

  it('returns {0,0} when the page group has no translate', () => {
    expect(parsePageTranslate(`<svg><g lucid:page-tab-id="0_0"></g></svg>`)).toEqual({ x: 0, y: 0 });
  });

  it('returns {0,0} when there is no page group', () => {
    expect(parsePageTranslate('<svg></svg>')).toEqual({ x: 0, y: 0 });
    expect(parsePageTranslate('')).toEqual({ x: 0, y: 0 });
  });

  it('returns {0,0} for an unsupported matrix transform (safe no-op)', () => {
    const svg = `<svg><g transform="matrix(1,0,0,1,500,0)" lucid:page-tab-id="0_0"></g></svg>`;
    expect(parsePageTranslate(svg)).toEqual({ x: 0, y: 0 });
  });
});

/** Straight line (0,0) -> (100,0): sampled to its two endpoints. */
const straight: LineLike = {
  getShape: () => 'diagonal',
  getRelativePosition: (t) => ({ x: 100 * t, y: 0 }),
};

function doc(): ISerializedModel {
  return {
    activities: [{ id: 'a1', name: 'A', x: 40, y: 20 }],
    generators: [],
    resources: [],
    connectors: [{ id: 'c1', name: 'C', sourceId: 'g1', targetId: 'a1', weight: 1, sourceX: 0, sourceY: 0, targetX: 100, targetY: 0 }],
  } as unknown as ISerializedModel;
}

function page(svg: string | Error): SvgPage {
  return {
    allLines: { get: (id) => (id === 'c1' ? straight : undefined) },
    getSvg: async () => {
      if (svg instanceof Error) throw svg;
      return svg;
    },
  };
}

const TRANSLATED = `<svg><g transform="translate(500 10)" lucid:page-tab-id="0_0"></g></svg>`;

describe('alignModelToPageSvg', () => {
  it('returns the SVG and shifts the layout -- the sampled path moves with its endpoints', async () => {
    const d = doc();
    const svg = await alignModelToPageSvg(d, page(TRANSLATED), { bestEffort: false });

    expect(svg).toBe(TRANSLATED);
    expect(d.activities[0]).toMatchObject({ x: 540, y: 30 });
    expect(d.connectors[0]).toMatchObject({ sourceX: 500, sourceY: 10, targetX: 600, targetY: 10 });
    expect(d.connectors[0].path).toEqual([[500, 10], [600, 10]]);
  });

  it('leaves the layout alone when the SVG has no translate', async () => {
    const d = doc();
    await alignModelToPageSvg(d, page('<svg></svg>'), { bestEffort: false });
    expect(d.activities[0]).toMatchObject({ x: 40, y: 20 });
    expect(d.connectors[0].path).toEqual([[0, 0], [100, 0]]);
  });

  it('best effort: a failed capture sends the model without an SVG, unshifted', async () => {
    const d = doc();
    const svg = await alignModelToPageSvg(d, page(new Error('getSvg failed')), { bestEffort: true });
    expect(svg).toBeUndefined();
    expect(d.activities[0]).toMatchObject({ x: 40, y: 20 });
  });

  it('not best effort: a failed capture throws (the run fails)', async () => {
    await expect(alignModelToPageSvg(doc(), page(new Error('getSvg failed')), { bestEffort: false }))
      .rejects.toThrow('getSvg failed');
  });
});
