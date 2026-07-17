// editorextensions/quodsi_editor_extension/tests/messaging/upgradeInterestHandler.test.ts
import { EnvelopeMessageType } from '@quodsi/lucid-shared';

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));

const performDataActionMock = jest.fn();
jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: { getClient: () => ({ performDataAction: performDataActionMock }) },
}));

import { UpgradeInterestHandler } from '../../src/core/messaging/handlers/upgradeInterestHandler';

function makePingMessage(feature: string | undefined) {
  return {
    id: 'corr-1',
    type: EnvelopeMessageType.UPGRADE_INTEREST_PING,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data: { feature },
  } as any;
}

describe('UpgradeInterestHandler', () => {
  beforeEach(() => {
    sendMock.mockClear();
    performDataActionMock.mockClear();
  });

  it('calls the UpgradeInterest data-connector action and acks ok:true on success', async () => {
    performDataActionMock.mockResolvedValue({ status: 200, json: { success: true } });

    const handled = UpgradeInterestHandler.handleMessage(makePingMessage('tradeoff_analysis'));
    expect(handled).toBe(true);

    // handlePing is async fire-and-forget from handleMessage's perspective;
    // flush microtasks so the performDataAction promise resolves.
    await Promise.resolve();
    await Promise.resolve();

    expect(performDataActionMock).toHaveBeenCalledWith({
      dataConnectorName: 'quodsi_api_data_connector',
      actionName: 'UpgradeInterest',
      actionData: { feature: 'tradeoff_analysis' },
      asynchronous: false,
    });

    expect(sendMock).toHaveBeenCalledWith('model', expect.objectContaining({
      id: 'corr-1',
      type: EnvelopeMessageType.UPGRADE_INTEREST_PING_RESULT,
      data: { ok: true },
    }));
  });

  it('acks ok:false when the data-connector call throws', async () => {
    performDataActionMock.mockRejectedValue(new Error('network down'));

    UpgradeInterestHandler.handleMessage(makePingMessage('chart_export'));
    await Promise.resolve();
    await Promise.resolve();

    expect(sendMock).toHaveBeenCalledWith('model', expect.objectContaining({
      id: 'corr-1',
      type: EnvelopeMessageType.UPGRADE_INTEREST_PING_RESULT,
      data: expect.objectContaining({ ok: false }),
    }));
  });

  it('acks ok:false when the backend responds without success:true', async () => {
    performDataActionMock.mockResolvedValue({ status: 400, json: { success: false } });

    UpgradeInterestHandler.handleMessage(makePingMessage('chart_export'));
    await Promise.resolve();
    await Promise.resolve();

    expect(sendMock).toHaveBeenCalledWith('model', expect.objectContaining({
      data: expect.objectContaining({ ok: false }),
    }));
  });
});
