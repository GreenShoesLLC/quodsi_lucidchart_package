// Product analytics fire from panel init (SelectionHandler.setDocumentContext →
// fireModelOpenedIfNew) BEFORE Kinde auth. Every data action first runs the
// 2025 "temporary workaround" oauthXhr('lucid', folders/search); for a local
// package (extensionId __local__) that Lucid-provider OAuth fails, and Lucid
// then suppresses the Kinde flow — no auto sign-in, dead Sign-in click
// (2026-08-27). Events raised before auth must wait for auth-ready.
(globalThis as any).__LOCAL_STUDIO_OVERRIDE__ = '';
const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({ router: { send: sendMock } }));
const client = {
  getOAuthToken: jest.fn(),
  oauthXhr: jest.fn(async () => ({ responseText: '{}' })),
  performDataAction: jest.fn(async () => ({ status: 200, json: {} })),
};
jest.mock('../../src/core/ModelManager', () => ({ ModelManager: { getClient: () => client } }));

import { AuthHandler } from '../../src/core/messaging/handlers/authHandler';
import { AnalyticsHandler } from '../../src/core/messaging/handlers/analyticsHandler';
import { LucidDataActionUtility } from '../../src/utils/LucidDataActionUtility';

function jwt(claims: Record<string, unknown>): string {
  const b64 = Buffer.from(JSON.stringify(claims)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `h.${b64}.s`;
}

beforeEach(() => {
  jest.clearAllMocks();
  (AuthHandler as any).resetForTests();
  LucidDataActionUtility.resetOauthTriggerStatus();
  AnalyticsHandler.initialize(client as any);
});

describe('AnalyticsHandler before auth', () => {
  it('performs no data action and never triggers the lucid OAuth workaround while signed out', () => {
    AnalyticsHandler.fire('model_opened', { model_id: 'm1' });
    expect(client.performDataAction).not.toHaveBeenCalled();
    expect(client.oauthXhr).not.toHaveBeenCalled();
  });

  it('sends the deferred event once auth is established', async () => {
    AnalyticsHandler.fire('model_opened', { model_id: 'm1' });
    client.getOAuthToken.mockResolvedValue(jwt({ sub: 'u1', iss: 'https://x.kinde.com' }));
    await AuthHandler.checkCachedAuth();
    const trackCalls = (client.performDataAction.mock.calls as any[][]).filter((c) => c[0]?.actionName === 'TrackEvent');
    expect(trackCalls).toHaveLength(1);
    expect(trackCalls[0][0].actionData).toMatchObject({ event: 'model_opened', properties: { model_id: 'm1' } });
  });
});

describe('LucidDataActionUtility before auth', () => {
  it('skips the lucid OAuth workaround while signed out', async () => {
    await LucidDataActionUtility.performDataAction(client, {
      dataConnectorName: 'quodsi_api_data_connector', actionName: 'X', actionData: {}, asynchronous: false,
    });
    expect(client.oauthXhr).not.toHaveBeenCalled();
    expect(client.performDataAction).toHaveBeenCalledTimes(1);
  });
});
