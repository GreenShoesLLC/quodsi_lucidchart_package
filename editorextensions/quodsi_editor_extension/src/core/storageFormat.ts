/**
 * Lucid-local storage-format stamp (page shapeData `q_lucid_format`).
 * Independent of MODEL_SCHEMA_VERSION (the engine wire): this number only
 * says how the extension laid data out on the page.
 *
 *   (absent) / 1  resources stored on Resource blocks' q_data and inline in
 *                 q_swimlane lanes
 *   2             resources stored in page `q_resources`; blocks and lanes
 *                 hold pointers (Plan 2b, 2026-08-23)
 *
 * ModelManager refuses to open a document stamped HIGHER than this (a newer
 * extension wrote it) and migrates anything lower or unstamped.
 */
export const LUCID_STORAGE_FORMAT = 2;

export class StorageFormatTooNewError extends Error {
    constructor(public readonly documentFormat: number) {
        super(
            `This document was saved by a newer version of the Quodsi extension ` +
            `(storage format ${documentFormat}; this version reads up to ${LUCID_STORAGE_FORMAT}). ` +
            `Update the Quodsi extension to open it.`
        );
        this.name = 'StorageFormatTooNewError';
    }
}
