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
  if (apiUrl.includes('dev-quodsi-func') || apiUrl.includes('dev-')) {
    return 'Dev';
  }
  if (apiUrl.includes('tst-quodsi-func') || apiUrl.includes('tst-')) {
    return 'Test';
  }
  if (apiUrl.includes('prd-quodsi-func') || apiUrl.includes('prd-')) {
    return 'Prod';
  }

  return 'Unknown';
}
