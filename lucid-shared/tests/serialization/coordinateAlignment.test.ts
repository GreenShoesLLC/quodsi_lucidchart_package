import {
  parsePageTranslate,
  offsetSerializedModelCoordinates,
} from '../../src/serialization/coordinateAlignment';
import { ISerializedModel } from '../../src/serialization/interfaces/ISerializedModel';

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

// Minimal model exercising every coordinate the function touches. Cast through
// unknown because we only populate the layout-bearing fields under test.
//
// Wire-cleanup Phase B2 Task 9 fix round (review F3): `CleanConnectorDoc`
// DOES carry `sourceX`/`sourceY`/`targetX`/`targetY` (display-only,
// omit@0) — the initial pass wrongly claimed no connector geometry at all
// and dropped the fixture's connector entirely; restored below with one
// connector carrying real (non-zero) coordinates and one with none set
// (exercising the "absent stays absent" rule, distinct from activities/
// generators/resources' "absent defaults to 0" rule). `x`/`y` are
// sparse-omitted at 0 on the real wire (Task 7); the second activity below
// has neither set, exercising the undefined-defaults-to-0 guard rather
// than a literal `0`.
function makeModel(): ISerializedModel {
  return {
    activities: [
      { x: 540, y: 160 },
      {},
    ],
    generators: [{ x: 280, y: 160 }],
    resources: [{ x: -40, y: 260 }],
    connectors: [
      { sourceX: 100, sourceY: 20, targetX: 300, targetY: 60 },
      {},
    ],
    entities: [{ x: 0, y: 0 }],
  } as unknown as ISerializedModel;
}

describe('offsetSerializedModelCoordinates', () => {
  it('shifts every layout-bearing coordinate by (dx, dy)', () => {
    const m = makeModel();
    offsetSerializedModelCoordinates(m, 500, 10);
    expect(m.activities[0]!.x).toBe(1040);
    expect(m.activities[0]!.y).toBe(170);
    expect(m.generators[0]!.x).toBe(780);
    expect(m.resources[0]!.x).toBe(460);
    expect(m.resources[0]!.y).toBe(270);
  });

  it('treats an absent (sparse-omitted, 0-valued) activity/generator/resource coordinate as 0, not NaN', () => {
    const m = makeModel();
    offsetSerializedModelCoordinates(m, 500, 10);
    expect(m.activities[1]!.x).toBe(500);
    expect(m.activities[1]!.y).toBe(10);
  });

  it('shifts a connector carrying real source/target coordinates', () => {
    const m = makeModel();
    offsetSerializedModelCoordinates(m, 500, 10);
    const c = m.connectors[0]! as { sourceX?: number; sourceY?: number; targetX?: number; targetY?: number };
    expect(c.sourceX).toBe(600);
    expect(c.sourceY).toBe(30);
    expect(c.targetX).toBe(800);
    expect(c.targetY).toBe(70);
  });

  it('leaves an absent connector coordinate absent (does not materialize a dx-valued key from nothing)', () => {
    const m = makeModel();
    offsetSerializedModelCoordinates(m, 500, 10);
    const c = m.connectors[1]! as { sourceX?: number; sourceY?: number; targetX?: number; targetY?: number };
    expect(c.sourceX).toBeUndefined();
    expect(c.sourceY).toBeUndefined();
    expect(c.targetX).toBeUndefined();
    expect(c.targetY).toBeUndefined();
    expect('sourceX' in c).toBe(false);
  });

  it('leaves entities untouched (they are not laid-out shapes)', () => {
    const m = makeModel();
    offsetSerializedModelCoordinates(m, 500, 10);
    expect(m.entities[0]!.x).toBe(0);
    expect(m.entities[0]!.y).toBe(0);
  });

  it('is a no-op for (0, 0)', () => {
    const m = makeModel();
    offsetSerializedModelCoordinates(m, 0, 0);
    expect(m.activities[0]!.x).toBe(540);
    expect(m.resources[0]!.x).toBe(-40);
    const c = m.connectors[0]! as { sourceX?: number };
    expect(c.sourceX).toBe(100);
  });

  it('preserves relative distances between shapes', () => {
    const m = makeModel();
    const before = m.activities[0]!.x! - m.resources[0]!.x!;
    offsetSerializedModelCoordinates(m, 500, 10);
    expect(m.activities[0]!.x! - m.resources[0]!.x!).toBe(before);
  });
});
