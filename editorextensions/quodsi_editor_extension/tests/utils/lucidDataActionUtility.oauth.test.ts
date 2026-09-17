// EXPERIMENT (exp/lucid-oauth-kinde-only): data actions no longer run the
// oauthXhr('lucid', ...) workaround. The connector authenticates with the
// `kinde` provider, whose token comes from sign-in.
import { AuthHandler } from '../../src/core/messaging/handlers/authHandler';
import { LucidDataActionUtility } from '../../src/utils/LucidDataActionUtility';

const params = { dataConnectorName: 'quodsi_api_data_connector', actionName: 'X', actionData: {}, asynchronous: false };

function makeClient() {
  return {
    oauthXhr: jest.fn(async () => ({})),
    performDataAction: jest.fn(async () => ({ status: 200, json: {} })),
  };
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('LucidDataActionUtility', () => {
  it.each([true, false])('runs the data action without any lucid-provider OAuth call (signed in: %s)', async (signedIn) => {
    jest.spyOn(AuthHandler, 'getIsAuthenticated').mockReturnValue(signedIn);
    const client = makeClient();

    const result = await LucidDataActionUtility.performDataAction(client, params);

    expect(result).toEqual({ status: 200, json: {} });
    expect(client.performDataAction).toHaveBeenCalledWith(params);
    expect(client.oauthXhr).not.toHaveBeenCalled();
  });
});
