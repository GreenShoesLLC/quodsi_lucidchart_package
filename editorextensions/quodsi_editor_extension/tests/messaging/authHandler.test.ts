// editorextensions/quodsi_editor_extension/tests/messaging/authHandler.test.ts
import { EnvelopeMessageType } from '@quodsi/lucid-shared';

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));

import { AuthHandler } from '../../src/core/messaging/handlers/authHandler';

describe('AuthHandler.broadcastEntitlements', () => {
  beforeEach(() => {
    sendMock.mockClear();
  });

  it('passes camelCase entitlement fields straight through (no snake_case remap)', () => {
    // GetMyEntitlements (T7b) is camelCase end-to-end, so broadcastEntitlements
    // must read these fields directly off the response rather than remapping
    // from a snake_case shape (that remapping block was removed in T7b).
    (AuthHandler as any).broadcastEntitlements({
      subjectType: 'organization',
      planKey: 'quodsi_pro',
      planStatus: 'active',
      trialExpiresAt: undefined,
      upgradeAvailable: true,
      features: { simulations_per_month: { limit: 200, used: 5 } },
      planSource: 'kinde_org',
      orgName: 'Acme Corp',
      studiesUsed: 3,
      studiesPerOrgLimit: 100,
      scenariosPerStudyLimit: 100,
      replicationsPerScenarioLimit: 100,
      tradeoffAnalysis: true,
      chartExport: true,
    });

    expect(sendMock).toHaveBeenCalledWith('broadcast', expect.objectContaining({
      type: EnvelopeMessageType.ENTITLEMENTS_STATUS,
      data: expect.objectContaining({
        subjectType: 'organization',
        planKey: 'quodsi_pro',
        planSource: 'kinde_org',
        orgName: 'Acme Corp',
        studiesUsed: 3,
        studiesPerOrgLimit: 100,
        scenariosPerStudyLimit: 100,
        replicationsPerScenarioLimit: 100,
        tradeoffAnalysis: true,
        chartExport: true,
      }),
    }));
  });

  it('tolerates a response missing the new optional fields', () => {
    (AuthHandler as any).broadcastEntitlements({
      subjectType: 'user',
      planKey: 'quodsi_free_user',
      planStatus: 'active',
      features: {},
    });

    expect(sendMock).toHaveBeenCalledWith('broadcast', expect.objectContaining({
      data: expect.objectContaining({
        subjectType: 'user',
        planSource: undefined,
        orgName: undefined,
      }),
    }));
  });
});
