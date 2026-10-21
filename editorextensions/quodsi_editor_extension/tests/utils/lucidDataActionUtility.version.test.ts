// Spec 2026-10-21 quodsi-version, Part C: every data-connector action names
// the package's Quodsi release (action.data.quodsiVersion; Lucid's proxy drops
// custom headers), and an outdated package tells the user to reload LucidChart.
import { AuthHandler } from '../../src/core/messaging/handlers/authHandler';
import { LucidDataActionUtility, __resetClientOutdatedForTests } from '../../src/utils/LucidDataActionUtility';

const params = { dataConnectorName: 'quodsi_api_data_connector', actionName: 'X', actionData: { a: 1 }, asynchronous: false };

function makeClient(result: unknown) {
  return {
    performDataAction: jest.fn(async () => result),
    alert: jest.fn(),
  };
}

beforeEach(() => {
  jest.spyOn(AuthHandler, 'getIsAuthenticated').mockReturnValue(true);
  __resetClientOutdatedForTests();
});
afterEach(() => jest.restoreAllMocks());

describe('LucidDataActionUtility and the Quodsi version', () => {
  it('adds quodsiVersion to every action, "development" for an unversioned build', async () => {
    const client = makeClient({ status: 200, json: {} });
    await LucidDataActionUtility.performDataAction(client, params);
    expect(client.performDataAction).toHaveBeenCalledWith({
      ...params,
      actionData: { a: 1, quodsiVersion: 'development' },
    });
  });

  it('a 426 client_outdated alerts once per session and still returns the result', async () => {
    const outdated = { status: 426, json: { detail: { code: 'client_outdated', min_version: '2026.10.21' } } };
    const client = makeClient(outdated);
    expect(await LucidDataActionUtility.performDataAction(client, params)).toEqual(outdated);
    await LucidDataActionUtility.performDataAction(client, params);
    expect(client.alert).toHaveBeenCalledTimes(1);
    expect(client.alert).toHaveBeenCalledWith('Quodsi has been updated. Reload LucidChart to get the latest version.');
  });

  it('another 426 does not alert', async () => {
    const client = makeClient({ status: 426, json: { detail: 'other' } });
    await LucidDataActionUtility.performDataAction(client, params);
    expect(client.alert).not.toHaveBeenCalled();
  });
});
