export type Environment = 'Local' | 'Dev' | 'Test' | 'Prod' | 'Unknown';

/**
 * Detects the current environment based on the API URL.
 * Parses VITE_DATA_CONNECTOR_API_URL to determine which environment
 * the application is connected to.
 *
 * @returns The detected environment name
 */
export function detectEnvironment(): Environment {
  const apiUrl = import.meta.env.VITE_DATA_CONNECTOR_API_URL || '';

  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    return 'Local';
  }
  // Every environment is an Azure Container App (ca-quodsi{m}-{env}-api.*.azurecontainerapps.io);
  // prd's manifest calls it by its custom domain, api.quodsi.com, since
  // 2026-11-08. The `*-quodsi-func` names are the retired Azure Functions
  // backends, kept so an old URL still labels correctly. Match the stable
  // `-{env}-api` host segment AND the legacy name so the label is correct on
  // both the legacy `ca-quodsi-{env}-api` estate and the quodsim-tenant
  // `ca-quodsim-{env}-api` estate (2026-07 tenant cutover). (The old loose
  // `dev-`/`tst-` substrings were why Test showed as Unknown: the test URL
  // contains `test`, not `tst`.)
  if (apiUrl.includes('-dev-api') || apiUrl.includes('dev-quodsi-func')) {
    return 'Dev';
  }
  if (apiUrl.includes('-test-api') || apiUrl.includes('tst-quodsi-func')) {
    return 'Test';
  }
  if (apiUrl.includes('-prd-api') || apiUrl.includes('prd-quodsi-func') || apiUrl.startsWith('https://api.quodsi.com/')) {
    return 'Prod';
  }

  return 'Unknown';
}
