// The minimum MODEL_SCHEMA_VERSION the LucidChart bundle is allowed to ship.
//
// The bundle resolves @quodsi/shared through the `file:../../quodsi_shared`
// symlink at BUILD time, so it stamps whatever version the monorepo checkout
// on disk happens to carry. Bundling from a stale checkout ships documents at
// an old version that the engine cleanly rejects - a silent failure that only
// surfaces at run submission. build-bundle.ps1 rebuilds @quodsi/shared before
// bundling (Step 1.45); this constant is the assertion that step lacked.
//
// 2026.08.20 is the flat-connectors boundary (spec 2026-08-06
// flat-canonicalization), and is also where the API's stamp-if-absent backstop
// sits (quodsi_api/app/services/schema_stamp.py). Raising this to the
// clean-wire boundary 2026.11.01 is stricter and desirable, but it is a
// deploy-ordering decision - the engine image must lead. See ClickUp 86e2p4prk.
import { compareVersions, isValidVersion } from '@quodsi/shared';

export const LUCID_MIN_MODEL_SCHEMA_VERSION = '2026.08.20';

/**
 * Throws if `version` is malformed or older than the floor. Called by the
 * bundle pipeline so a stale checkout fails the build instead of shipping.
 */
export function assertPackagedSchemaVersion(version: string): void {
    if (!isValidVersion(version)) {
        throw new Error(
            `Packaged MODEL_SCHEMA_VERSION "${version}" is not a valid version string.`
        );
    }
    if (compareVersions(version, LUCID_MIN_MODEL_SCHEMA_VERSION) < 0) {
        throw new Error(
            `Packaged MODEL_SCHEMA_VERSION "${version}" is below the required floor ` +
            `"${LUCID_MIN_MODEL_SCHEMA_VERSION}". The monorepo checkout at ` +
            `../../quodsi_shared is stale - pull it and rebuild before bundling.`
        );
    }
}
