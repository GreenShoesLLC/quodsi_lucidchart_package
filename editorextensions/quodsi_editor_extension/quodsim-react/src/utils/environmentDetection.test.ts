import { detectEnvironment } from './environmentDetection';

const KEY = 'REACT_APP_DATA_CONNECTOR_API_URL';

function withApiUrl(url: string | undefined, fn: () => void) {
  const prev = process.env[KEY];
  if (url === undefined) delete process.env[KEY];
  else process.env[KEY] = url;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env[KEY];
    else process.env[KEY] = prev;
  }
}

describe('detectEnvironment', () => {
  // Current backends: dev + test are Azure Container Apps; prod is still legacy
  // Azure Functions (prd-quodsi-func-v1.azurewebsites.net). Detection matches
  // the `-{env}-api` host segment so BOTH the legacy `ca-quodsi-{env}-api`
  // estate and the quodsim-tenant `ca-quodsim-{env}-api` estate (2026-07 tenant
  // cutover) resolve correctly.
  it('detects Test from the legacy Container App test URL', () => {
    withApiUrl(
      'https://ca-quodsi-test-api.thankfulground-d7c463a0.eastus2.azurecontainerapps.io/lucid/',
      () => expect(detectEnvironment()).toBe('Test'),
    );
  });

  it('detects Dev from the legacy Container App dev URL', () => {
    withApiUrl(
      'https://ca-quodsi-dev-api.niceisland-1fa2af68.eastus2.azurecontainerapps.io/lucid/',
      () => expect(detectEnvironment()).toBe('Dev'),
    );
  });

  it('detects Test from the quodsim-tenant Container App test URL', () => {
    withApiUrl(
      'https://ca-quodsim-test-api.ambitiouspond-d8683d4f.westus.azurecontainerapps.io/lucid/',
      () => expect(detectEnvironment()).toBe('Test'),
    );
  });

  it('detects Dev from the quodsim-tenant Container App dev URL', () => {
    withApiUrl(
      'https://ca-quodsim-dev-api.nicesand-882b0444.westus.azurecontainerapps.io/lucid/',
      () => expect(detectEnvironment()).toBe('Dev'),
    );
  });

  it('detects Prod from the legacy Azure Functions URL', () => {
    withApiUrl('https://prd-quodsi-func-v1.azurewebsites.net/api/', () =>
      expect(detectEnvironment()).toBe('Prod'),
    );
  });

  it('detects Local from a localhost URL', () => {
    withApiUrl('http://localhost:7071/api/dataConnector/', () =>
      expect(detectEnvironment()).toBe('Local'),
    );
  });

  it('returns Unknown for an unrecognized URL', () => {
    withApiUrl('https://example.com/', () => expect(detectEnvironment()).toBe('Unknown'));
  });
});
