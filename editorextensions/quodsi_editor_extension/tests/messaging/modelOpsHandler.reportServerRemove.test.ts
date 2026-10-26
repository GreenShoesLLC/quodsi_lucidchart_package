// Remove Quodsi Model's server half (2026-10-26): a data action returns its HTTP status
// rather than throwing, so a failed RemoveModel used to pass silently and the model's
// Simulation Project and runs stayed on the server.

jest.mock('../../src/core/messaging/index', () => ({ router: { send: jest.fn() } }));

import { reportServerRemove, SERVER_COPY_KEPT_ALERT } from '../../src/core/messaging/handlers/modelOpsHandler';

describe('reportServerRemove', () => {
  const client = () => ({ alert: jest.fn() });

  it('is quiet when the server removed it, or had nothing to remove', () => {
    for (const deleted of [true, false]) {
      const c = client();
      expect(reportServerRemove(c, { status: 200, json: { success: true, deleted } })).toBe(true);
      expect(c.alert).not.toHaveBeenCalled();
    }
  });

  it('tells her when the server refused or failed', () => {
    for (const result of [{ status: 401, json: { detail: 'Invalid Kinde token' } }, { status: 500 }, { status: 200, json: {} }, undefined]) {
      const c = client();
      expect(reportServerRemove(c, result)).toBe(false);
      expect(c.alert).toHaveBeenCalledWith(SERVER_COPY_KEPT_ALERT);
    }
  });

  it('leaves an out-of-date package to the reload alert', () => {
    const c = client();
    expect(reportServerRemove(c, { status: 426, json: { detail: { code: 'client_outdated' } } })).toBe(false);
    expect(c.alert).not.toHaveBeenCalled();
  });
});
