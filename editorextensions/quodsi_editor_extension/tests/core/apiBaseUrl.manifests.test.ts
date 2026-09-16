// tests/core/apiBaseUrl.manifests.test.ts
//
// API_URL_BY_PACKAGE_ID must agree with the environment manifests: for each
// manifest_<env>.json whose package id is mapped, the mapped origin is that
// manifest's data-connector callbackBaseUrl minus its trailing `/lucid/`.
// Otherwise the compiled Studies/Advisor modals (REST) and the data connector
// would talk to different APIs.
//
// Only the environment manifests build-bundle.ps1 packages are checked.
// manifest.json / manifest_local.json reuse the dev package id but point the
// data connector at localhost for local test mode (the modals get localhost
// from local-api-url.txt instead), and `manifest copy.json` is a scratch file.
// Version stamps in the working tree do not touch the fields read here.

import * as fs from 'fs';
import * as path from 'path';
import { API_URL_BY_PACKAGE_ID } from '../../src/core/apiBaseUrl';

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const ENV_MANIFESTS = ['manifest_dev.json', 'manifest_test.json', 'manifest_prod.json'];

interface Manifest {
  id: string;
  dataConnectors?: Array<{ name: string; callbackBaseUrl: string }>;
}

function read(file: string): Manifest {
  return JSON.parse(fs.readFileSync(path.join(REPO_ROOT, file), 'utf8'));
}

function apiOrigin(m: Manifest): string {
  const dc = m.dataConnectors?.find((d) => d.name === 'quodsi_api_data_connector');
  if (!dc) throw new Error(`manifest ${m.id} has no quodsi_api_data_connector`);
  expect(dc.callbackBaseUrl).toMatch(/\/lucid\/$/);
  return dc.callbackBaseUrl.replace(/\/lucid\/$/, '');
}

describe('API_URL_BY_PACKAGE_ID vs the environment manifests', () => {
  const manifests = ENV_MANIFESTS.map((f) => [f, read(f)] as const);

  it.each(manifests.filter(([, m]) => m.id in API_URL_BY_PACKAGE_ID))(
    '%s: the mapped API origin is its callbackBaseUrl minus /lucid/',
    (_file, m) => {
      expect(API_URL_BY_PACKAGE_ID[m.id]).toBe(apiOrigin(m));
    },
  );

  it('every mapped package id belongs to an environment manifest', () => {
    const ids = new Set(manifests.map(([, m]) => m.id));
    for (const id of Object.keys(API_URL_BY_PACKAGE_ID)) expect(ids).toContain(id);
  });
});
