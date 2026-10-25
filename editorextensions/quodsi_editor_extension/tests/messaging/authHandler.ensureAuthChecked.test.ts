// ensureAuthChecked is how the panel starts sign-in: it runs as soon as the
// panel's HTML arrives (the boot message), again at frameLoaded, and again at
// every REACT_APP_READY. getOAuthToken has no silent mode -- with no token it
// opens Lucid's sign-in dialog -- so once a check has come back empty (the
// user cancelled, or signed out) the later triggers must not prompt again.
// Only the Sign In button (AUTH_REQUIRED) does.
import { EnvelopeMessageType } from '@quodsi/lucid-shared';

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({ router: { send: sendMock } }));

const client = {
  getOAuthToken: jest.fn(),
  oauthXhr: jest.fn(),
  revokeOAuthToken: jest.fn(async () => true),
  clearOAuthToken: jest.fn(async () => true),
  performDataAction: jest.fn(async () => ({ status: 200, json: {} })),
};
jest.mock('../../src/core/ModelManager', () => ({ ModelManager: { getClient: () => client } }));

import { AuthHandler } from '../../src/core/messaging/handlers/authHandler';

function jwt(claims: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(claims)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `h.${b64}.s`;
}
const TOKEN = jwt({ sub: 'u1', iss: 'https://x.kinde.com', org_code: 'org_a' });
const profile = { responseText: JSON.stringify({ email: 'd@example.com', name: 'Dan' }) };

const lastAuthStatus = () => {
  const calls = sendMock.mock.calls.filter((c) => c[1]?.type === EnvelopeMessageType.AUTH_STATUS);
  return calls[calls.length - 1]?.[1].data;
};
const msg = (type: EnvelopeMessageType) =>
  ({ id: 'm1', type, source: 'model-iframe', target: 'host', version: '1.0' }) as any;
const flush = () => new Promise((r) => setImmediate(r));

beforeEach(() => {
  sendMock.mockClear();
  client.getOAuthToken.mockReset();
  client.oauthXhr.mockReset().mockResolvedValue(profile);
  AuthHandler.resetForTests();
});

describe('AuthHandler.ensureAuthChecked', () => {
  it('asks Lucid on the first trigger', async () => {
    client.getOAuthToken.mockResolvedValue(TOKEN);
    await AuthHandler.ensureAuthChecked();
    expect(client.getOAuthToken).toHaveBeenCalledTimes(1);
    expect(lastAuthStatus()).toMatchObject({ isAuthenticated: true });
  });

  it('joins a check already in flight (boot, frameLoaded and ready share one call)', async () => {
    let release!: (t: string) => void;
    client.getOAuthToken.mockImplementation(() => new Promise<string>((r) => { release = r; }));
    const boot = AuthHandler.ensureAuthChecked();
    const loaded = AuthHandler.ensureAuthChecked();
    const ready = AuthHandler.ensureAuthChecked();
    release(TOKEN);
    await Promise.all([boot, loaded, ready]);
    expect(client.getOAuthToken).toHaveBeenCalledTimes(1);
  });

  it('after a check came back empty, later triggers re-send "signed out" without prompting', async () => {
    client.getOAuthToken.mockResolvedValue(null);
    await AuthHandler.ensureAuthChecked(); // user cancelled the dialog
    sendMock.mockClear();
    await AuthHandler.ensureAuthChecked(); // REACT_APP_READY / a modal opens
    expect(client.getOAuthToken).toHaveBeenCalledTimes(1);
    expect(lastAuthStatus()).toMatchObject({ isAuthenticated: false });
  });

  it('a failed check counts as empty too', async () => {
    client.getOAuthToken.mockRejectedValue(new Error('boom'));
    await AuthHandler.ensureAuthChecked();
    await AuthHandler.ensureAuthChecked();
    expect(client.getOAuthToken).toHaveBeenCalledTimes(1);
  });

  it('Sign In still asks Lucid after an empty check, and a success re-enables later checks', async () => {
    client.getOAuthToken.mockResolvedValueOnce(null).mockResolvedValue(TOKEN);
    await AuthHandler.ensureAuthChecked();
    AuthHandler.handleMessage(msg(EnvelopeMessageType.AUTH_REQUIRED));
    await flush();
    expect(client.getOAuthToken).toHaveBeenCalledTimes(2);
    expect(AuthHandler.getIsAuthenticated()).toBe(true);
    await AuthHandler.ensureAuthChecked();
    expect(client.getOAuthToken).toHaveBeenCalledTimes(3);
  });

  it('a cancelled Sign In stops later triggers from prompting', async () => {
    client.getOAuthToken.mockResolvedValue(null);
    AuthHandler.handleMessage(msg(EnvelopeMessageType.AUTH_REQUIRED));
    await flush();
    await AuthHandler.ensureAuthChecked();
    expect(client.getOAuthToken).toHaveBeenCalledTimes(1);
  });

  it('after sign-out, later triggers do not prompt', async () => {
    client.getOAuthToken.mockResolvedValue(TOKEN);
    await AuthHandler.ensureAuthChecked();
    AuthHandler.handleMessage(msg(EnvelopeMessageType.AUTH_LOGOUT));
    await flush();
    await AuthHandler.ensureAuthChecked();
    expect(client.getOAuthToken).toHaveBeenCalledTimes(1);
    expect(lastAuthStatus()).toMatchObject({ isAuthenticated: false });
  });
});
