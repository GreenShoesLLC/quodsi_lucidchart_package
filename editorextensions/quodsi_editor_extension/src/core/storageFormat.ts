import type { PageProxy } from 'lucid-extension-sdk';
import { compareVersions, MODEL_SCHEMA_VERSION } from '@quodsi/lucid-shared';
import type { StorageAdapter } from './StorageAdapter';
import { LucidPreflightChecker } from '../versioning/LucidPreflightChecker';

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

/**
 * The ONE forward-guard check (spec D2), shared by ModelManager's open path
 * and every write entry point, the page conversion service and the paste
 * normalizer. A page stamped with a newer storage format, or carrying a
 * well-formed model schema version strictly newer than this build's, was
 * written by a newer extension: nothing may be built from it or written to
 * it. Absent or unparseable versions are NOT too new. Returns the error to
 * refuse with, or null.
 */
export function pageTooNewError(
    storageAdapter: StorageAdapter,
    page: PageProxy
): StorageFormatTooNewError | ModelSchemaTooNewError | null {
    const format = storageAdapter.getStorageFormat(page);
    if (format !== null && format > LUCID_STORAGE_FORMAT) {
        return new StorageFormatTooNewError(format);
    }
    const pageVersion = new LucidPreflightChecker().getPageVersion(page);
    if (
        typeof pageVersion === 'string' &&
        /^\d+(\.\d+)+$/.test(pageVersion) &&
        compareVersions(pageVersion, MODEL_SCHEMA_VERSION) > 0
    ) {
        return new ModelSchemaTooNewError(pageVersion, MODEL_SCHEMA_VERSION);
    }
    return null;
}
