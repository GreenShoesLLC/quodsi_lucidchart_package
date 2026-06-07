export type Environment = 'Local' | 'Dev' | 'Test' | 'Prod' | 'Unknown';

/**
 * Detects the current environment based on the API URL.
 * Parses REACT_APP_DATA_CONNECTOR_API_URL to determine which environment
 * the application is connected to.
 *
 * @returns The detected environment name
 */
export function detectEnvironment(): Environment {
  const apiUrl = process.env.REACT_APP_DATA_CONNECTOR_API_URL || '';

  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    return 'Local';
  }
  // Dev + Test are Azure Container Apps (ca-quodsi-{env}-api.*.azurecontainerapps.io)
  // since the 2026-05 Functions->Container App cutover; Prod is still legacy
  // Azure Functions ({prd}-quodsi-func-v1.azurewebsites.net). Match the stable
  // `quodsi-{env}-api` host segment AND the legacy name so the label is correct
  // on both. (The old loose `dev-`/`tst-` substrings were why Test showed as
  // Unknown: the test URL contains `test`, not `tst`.)
  if (apiUrl.includes('quodsi-dev-api') || apiUrl.includes('dev-quodsi-func')) {
    return 'Dev';
  }
  if (apiUrl.includes('quodsi-test-api') || apiUrl.includes('tst-quodsi-func')) {
    return 'Test';
  }
  if (apiUrl.includes('quodsi-prd-api') || apiUrl.includes('prd-quodsi-func')) {
    return 'Prod';
  }

  return 'Unknown';
}
