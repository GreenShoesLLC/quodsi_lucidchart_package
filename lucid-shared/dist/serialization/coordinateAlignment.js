"use strict";
/**
 * Reconcile LucidChart `getSvg()` output with the engine's layout coordinates.
 *
 * `getSvg()` draws shapes at their raw model coordinates but wraps the whole
 * page in `<g transform="translate(Tx Ty)" lucid:page-tab-id=...>` to normalize
 * the page (which may extend to negative coordinates) into a positive viewBox.
 * `layout.json` uses the raw model coordinates with no such shift, so the
 * background and the skeleton/entities end up offset by (Tx, Ty) in the viewer.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.offsetSerializedModelCoordinates = exports.parsePageTranslate = void 0;
/**
 * Extract the page group's `translate(Tx Ty)` from a `getSvg()` SVG string.
 * Returns {0,0} when there is no page group, no translate, or a non-translate
 * (e.g. matrix) transform — all safe no-ops that leave coordinates unchanged.
 */
function parsePageTranslate(svg) {
    var none = { x: 0, y: 0 };
    if (!svg)
        return none;
    // Isolate the page group's opening tag (the <g> carrying lucid:page-tab-id),
    // independent of attribute order.
    var groupTag = svg.match(/<g\b[^>]*\blucid:page-tab-id\b[^>]*>/);
    if (!groupTag)
        return none;
    // Pull a translate(tx[, ty]) out of that tag. A matrix()/other transform
    // simply won't match, leaving the safe {0,0} no-op.
    var t = groupTag[0].match(/\btranslate\(\s*(-?\d*\.?\d+)(?:[\s,]+(-?\d*\.?\d+))?\s*\)/);
    if (!t)
        return none;
    return { x: parseFloat(t[1]), y: t[2] !== undefined ? parseFloat(t[2]) : 0 };
}
exports.parsePageTranslate = parsePageTranslate;
/**
 * Add (dx, dy) to every layout-bearing coordinate in the serialized model:
 * activities, generators, resources, and each activity's connectors
 * (source/target/midpoint). Entities are not laid out as shapes and are left
 * untouched. Mutates `model` in place; a (0,0) shift is a no-op. This is a
 * uniform translation, so relative geometry — and the simulation — is unchanged.
 */
function offsetSerializedModelCoordinates(model, dx, dy) {
    var _a, _b, _c, _d;
    if (dx === 0 && dy === 0)
        return;
    for (var _i = 0, _e = (_a = model.activities) !== null && _a !== void 0 ? _a : []; _i < _e.length; _i++) {
        var a = _e[_i];
        a.x += dx;
        a.y += dy;
        for (var _f = 0, _g = (_b = a.connectors) !== null && _b !== void 0 ? _b : []; _f < _g.length; _f++) {
            var c = _g[_f];
            c.sourceX += dx;
            c.sourceY += dy;
            c.targetX += dx;
            c.targetY += dy;
            c.x += dx;
            c.y += dy;
        }
    }
    for (var _h = 0, _j = (_c = model.generators) !== null && _c !== void 0 ? _c : []; _h < _j.length; _h++) {
        var g = _j[_h];
        g.x += dx;
        g.y += dy;
    }
    for (var _k = 0, _l = (_d = model.resources) !== null && _d !== void 0 ? _d : []; _k < _l.length; _k++) {
        var r = _l[_k];
        r.x += dx;
        r.y += dy;
    }
}
exports.offsetSerializedModelCoordinates = offsetSerializedModelCoordinates;
