import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ChannelManager } from '../../src/core/messaging/ChannelManager';

const cm = new ChannelManager(() => {});
jest.mock('../../src/core/messaging', () => ({
  router: { getChannelManager: () => cm, registerChannel: jest.fn() },
}));
jest.mock('../../src/core/messaging/handlers', () => ({
  SelectionHandler: {},
  SimulationHandler: { stopAllPollingForDocument: jest.fn() },
}));

import { RightDockPanel } from '../../src/panels/RightDockPanel';

const tourMsg = () =>
  ({ id: 't1', type: EnvelopeMessageType.TOUR_START, source: 'host', target: 'model-iframe', version: '1.0', data: { reset: true } }) as any;

describe('RightDockPanel close vs the model channel', () => {
  it('after close, a TOUR_START queues (not relayed) and flushes on the next ready', () => {
    const relay = jest.fn();
    cm.registerChannel('model', { relayToIframe: relay } as any);
    cm.markChannelReady('model'); // panel opened and ready

    // frameClosed touches only logger, DocumentProxy (mock) and the router.
    (RightDockPanel.prototype as any).frameClosed.call({
      debug: { debug: jest.fn(), error: jest.fn() },
      client: {},
      isReady: true,
    });

    cm.enqueueOrSend('model', tourMsg());
    expect(relay).not.toHaveBeenCalled();
    expect(cm.getChannel('model')!.queue).toHaveLength(1);

    // REACT_APP_READY path: mark ready then flush
    cm.markChannelReady('model');
    cm.flushQueue('model');
    expect(relay).toHaveBeenCalledTimes(1);
    expect(relay.mock.calls[0][0].type).toBe(EnvelopeMessageType.TOUR_START);
  });
});
