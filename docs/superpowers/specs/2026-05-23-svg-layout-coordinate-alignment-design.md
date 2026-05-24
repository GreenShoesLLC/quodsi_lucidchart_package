# SVG ↔ Layout Coordinate Alignment — Design

**Date:** 2026-05-23
**Repo:** `quodsi_lucidchart_package` (LucidChart editor extension) — **separate repo** from the `quodsi` monorepo.
**Status:** Approved (design / Approach A)

## Problem

In the Studio animation viewer, the background diagram (`diagram.svg`) is offset horizontally
from the skeleton overlay (dashed boxes) and the entity dots. The misalignment appeared after a
user added a new shape (a resource at a negative x) and re-ran the animation.

## Root cause (confirmed from a live capture)

Two artifacts produced for an animation run use **different coordinate frames**:

- **`layout.json`** (engine `quodsim`) — built from the model's shape coordinates (`x`, `y`),
  i.e. raw page/shape coordinates. The skeleton overlay and entity positions use these.
- **`diagram.svg`** (LucidChart `PageProxy.getSvg(undefined, true)`) — draws each shape at its
  raw model coordinate, **but wraps all content in a page-level group**:
  ```
  <svg viewBox="0 0 1500 500">
    <g transform="translate(500 0)" lucid:page-tab-id="0_0">
      <path d="M-500 0h1500v500H-500z" .../>   <!-- page background, left edge x=-500 -->
      <path d="M540 166 ...">                    <!-- "Process" activity, model x=540 -->
      <path d="M-40 266 ...">                    <!-- Resource1, model x=-40 -->
  ```
  `getSvg` normalizes the page (whose content — including the background — spans x = −500…1000)
  into a positive `viewBox` by shifting everything by `translate(500 0)`. The per-shape coordinates
  are correct and match the model exactly; the **page-level translate** is the only discrepancy.

The SPA overlays both in one coordinate space (it renders the SVG raw and places the skeleton at
raw layout coords), so the SVG ends up offset by the page-translate **(Tx, Ty) = (500, 0)** —
purely horizontal here. Adding the resource at x=−40 pushed the page bounds negative, which is
what introduced/changed the translate and exposed the offset.

This is **not** the engine `_viewbox()` center-vs-top-left sizing issue (that only mis-sizes the
overall viewbox, shifting skeleton + SVG together; it does not cause the *relative* offset). That
remains a separate, logged follow-up.

## Why the fix belongs in the extension

`simulationHandler.ts` is the single **producer** of both artifacts — it calls `getSvg()` and it
serializes the model (shape coordinates). It is the only place that holds both coordinate frames
at once, and it currently emits them inconsistently. Reconciling at the source fixes the issue
**once, for every consumer**, with no consumer needing to know Lucid's `getSvg` quirk.

- The engine cannot fix it (it never sees the SVG or the page-translate).
- The SPA fixing it would patch the symptom, hard-code Lucid SVG specifics into the viewer, and
  only fix that one consumer.

## Approach A — offset the emitted model coordinates by the page-translate

After capturing the SVG, parse the page group's `translate(Tx Ty)` and **add `(Tx, Ty)` to every
shape coordinate in the serialized model** before submission. The engine then builds `layout.json`
in the same frame the SVG renders in, so skeleton/entities and the SVG line up.

- **Zero SPA change, zero engine change.**
- It's a uniform translation: relative geometry and simulation results are unaffected (x,y are
  layout-only — to be verified during planning), and Lucid's stored shapeData is untouched (only
  the run payload is shifted).
- The SVG is left exactly as `getSvg` produced it.

**Direction check:** the SVG renders a shape at frame-coordinate `modelX + Tx` (drawn at internal
`modelX`, then shifted `+Tx` by the group). Shifting the emitted `modelX → modelX + Tx` makes the
layout node land at the same frame coordinate. Both then render at the same screen position. ✔

### Rejected alternatives
- **B — rewrite the SVG to a 0-origin/model-coord frame** (strip translate, adjust viewBox, handle
  clipping of now-negative content). Extension-only but SVG surgery; riskier than shifting numbers.
- **C — pass `getSvg` an explicit `viewBox` (+ `includeBackground=false`)** to control the export
  frame. Output shape is less predictable; would need empirical testing and may still leave a
  residual origin offset.

## Components

`getSvg` SDK signature (confirmed): `getSvg(items?: ItemProxy[], includeBackground?: boolean, viewBox?: Box)`.
Current call: `getSvg(undefined, true)`.

### 1. `parsePageTranslate(svg: string): { x: number; y: number }`
Pure function. Extracts the page group's translate from the SVG string.
- Targets the page wrapper `<g transform="translate(Tx Ty)" ... lucid:page-tab-id=...>`.
- Accepts `translate(500 0)`, `translate(500, 0)`, and `translate(500)` (→ y = 0); supports
  negative and decimal values.
- Returns `{ x: 0, y: 0 }` when no parseable translate is found (page already 0-origin, or the page
  group uses a `matrix(...)` transform — documented limitation; Lucid uses `translate` for the page
  group in practice). A `{0,0}` result is a safe no-op (current behavior for already-aligned pages).

### 2. `offsetSerializedModelCoordinates(model, dx, dy): void` (or returns a shifted copy)
Pure function. Adds `(dx, dy)` to every layout-bearing coordinate in the **serialized** model
(camelCase JSON):
- `activities[].x`, `.y`
- `generators[].x`, `.y`
- `resources[].x`, `.y`
- every connector's `sourceX`, `sourceY`, `targetX`, `targetY` (and `x`, `y` if present) — both
  top-level `connectors[]` and nested `activities[].connectors[]` / generator exit connectors.
- Entities (`entities[].x/y`, e.g. the 0,0 Default Entity) are **not** laid out as shapes and are
  out of scope — leave them untouched.

Both functions live in a focused, unit-tested module. Preference: place them in `@quodsi/shared`
(already Jest-tested and imported by the extension) so they're covered by the existing test runner;
the SVG-string parse is generic enough to live there. Final home confirmed in the plan.

### 3. `simulationHandler.ts` integration
After `const diagramSvg = await activePageProxy.getSvg(undefined, true);`, compute
`const { x, y } = parsePageTranslate(diagramSvg);` and, when `(x, y) !== (0, 0)`, apply
`offsetSerializedModelCoordinates(serializedModel, x, y)` before the model is submitted/uploaded.
Log the detected translate for traceability.

## Testing

**Unit (Jest):**
- `parsePageTranslate`: `translate(500 0)` → `{500,0}`; `translate(-40, 12.5)` → `{-40,12.5}`;
  `translate(500)` → `{500,0}`; SVG with no page translate → `{0,0}`; page group using
  `matrix(...)` → `{0,0}` (fallback).
- `offsetSerializedModelCoordinates`: a model with activities/generator/resource/connectors gets
  every listed coordinate shifted by `(dx,dy)`; relative distances preserved; entities untouched;
  `(0,0)` shift is a no-op.

**Integration / manual:**
- Re-run the captured model (the one with Resource1 at x=−40) in Lucid → open the animation in
  Studio → confirm the skeleton/entities now align with the SVG background.
- Re-run a model whose page already starts at origin → confirm no regression (translate `{0,0}`,
  no shift).

## Out of scope
- Engine `_viewbox()` center-vs-top-left sizing bug (separate; only affects initial fit/centering).
- Any SPA or engine change.
- Non-Lucid (Studio-native) SVG sources, if they exist — this targets the Lucid `getSvg` path.

## Deployment
Build the shared lib first (if the helpers land there), then rebuild the Lucid extension package
(`./deploy/lucid-package/build-bundle.ps1 -TargetEnvironment <env>`) and upload `package.zip` to the
LucidChart developer portal. No engine Batch redeploy and no Studio deploy are required for this fix.

## Assumption to verify in planning
Nothing in the engine's **simulation** logic reads shape `x,y` (they should be layout/animation
only). Confirm by searching the engine for x/y usage outside layout/animation before relying on the
uniform-shift being behavior-neutral.
