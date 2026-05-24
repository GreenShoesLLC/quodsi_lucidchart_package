# SVG ↔ Layout Coordinate Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Studio animation's SVG background line up with the skeleton/entities by offsetting the serialized model's coordinates by `getSvg`'s page-translate at capture time, in the LucidChart extension.

**Architecture:** In `simulationHandler.ts`, after capturing the page SVG, parse the page group's `translate(Tx Ty)` and add `(Tx, Ty)` to every layout-bearing coordinate in the serialized model before submission. The engine then builds `layout.json` in the same coordinate frame the SVG renders in. Two pure, Jest-tested helpers in `@quodsi/shared` do the parsing and the offset; the SVG and Lucid shapeData are left untouched.

**Tech Stack:** TypeScript, Jest (Lucid `shared/` package), LucidChart extension SDK (`lucid-extension-sdk`).

**Repo / branch:** `quodsi_lucidchart_package` (separate repo), branch `fix/svg-layout-coordinate-alignment`. Spec: `docs/superpowers/specs/2026-05-23-svg-layout-coordinate-alignment-design.md`.

> **Branch guard:** before every commit, `cd /c/_source/quodsi/quodsi_lucidchart_package && git symbolic-ref --short HEAD` must print `fix/svg-layout-coordinate-alignment`. Stage only the explicit files listed; never `git add -A`.

---

## File Structure

- **`shared/src/serialization/coordinateAlignment.ts`** (create) — two pure functions: `parsePageTranslate(svg)` and `offsetSerializedModelCoordinates(model, dx, dy)`. One responsibility: reconcile the SVG page-translate into the serialized model's coordinate frame.
- **`shared/tests/serialization/coordinateAlignment.test.ts`** (create) — Jest unit tests for both functions.
- **`shared/src/serialization/index.ts`** (modify) — re-export the new module so it's reachable via `@quodsi/shared`.
- **`editorextensions/quodsi_editor_extension/src/core/messaging/handlers/simulationHandler.ts`** (modify) — call the two helpers between `getSvg()` and submission.

All commands run from `C:\_source\quodsi\quodsi_lucidchart_package`.

---

## Task 1: `parsePageTranslate` helper

**Files:**
- Create: `shared/src/serialization/coordinateAlignment.ts`
- Test: `shared/tests/serialization/coordinateAlignment.test.ts`

- [ ] **Step 1: Write the failing test**

Create `shared/tests/serialization/coordinateAlignment.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd shared && npm test -- coordinateAlignment`
Expected: FAIL — cannot find module `../../src/serialization/coordinateAlignment`.

- [ ] **Step 3: Implement `parsePageTranslate`**

Create `shared/src/serialization/coordinateAlignment.ts`:

```typescript
/**
 * Reconcile LucidChart `getSvg()` output with the engine's layout coordinates.
 *
 * `getSvg()` draws shapes at their raw model coordinates but wraps the whole
 * page in `<g transform="translate(Tx Ty)" lucid:page-tab-id=...>` to normalize
 * the page (which may extend to negative coordinates) into a positive viewBox.
 * `layout.json` uses the raw model coordinates with no such shift, so the
 * background and the skeleton/entities end up offset by (Tx, Ty) in the viewer.
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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd shared && npm test -- coordinateAlignment`
Expected: PASS (6 `parsePageTranslate` tests).

- [ ] **Step 5: Commit**

```bash
cd /c/_source/quodsi/quodsi_lucidchart_package
test "$(git symbolic-ref --short HEAD)" = "fix/svg-layout-coordinate-alignment" || { echo "WRONG BRANCH"; exit 1; }
git add shared/src/serialization/coordinateAlignment.ts shared/tests/serialization/coordinateAlignment.test.ts
git commit -m "feat(shared): parsePageTranslate — read getSvg page-translate"
```

---

## Task 2: `offsetSerializedModelCoordinates` helper

**Files:**
- Modify: `shared/src/serialization/coordinateAlignment.ts`
- Test: `shared/tests/serialization/coordinateAlignment.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `shared/tests/serialization/coordinateAlignment.test.ts`:

```typescript
import { offsetSerializedModelCoordinates } from '../../src/serialization/coordinateAlignment';
import { ISerializedModel } from '../../src/serialization/interfaces/ISerializedModel';

// Minimal model exercising every coordinate the function touches. Cast through
// unknown because we only populate the layout-bearing fields under test.
function makeModel(): ISerializedModel {
  return {
    activities: [
      {
        x: 540,
        y: 160,
        connectors: [
          { sourceX: 0, sourceY: 0, targetX: 800, targetY: 220, x: 400, y: 110 },
        ],
      },
    ],
    generators: [{ x: 280, y: 160 }],
    resources: [{ x: -40, y: 260 }],
    entities: [{ x: 0, y: 0 }],
  } as unknown as ISerializedModel;
}

describe('offsetSerializedModelCoordinates', () => {
  it('shifts every layout-bearing coordinate by (dx, dy)', () => {
    const m = makeModel();
    offsetSerializedModelCoordinates(m, 500, 10);
    expect(m.activities[0].x).toBe(1040);
    expect(m.activities[0].y).toBe(170);
    const c = m.activities[0].connectors[0];
    expect(c.sourceX).toBe(500);
    expect(c.sourceY).toBe(10);
    expect(c.targetX).toBe(1300);
    expect(c.targetY).toBe(230);
    expect(c.x).toBe(900);
    expect(c.y).toBe(120);
    expect(m.generators[0].x).toBe(780);
    expect(m.resources[0].x).toBe(460);
    expect(m.resources[0].y).toBe(270);
  });

  it('leaves entities untouched (they are not laid-out shapes)', () => {
    const m = makeModel();
    offsetSerializedModelCoordinates(m, 500, 10);
    expect(m.entities[0].x).toBe(0);
    expect(m.entities[0].y).toBe(0);
  });

  it('is a no-op for (0, 0)', () => {
    const m = makeModel();
    offsetSerializedModelCoordinates(m, 0, 0);
    expect(m.activities[0].x).toBe(540);
    expect(m.resources[0].x).toBe(-40);
  });

  it('preserves relative distances between shapes', () => {
    const m = makeModel();
    const before = m.activities[0].x - m.resources[0].x;
    offsetSerializedModelCoordinates(m, 500, 10);
    expect(m.activities[0].x - m.resources[0].x).toBe(before);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd shared && npm test -- coordinateAlignment`
Expected: FAIL — `offsetSerializedModelCoordinates` is not exported.

- [ ] **Step 3: Implement `offsetSerializedModelCoordinates`**

Append to `shared/src/serialization/coordinateAlignment.ts`:

```typescript
import { ISerializedModel } from './interfaces/ISerializedModel';

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
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd shared && npm test -- coordinateAlignment`
Expected: PASS (all `parsePageTranslate` + `offsetSerializedModelCoordinates` tests).

- [ ] **Step 5: Commit**

```bash
cd /c/_source/quodsi/quodsi_lucidchart_package
test "$(git symbolic-ref --short HEAD)" = "fix/svg-layout-coordinate-alignment" || { echo "WRONG BRANCH"; exit 1; }
git add shared/src/serialization/coordinateAlignment.ts shared/tests/serialization/coordinateAlignment.test.ts
git commit -m "feat(shared): offsetSerializedModelCoordinates — shift model coords by page-translate"
```

---

## Task 3: Export the module and build shared

**Files:**
- Modify: `shared/src/serialization/index.ts`

- [ ] **Step 1: Add the export**

Open `shared/src/serialization/index.ts` and add this line alongside the existing exports:

```typescript
export * from './coordinateAlignment';
```

- [ ] **Step 2: Build shared and confirm the symbols are exported**

Run: `cd shared && npm run build`
Expected: `tsc` succeeds with no errors.

Then verify the build emitted the module:

Run: `node -e "const s=require('./shared/dist'); console.log(typeof s.parsePageTranslate, typeof s.offsetSerializedModelCoordinates)"` (from repo root)
Expected: `function function`. (If `./shared/dist` is not the package main, instead confirm `shared/dist/serialization/coordinateAlignment.js` exists.)

- [ ] **Step 3: Commit**

```bash
cd /c/_source/quodsi/quodsi_lucidchart_package
test "$(git symbolic-ref --short HEAD)" = "fix/svg-layout-coordinate-alignment" || { echo "WRONG BRANCH"; exit 1; }
git add shared/src/serialization/index.ts
git commit -m "feat(shared): export coordinateAlignment helpers"
```

---

## Task 4: Wire the alignment into `simulationHandler.ts`

**Files:**
- Modify: `editorextensions/quodsi_editor_extension/src/core/messaging/handlers/simulationHandler.ts`

The relevant region: `const diagramSvg = await activePageProxy.getSvg(undefined, true);` (~line 333) is captured *after* `const serializedModel = serializer.serialize(modelDefinition);` (~line 303), and `serializedModel` + `diagramSvg` are both submitted via `LucidDataActionUtility.performDataAction(...)` (~line 385). The offset must happen after the SVG is captured and before submission.

- [ ] **Step 1: Import the helpers**

Add `parsePageTranslate` and `offsetSerializedModelCoordinates` to the existing `@quodsi/shared` import in the file (match the file's existing import style; the file already imports shared symbols such as `ModelSerializerFactory`). For example:

```typescript
import { parsePageTranslate, offsetSerializedModelCoordinates } from '@quodsi/shared';
```

- [ ] **Step 2: Apply the offset after `getSvg()`**

Immediately after:

```typescript
      const diagramSvg = await activePageProxy.getSvg(undefined, true);
      console.log('[SimulationHandler] SVG obtained successfully');
```

insert:

```typescript
      // getSvg() wraps the page in a translate() to normalize negative
      // coordinates into a positive viewBox. layout.json uses the raw model
      // coordinates, so align the serialized model into the SVG's frame by
      // applying the same page-translate. Keeps the SVG and skeleton/entities
      // in one coordinate space; a {0,0} translate is a no-op.
      const pageTranslate = parsePageTranslate(diagramSvg);
      if (pageTranslate.x !== 0 || pageTranslate.y !== 0) {
        offsetSerializedModelCoordinates(serializedModel, pageTranslate.x, pageTranslate.y);
        console.log('[SimulationHandler] Aligned model coords to SVG page-translate', pageTranslate);
      }
```

- [ ] **Step 3: Build the extension to confirm it compiles**

Run (from repo root): `npm run build -w @quodsi/shared && npm run bundle`
Expected: shared builds, then the extension bundles with no TypeScript errors. (If `npm run bundle` is unavailable in this environment, compile the extension via its own `tsc`/build script; the goal is a clean typecheck of the edited file.)

- [ ] **Step 4: Commit**

```bash
cd /c/_source/quodsi/quodsi_lucidchart_package
test "$(git symbolic-ref --short HEAD)" = "fix/svg-layout-coordinate-alignment" || { echo "WRONG BRANCH"; exit 1; }
git add editorextensions/quodsi_editor_extension/src/core/messaging/handlers/simulationHandler.ts
git commit -m "fix(extension): align serialized model coords to getSvg page-translate"
```

---

## Task 5: Verify (assumption + build + manual)

**Files:** none (verification only).

- [ ] **Step 1: Confirm shifting coordinates can't change simulation results**

The fix shifts the coordinates sent to the engine. Confirm the engine's *simulation* logic never reads shape `x,y` (they should feed only layout/animation). From the engine repo:

Run: `cd /c/_source/quodsi/quodsim && grep -rn "\.x\b\|\.y\b" quodsim/simulation/`
Expected: no positional/coordinate logic — matches should be unrelated (loop vars, attributes, etc.), with routing driven by connectors/IDs/weights. (Even if coordinates were read, a *uniform* translation preserves all relative geometry, so distance-based logic would be unaffected; only absolute-coordinate logic — which a DES engine should not have — would be a concern. If any such logic is found, STOP and reconsider.)

- [ ] **Step 2: Full shared test suite (no regressions)**

Run: `cd shared && npm test`
Expected: all shared tests pass, including the new `coordinateAlignment` suite.

- [ ] **Step 3: Manual end-to-end check in Lucid → Studio**

- Rebuild + upload the extension package for the target environment:
  `./deploy/lucid-package/build-bundle.ps1 -TargetEnvironment <env>` → upload `package.zip` to the LucidChart developer portal.
- Open the model that reproduced the bug (the one with Resource1 at x=−40), re-run a scenario with animation, open the animation in Studio.
- Confirm: the skeleton/entities now align with the SVG background (no horizontal offset).
- Regression: open/re-run a model whose page already starts near origin → confirm no shift introduced (alignment unchanged).

- [ ] **Step 4: Finish the branch**

Announce and use **superpowers:finishing-a-development-branch** (this repo only: `quodsi_lucidchart_package`, branch `fix/svg-layout-coordinate-alignment`, base `main`). Present the standard options; do not push without explicit user approval.

---

## Notes / gotchas
- **Single-repo change:** no engine, no Studio SPA, no monorepo change. Deploy = rebuild Lucid package + portal upload.
- **`{0,0}` is always safe:** if `getSvg` ever stops adding a page-translate (page already 0-origin) or uses a `matrix(...)`, `parsePageTranslate` returns `{0,0}` and nothing is shifted — current behavior for already-aligned pages.
- **Don't touch the SVG or Lucid shapeData:** only the in-memory `serializedModel` (the run payload) is shifted.
- **Connectors live under `activities[].connectors[]`** in the serialized model (no top-level connectors array; generator `exitConnector` is an id string, not a coordinate-bearing object).
