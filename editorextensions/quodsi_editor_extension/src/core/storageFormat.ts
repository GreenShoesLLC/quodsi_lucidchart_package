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

/** A Marketplace user cannot update the extension by hand; Lucid does it. */
export const EXTENSION_UPDATE_ADVICE =
    'Lucid updates the Quodsi extension automatically; open this document again after it has updated.';

export class StorageFormatTooNewError extends Error {
    constructor(public readonly documentFormat: number) {
        super(
            `This document was saved by a newer version of the Quodsi extension ` +
            `(storage format ${documentFormat}; this version reads up to ${LUCID_STORAGE_FORMAT}). ` +
            EXTENSION_UPDATE_ADVICE
        );
        this.name = 'StorageFormatTooNewError';
    }
}

/**
 * The page's model schema version (q_data `version`) is strictly newer than
 * this build's MODEL_SCHEMA_VERSION: a newer extension saved it.
 */
export class ModelSchemaTooNewError extends Error {
    constructor(
        public readonly documentVersion: string,
        public readonly packageVersion: string
    ) {
        super(
            `This document was saved with a newer Quodsi model version ` +
            `(${documentVersion}; this version reads up to ${packageVersion}). ` +
            EXTENSION_UPDATE_ADVICE
        );
        this.name = 'ModelSchemaTooNewError';
    }
}
