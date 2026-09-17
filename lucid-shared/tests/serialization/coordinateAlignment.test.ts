import { parsePageTranslate } from '../../src/serialization/coordinateAlignment';

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
    const svg = `<svg><g lucid:page-tab-id="0_0"></g></svg>`;
    expect(parsePageTranslate(svg)).toEqual({ x: 0, y: 0 });
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

// The shift itself is @quodsi/shared's offsetLayoutCoordinates, tested there
// (quodsi_shared/src/serialization/__tests__/offsetLayoutCoordinates.test.ts).
