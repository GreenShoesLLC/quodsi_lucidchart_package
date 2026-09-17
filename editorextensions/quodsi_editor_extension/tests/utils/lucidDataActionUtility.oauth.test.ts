// The Lucid-provider OAuth workaround runs once per session before the first
// data action. Concurrent data actions share one in-flight attempt (the
// Studies open fires two at once), and a failed attempt is retried by the
// next data action rather than remembered.
import { AuthHandler } from '../../src/core/messaging/handlers/authHandler';
import { LucidDataActionUtility } from '../../src/utils/LucidDataActionUtility';

const params = { dataConnectorName: 'quodsi_api_data_connector', actionName: 'X', actionData: {}, asynchronous: false };

function makeClient() {
  return {
    oauthXhr: jest.fn(),
    performDataAction: jest.fn(async () => ({ status: 200, json: {} })),
  };
}

const flush = async () => {
  for (let i = 0; i < 10; i++) await Promise.resolve();
};

beforeEach(() => {
  LucidDataActionUtility.resetOauthTriggerStatus();
  jest.spyOn(AuthHandler, 'getIsAuthenticated').mockReturnValue(true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LucidDataActionUtility OAuth workaround', () => {
  it('concurrent data actions trigger it once, and both run only after it settles', async () => {
    const client = makeClient();
    let release!: () => void;
    client.oauthXhr.mockReturnValue(new Promise<void>((r) => { release = r; }));

    const a = LucidDataActionUtility.performDataAction(client, params);
    const b = LucidDataActionUtility.performDataAction(client, params);
    await flush();
    expect(client.oauthXhr).toHaveBeenCalledTimes(1);
    expect(client.performDataAction).not.toHaveBeenCalled();

    release();
    await Promise.all([a, b]);
    expect(client.performDataAction).toHaveBeenCalledTimes(2);

    await LucidDataActionUtility.performDataAction(client, params);
    expect(client.oauthXhr).toHaveBeenCalledTimes(1);
  });

  it('a failed attempt still runs the data action and is retried by the next one', async () => {
    const client = makeClient();
    client.oauthXhr.mockRejectedValueOnce(new Error('consent dialog blocked')).mockResolvedValue({});

    await LucidDataActionUtility.performDataAction(client, params);
    expect(client.performDataAction).toHaveBeenCalledTimes(1);

    await LucidDataActionUtility.performDataAction(client, params);
    expect(client.oauthXhr).toHaveBeenCalledTimes(2);

    await LucidDataActionUtility.performDataAction(client, params);
    expect(client.oauthXhr).toHaveBeenCalledTimes(2);
  });

  it('ensureLucidOauth is a no-op while signed out', async () => {
    (AuthHandler.getIsAuthenticated as jest.Mock).mockReturnValue(false);
    const client = makeClient();
    await LucidDataActionUtility.ensureLucidOauth(client);
    expect(client.oauthXhr).not.toHaveBeenCalled();
  });
});
