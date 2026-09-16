// tests/core/apiBaseUrl.test.ts
//
// getApiBaseUrl() resolves the quodsi_api origin the compiled Studies and
// Advisor modals call. Same resolution order as authHandler.getStudioBaseUrl:
// the webpack-injected __LOCAL_API_OVERRIDE__ (local-api-url.txt) first, then
// the per-package-id map, else undefined. Both globals are read at call time,
// so each test sets the ones it needs.

import { getApiBaseUrl } from '../../src/core/apiBaseUrl';

const g = globalThis as any;

beforeEach(() => {
  g.__LOCAL_API_OVERRIDE__ = '';
  delete g.lucid;
});

afterAll(() => {
  delete g.lucid;
});

describe('getApiBaseUrl', () => {
  it('prefers the local override', () => {
    g.__LOCAL_API_OVERRIDE__ = 'http://localhost:8000';
    g.lucid = { getPackageId: () => '29e0d321-5cb2-4ae0-a1b6-dabd512c098c' };
    expect(getApiBaseUrl()).toBe('http://localhost:8000');
  });

  it('maps the dev package id to the dev API', () => {
    g.lucid = { getPackageId: () => '29e0d321-5cb2-4ae0-a1b6-dabd512c098c' };
    expect(getApiBaseUrl()).toBe('https://ca-quodsim-dev-api.nicesand-882b0444.westus.azurecontainerapps.io');
  });

  it('maps the test package id to the test API', () => {
    g.lucid = { getPackageId: () => 'dcde0747-95a4-4bf8-9e17-b4cf41afa1c7' };
    expect(getApiBaseUrl()).toBe('https://ca-quodsim-test-api.ambitiouspond-d8683d4f.westus.azurecontainerapps.io');
  });

  it('returns undefined for an unmapped package id (prod has no estate yet)', () => {
    g.lucid = { getPackageId: () => 'd38c7ced-35e8-4962-a622-1d3fa480ab58' };
    expect(getApiBaseUrl()).toBeUndefined();
  });

  it('returns undefined when the lucid global is missing', () => {
    expect(getApiBaseUrl()).toBeUndefined();
  });
});
