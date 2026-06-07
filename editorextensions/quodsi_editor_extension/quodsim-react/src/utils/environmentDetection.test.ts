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
  // Current backends: dev + test are Azure Container Apps
  // (ca-quodsi-{env}-api.*.azurecontainerapps.io); prod is still legacy
  // Azure Functions (prd-quodsi-func-v1.azurewebsites.net).
  it('detects Test from the Container App test URL', () => {
    withApiUrl(
      'https://ca-quodsi-test-api.thankfulground-d7c463a0.eastus2.azurecontainerapps.io/lucid/',
      () => expect(detectEnvironment()).toBe('Test'),
    );
  });

  it('detects Dev from the Container App dev URL', () => {
    withApiUrl(
      'https://ca-quodsi-dev-api.niceisland-1fa2af68.eastus2.azurecontainerapps.io/lucid/',
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
