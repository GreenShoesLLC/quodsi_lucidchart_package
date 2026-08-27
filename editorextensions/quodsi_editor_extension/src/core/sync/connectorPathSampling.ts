// Sampled connector path for the animation viewer.
//
// The engine animates an entity along `connector.path` (a model-space
// polyline, endpoints included) when the host supplies one; otherwise it
// draws a straight slot-to-slot line (spec: monorepo
// docs/superpowers/specs/2026-08-26-animation-connector-path-design.md).
// drawio reads its routed line directly from mxGraph. Lucid's SDK exposes
// no waypoints — only LineProxy.getRelativePosition(t) (a point at fraction
// t along the drawn line) and getShape() — so the path is SAMPLED here.
//
// Shape-aware, so cost lands where it buys fidelity:
//   diagonal -> the two endpoints (exact, 2 calls)
//   elbow    -> `elbowSamples` evenly spaced, then Douglas-Peucker at
//               `simplifyTolerance` px so orthogonal corners survive as sharp
//               vertices (typically 3-6 points)
//   curve    -> `curveSamples` kept as-is
// Every getRelativePosition call is a bridge into the Lucid client, so a
// per-sync SampleBudget caps the total; past it, lines get endpoints only
// (the animation still runs, just straight). Any throw -> no path, never a
// failed sync. Tune DEFAULT_PATH_SAMPLING - it is the only knob.

export type LineShapeLike = 'diagonal' | 'elbow' | 'curve';

/** The two LineProxy members used, so tests need no SDK. */
export interface LineLike {
  getShape(): LineShapeLike | string;
  getRelativePosition(relative: number): { x: number; y: number };
}

export interface PathSamplingConfig {
  /** Samples along an elbow line before corner simplification. */
  elbowSamples: number;
  /** Samples along a curved line (kept as-is). */
  curveSamples: number;
  /** Douglas-Peucker tolerance in model px for elbow simplification. */
  simplifyTolerance: number;
  /** Total getRelativePosition calls allowed per sync; past it -> endpoints only. */
  maxSamplesPerSync: number;
}

export const DEFAULT_PATH_SAMPLING: PathSamplingConfig = {
  elbowSamples: 24,
  curveSamples: 16,
  simplifyTolerance: 1,
  maxSamplesPerSync: 3000,
};

export class SampleBudget {
  private left: number;
  constructor(total: number) {
    this.left = Math.max(0, Math.floor(total));
  }
  get remaining(): number {
    return this.left;
  }
  /** Reserve n calls; false (and no change) if they do not fit. */
  take(n: number): boolean {
    if (n > this.left) return false;
    this.left -= n;
    return true;
  }
}

// `|| 0` folds -0 (from rounding a tiny negative) to 0 so paths compare cleanly.
const round2 = (v: number) => Math.round(v * 100) / 100 || 0;

function samplesFor(shape: string, cfg: PathSamplingConfig): number {
  if (shape === 'elbow') return Math.max(2, Math.floor(cfg.elbowSamples));
  if (shape === 'curve') return Math.max(2, Math.floor(cfg.curveSamples));
  return 2;
}

function sample(line: LineLike, n: number): number[][] | undefined {
  const out: number[][] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const p = line.getRelativePosition(t);
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return undefined;
    out.push([round2(p.x), round2(p.y)]);
  }
  return out;
}

function perpDistance(p: number[], a: number[], b: number[]): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2;
  const cx = a[0] + t * dx;
  const cy = a[1] + t * dy;
  return Math.hypot(p[0] - cx, p[1] - cy);
}

/** Douglas-Peucker: keeps endpoints and every vertex that deviates more than
 *  `tolerance` from the chord - an elbow's corners, not its straight runs. */
export function simplifyPolyline(points: number[][], tolerance: number): number[][] {
  if (points.length <= 2) return points;
  let maxD = -1;
  let idx = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i++) {
    const d = perpDistance(points[i], first, last);
    if (d > maxD) {
      maxD = d;
      idx = i;
    }
  }
  if (maxD <= tolerance) return [first, last];
  const left = simplifyPolyline(points.slice(0, idx + 1), tolerance);
  const right = simplifyPolyline(points.slice(idx), tolerance);
  return [...left.slice(0, -1), ...right];
}

function intersect(p1: number[], p2: number[], p3: number[], p4: number[]): number[] | undefined {
  const d = (p1[0] - p2[0]) * (p3[1] - p4[1]) - (p1[1] - p2[1]) * (p3[0] - p4[0]);
  if (Math.abs(d) < 1e-9) return undefined; // parallel / collinear
  const a = p1[0] * p2[1] - p1[1] * p2[0];
  const b = p3[0] * p4[1] - p3[1] * p4[0];
  const x = (a * (p3[0] - p4[0]) - (p1[0] - p2[0]) * b) / d;
  const y = (a * (p3[1] - p4[1]) - (p1[1] - p2[1]) * b) / d;
  return Number.isFinite(x) && Number.isFinite(y) ? [round2(x), round2(y)] : undefined;
}

/** Evenly spaced samples almost never land ON an elbow's corner, so
 *  simplification keeps the two samples either side of it. Where two
 *  consecutive vertices sit within `maxGap` of each other and the segments
 *  before and after are not collinear, replace the pair with the
 *  intersection of those segments - the true corner, at no extra calls. */
export function sharpenCorners(points: number[][], maxGap: number): number[][] {
  const out = points.map((p) => [...p]);
  let i = 1;
  while (i < out.length - 2) {
    const a = out[i];
    const b = out[i + 1];
    if (Math.hypot(b[0] - a[0], b[1] - a[1]) <= maxGap) {
      const corner = intersect(out[i - 1], a, b, out[i + 2]);
      if (corner) {
        out.splice(i, 2, corner);
        continue;
      }
    }
    i++;
  }
  return out;
}

function polylineLength(points: number[][]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return len;
}

export function sampleLinePath(
  line: LineLike,
  cfg: PathSamplingConfig,
  budget: SampleBudget,
): number[][] | undefined {
  try {
    const shape = String(line.getShape());
    let n = samplesFor(shape, cfg);
    let simplify = shape === 'elbow';
    if (!budget.take(n)) {
      // Out of budget for the full sample: endpoints only, if even that fits.
      if (!budget.take(2)) return undefined;
      n = 2;
      simplify = false;
    }
    const pts = sample(line, n);
    if (!pts || pts.length < 2) return undefined;
    if (!simplify) return pts;
    // A corner's two neighbouring samples are at most ~one spacing apart
    // (plus slack for rounding), never a whole straight run.
    const spacing = polylineLength(pts) / (pts.length - 1);
    return sharpenCorners(simplifyPolyline(pts, cfg.simplifyTolerance), spacing * 1.5);
  } catch {
    return undefined;
  }
}

export interface SamplingStats {
  /** Connectors that received a path. */
  sampled: number;
  /** getRelativePosition calls consumed. */
  calls: number;
}

/** Set `path` on every connector whose line resolves; leave the rest alone
 *  (never `path: undefined` - the wire omits the key). */
export function sampleConnectorPaths(
  connectors: { id: string; path?: number[][] }[],
  lineFor: (id: string) => LineLike | undefined,
  cfg: PathSamplingConfig = DEFAULT_PATH_SAMPLING,
): SamplingStats {
  const budget = new SampleBudget(cfg.maxSamplesPerSync);
  const before = budget.remaining;
  let sampled = 0;
  for (const c of connectors) {
    let line: LineLike | undefined;
    try {
      line = lineFor(c.id);
    } catch {
      line = undefined;
    }
    if (!line) continue;
    const path = sampleLinePath(line, cfg, budget);
    if (path) {
      c.path = path;
      sampled++;
    }
  }
  return { sampled, calls: before - budget.remaining };
}
