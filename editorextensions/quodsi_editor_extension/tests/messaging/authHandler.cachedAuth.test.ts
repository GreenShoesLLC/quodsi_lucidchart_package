// checkCachedAuth runs on EVERY panel/iframe REACT_APP_READY. Each run used to
// do getOAuthToken + a Kinde user_profile fetch through Lucid's OAuth proxy —
// slow, and repeated for every Studies/pattern/schedule modal. Pin: same
// token → no refetch; concurrent runs → one token round-trip; new token → refetch.
import { EnvelopeMessageType } from '@quodsi/lucid-shared';

// Build-time DefinePlugin constant read by getExtensionConfig(); absent under jest.
(globalThis as any).__LOCAL_STUDIO_OVERRIDE__ = '';

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({ router: { send: sendMock } }));

const client = {
  getOAuthToken: jest.fn(),
  oauthXhr: jest.fn(),
  performDataAction: jest.fn(async () => ({ status: 200, json: {} })),
};
jest.mock('../../src/core/ModelManager', () => ({ ModelManager: { getClient: () => client } }));

import { AuthHandler } from '../../src/core/messaging/handlers/authHandler';

function jwt(claims: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(claims)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `h.${b64}.s`;
}
const TOKEN_A = jwt({ sub: 'u1', iss: 'https://x.kinde.com', org_code: 'org_a' });
const TOKEN_B = jwt({ sub: 'u1', iss: 'https://x.kinde.com', org_code: 'org_b' });
const profile = { responseText: JSON.stringify({ email: 'd@example.com', name: 'Dan' }) };

const authStatusBroadcasts = () =>
  sendMock.mock.calls.filter((c) => c[1]?.type === EnvelopeMessageType.AUTH_STATUS);

beforeEach(() => {
  sendMock.mockClear();
  client.getOAuthToken.mockReset();
  client.oauthXhr.mockReset();
  (AuthHandler as any).resetForTests();
});

describe('AuthHandler.checkCachedAuth caching', () => {
  it('fetches the profile once for a token and re-broadcasts from cache on later checks', async () => {
    client.getOAuthToken.mockResolvedValue(TOKEN_A);
    client.oauthXhr.mockResolvedValue(profile);
    await AuthHandler.checkCachedAuth();
    await AuthHandler.checkCachedAuth();
    expect(client.oauthXhr).toHaveBeenCalledTimes(1);
    expect(authStatusBroadcasts()).toHaveLength(2);
    expect(authStatusBroadcasts()[1][1].data).toMatchObject({ isAuthenticated: true, user: { email: 'd@example.com' } });
  });

  it('single-flights concurrent checks: one token round-trip, one profile fetch', async () => {
    let release!: (t: string) => void;
    client.getOAuthToken.mockImplementation(() => new Promise<string>((r) => { release = r; }));
    client.oauthXhr.mockResolvedValue(profile);
    const p1 = AuthHandler.checkCachedAuth();
    const p2 = AuthHandler.checkCachedAuth();
    release(TOKEN_A);
    await Promise.all([p1, p2]);
    expect(client.getOAuthToken).toHaveBeenCalledTimes(1);
    expect(client.oauthXhr).toHaveBeenCalledTimes(1);
  });

  it('refetches the profile when the token changes', async () => {
    client.getOAuthToken.mockResolvedValueOnce(TOKEN_A).mockResolvedValueOnce(TOKEN_B);
    client.oauthXhr.mockResolvedValue(profile);
    await AuthHandler.checkCachedAuth();
    await AuthHandler.checkCachedAuth();
    expect(client.oauthXhr).toHaveBeenCalledTimes(2);
    expect(AuthHandler.getCurrentUser()?.orgCode).toBe('org_b');
  });
});
