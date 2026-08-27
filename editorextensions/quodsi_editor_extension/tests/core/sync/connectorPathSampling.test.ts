// Sampled connector path for the animation (Lucid has no waypoint API; see
// src/core/sync/connectorPathSampling.ts). Pure: a fake LineLike stands in
// for LineProxy.

import {
  DEFAULT_PATH_SAMPLING,
  SampleBudget,
  sampleLinePath,
  sampleConnectorPaths,
  sharpenCorners,
  type LineLike,
  type PathSamplingConfig,
} from '../../../src/core/sync/connectorPathSampling';

const cfg: PathSamplingConfig = { ...DEFAULT_PATH_SAMPLING };

/** Straight line (0,0)→(100,0). */
const diagonal: LineLike = {
  getShape: () => 'diagonal',
  getRelativePosition: (t) => ({ x: 100 * t, y: 0 }),
};

/** L-shaped elbow: right 100 then down 100; corner at t = 0.5. */
const elbow: LineLike = {
  getShape: () => 'elbow',
  getRelativePosition: (t) =>
    t <= 0.5 ? { x: 200 * t, y: 0 } : { x: 100, y: 200 * (t - 0.5) },
};

/** Quarter-circle-ish curve. */
const curve: LineLike = {
  getShape: () => 'curve',
  getRelativePosition: (t) => ({ x: 100 * Math.sin((Math.PI / 2) * t), y: 100 * (1 - Math.cos((Math.PI / 2) * t)) }),
};

describe('sampleLinePath', () => {
  it('diagonal → exactly the two endpoints, two calls', () => {
    const calls: number[] = [];
    const line: LineLike = { ...diagonal, getRelativePosition: (t) => { calls.push(t); return diagonal.getRelativePosition(t); } };
    expect(sampleLinePath(line, cfg, new SampleBudget(cfg.maxSamplesPerSync))).toEqual([[0, 0], [100, 0]]);
    expect(calls).toEqual([0, 1]);
  });

  it('elbow → simplified to the corner: exactly three vertices', () => {
    expect(sampleLinePath(elbow, cfg, new SampleBudget(cfg.maxSamplesPerSync))).toEqual([[0, 0], [100, 0], [100, 100]]);
  });

  it('elbow sample count is configurable', () => {
    const calls: number[] = [];
    const line: LineLike = { ...elbow, getRelativePosition: (t) => { calls.push(t); return elbow.getRelativePosition(t); } };
    sampleLinePath(line, { ...cfg, elbowSamples: 9 }, new SampleBudget(1000));
    expect(calls).toHaveLength(9);
    expect(calls[0]).toBe(0);
    expect(calls[8]).toBe(1);
  });

  it('curve → curveSamples points, unsimplified', () => {
    const pts = sampleLinePath(curve, { ...cfg, curveSamples: 5 }, new SampleBudget(1000))!;
    expect(pts).toHaveLength(5);
    expect(pts[0]).toEqual([0, 0]);
    expect(pts[4][0]).toBeCloseTo(100, 6);
    expect(pts[4][1]).toBeCloseTo(100, 6);
  });

  it('rounds sampled coordinates to two decimals', () => {
    const pts = sampleLinePath(curve, { ...cfg, curveSamples: 3 }, new SampleBudget(1000))!;
    for (const [x, y] of pts) {
      expect(x).toBe(Math.round(x * 100) / 100);
      expect(y).toBe(Math.round(y * 100) / 100);
    }
  });

  it('falls back to endpoints when the budget is exhausted', () => {
    const budget = new SampleBudget(5);
    // elbow needs 24 samples; only 5 left → endpoints only (2 calls).
    expect(sampleLinePath(elbow, cfg, budget)).toEqual([[0, 0], [100, 100]]);
    expect(budget.remaining).toBe(3);
  });

  it('returns undefined and never throws on a line that throws', () => {
    const bad: LineLike = { getShape: () => 'elbow', getRelativePosition: () => { throw new Error('boom'); } };
    expect(sampleLinePath(bad, cfg, new SampleBudget(1000))).toBeUndefined();
  });

  it('returns undefined for non-finite samples', () => {
    const nan: LineLike = { getShape: () => 'diagonal', getRelativePosition: () => ({ x: NaN, y: 0 }) };
    expect(sampleLinePath(nan, cfg, new SampleBudget(1000))).toBeUndefined();
  });
});

describe('sharpenCorners', () => {
  it('replaces the two samples around a corner with the exact intersection', () => {
    expect(sharpenCorners([[0, 0], [95.65, 0], [100, 4.35], [100, 100]], 10)).toEqual([[0, 0], [100, 0], [100, 100]]);
  });
  it('leaves collinear near-pairs and far-apart vertices alone', () => {
    const pts = [[0, 0], [50, 0], [55, 0], [100, 0]];
    expect(sharpenCorners(pts, 10)).toEqual(pts);
    const far = [[0, 0], [100, 0], [100, 100], [200, 100]];
    expect(sharpenCorners(far, 10)).toEqual(far);
  });
});

describe('sampleConnectorPaths', () => {
  it('sets path on each connector whose line is found, leaves others alone', () => {
    const connectors = [{ id: 'l1' }, { id: 'l2' }, { id: 'missing' }] as { id: string; path?: number[][] }[];
    const lines = new Map<string, LineLike>([['l1', diagonal], ['l2', elbow]]);
    const stats = sampleConnectorPaths(connectors, (id) => lines.get(id), cfg);
    expect(connectors[0].path).toEqual([[0, 0], [100, 0]]);
    expect(connectors[1].path).toEqual([[0, 0], [100, 0], [100, 100]]);
    expect('path' in connectors[2]).toBe(false);
    expect(stats.sampled).toBe(2);
    expect(stats.calls).toBe(2 + cfg.elbowSamples);
  });
});
