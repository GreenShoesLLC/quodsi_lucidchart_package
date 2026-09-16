/**
 * Map from Lucid package ID (from `lucid.getPackageId()`) to the quodsi_api
 * origin for that environment. The compiled Studies and Advisor modals
 * (quodsim-react ?view=studies|advisor) call quodsi_api directly and receive
 * this origin on their URL.
 *
 * Package IDs are the `id` field of each manifest_*.json (see
 * authHandler.ts's STUDIO_URL_BY_PACKAGE_ID):
 *   - 29e0d321-… = QuodsiDev  → ca-quodsim-dev-api
 *   - dcde0747-… = QuodsiTest → ca-quodsim-test-api
 * Prod is deliberately absent: no prod Azure estate exists yet, so the prod
 * package resolves `undefined` and the modal shows "not configured".
 */
// Exported for tests/core/apiBaseUrl.manifests.test.ts, which pins each entry
// to its environment manifest's data-connector callbackBaseUrl.
export const API_URL_BY_PACKAGE_ID: Readonly<Record<string, string>> = {
  '29e0d321-5cb2-4ae0-a1b6-dabd512c098c': 'https://ca-quodsim-dev-api.nicesand-882b0444.westus.azurecontainerapps.io',
  'dcde0747-95a4-4bf8-9e17-b4cf41afa1c7': 'https://ca-quodsim-test-api.ambitiouspond-d8683d4f.westus.azurecontainerapps.io',
};

/**
 * Resolve the quodsi_api base URL for the current environment.
 *
 * Resolution order (mirrors `getStudioBaseUrl` in authHandler.ts):
 *   1. `__LOCAL_API_OVERRIDE__` — build-time inject from `local-api-url.txt`
 *      (gitignored; e.g. `http://localhost:8000`). Non-empty only in local
 *      dev builds; see webpack.config.js `readLocalApiOverride()`.
 *   2. `API_URL_BY_PACKAGE_ID[lucid.getPackageId()]`.
 *   3. `undefined` — unknown package id, or no `lucid` global (unit tests).
 */
export function getApiBaseUrl(): string | undefined {
  if (__LOCAL_API_OVERRIDE__) {
    return __LOCAL_API_OVERRIDE__;
  }
  try {
    const packageId = lucid.getPackageId();
    return API_URL_BY_PACKAGE_ID[packageId];
  } catch {
    // lucid global isn't available in some test contexts; leave undefined.
    return undefined;
  }
}
