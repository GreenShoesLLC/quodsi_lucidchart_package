// tests/messaging/channelManager.coalesce.test.ts
//
// Ruling 8 (final review of the Lucid onboarding tour): a closed side panel
// keeps its channel and queue (T7), so every selection/model-context message
// sent while it is closed would pile up and replay on reopen. While a channel
// is not ready, a message replaces any queued message of the same type.
import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ChannelManager } from '../../src/core/messaging/ChannelManager';

const msg = (type: EnvelopeMessageType, id: string, data: unknown = {}) =>
  ({ id, type, source: 'host', target: 'model-iframe', version: '1.0', data }) as any;

describe('ChannelManager queue while not ready', () => {
  it('coalesces by type: the latest payload wins, distinct types all wait', () => {
    const cm = new ChannelManager(() => {});
    const relay = jest.fn();
    cm.registerChannel('model', { relayToIframe: relay } as any);
    cm.markChannelReady('model');
    cm.markChannelNotReady('model'); // the panel closed

    cm.enqueueOrSend('model', msg(EnvelopeMessageType.SELECTION_CHANGED, 's1', { n: 1 }));
    cm.enqueueOrSend('model', msg(EnvelopeMessageType.TOUR_START, 't1', { reset: true }));
    cm.enqueueOrSend('model', msg(EnvelopeMessageType.SELECTION_CHANGED, 's2', { n: 2 }));
    cm.enqueueOrSend('model', msg(EnvelopeMessageType.SELECTION_CHANGED, 's3', { n: 3 }));

    const queue = cm.getChannel('model')!.queue;
    expect(queue).toHaveLength(2);
    expect(queue.map((m) => m.type)).toEqual([EnvelopeMessageType.SELECTION_CHANGED, EnvelopeMessageType.TOUR_START]);
    expect(queue[0].data).toEqual({ n: 3 });
    expect(relay).not.toHaveBeenCalled();

    cm.markChannelReady('model');
    cm.flushQueue('model');
    expect(relay).toHaveBeenCalledTimes(2);
    expect(relay.mock.calls.map((c) => c[0].id)).toEqual(['s3', 't1']);
  });

  it('a channel that was never ready (a modal before REACT_APP_READY) keeps distinct types in order', () => {
    const cm = new ChannelManager(() => {});
    cm.enqueueOrSend('results', msg(EnvelopeMessageType.TOUR_START, 'a'));
    cm.enqueueOrSend('results', msg(EnvelopeMessageType.SELECTION_CHANGED, 'b'));
    expect(cm.getChannel('results')!.queue.map((m) => m.id)).toEqual(['a', 'b']);
  });
});
