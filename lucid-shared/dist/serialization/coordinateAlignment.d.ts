/**
 * Reconcile LucidChart `getSvg()` output with the engine's layout coordinates.
 *
 * `getSvg()` draws shapes at their raw model coordinates but wraps the whole
 * page in `<g transform="translate(Tx Ty)" lucid:page-tab-id=...>` to normalize
 * the page (which may extend to negative coordinates) into a positive viewBox.
 * `layout.json` uses the raw model coordinates with no such shift, so the
 * background and the skeleton/entities end up offset by (Tx, Ty) in the viewer.
 */
import { ISerializedModel } from './interfaces/ISerializedModel';
export interface PageTranslate {
    x: number;
    y: number;
}
/**
 * Extract the page group's `translate(Tx Ty)` from a `getSvg()` SVG string.
 * Returns {0,0} when there is no page group, no translate, or a non-translate
 * (e.g. matrix) transform — all safe no-ops that leave coordinates unchanged.
 */
export declare function parsePageTranslate(svg: string): PageTranslate;
/**
 * Add (dx, dy) to every layout-bearing coordinate in the serialized model:
 * activities, generators, resources, and each activity's connectors
 * (source/target/midpoint). Entities are not laid out as shapes and are left
 * untouched. Mutates `model` in place; a (0,0) shift is a no-op. This is a
 * uniform translation, so relative geometry — and the simulation — is unchanged.
 */
export declare function offsetSerializedModelCoordinates(model: ISerializedModel, dx: number, dy: number): void;
//# sourceMappingURL=coordinateAlignment.d.ts.map