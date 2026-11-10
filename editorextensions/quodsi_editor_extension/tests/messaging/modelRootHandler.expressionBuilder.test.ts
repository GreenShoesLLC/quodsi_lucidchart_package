// tests/messaging/modelRootHandler.expressionBuilder.test.ts
//
// OPEN_EXPRESSION_BUILDER / EXPRESSION_BUILDER_RESULT (spec 2026-11-10). The
// state-change dialog in the ~300px model panel opens the shared
// ExpressionBuilder in a real Lucid modal; the handler keeps one modal open
// at a time (the pattern modal's singleton guard), sends it INIT once its
// frame loads, forwards its RESULT to 'model', and settles the panel's
// promise with null when the frame closes without one. Every OPEN gets
// exactly one RESULT to 'model'.

const sendMock = jest.fn();
const expressionChannel: { ready: boolean; queue: unknown[]; panel?: unknown } = {
  ready: false,
  queue: [],
};
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    registerChannel: jest.fn(),
    clearFromGlobalRegistry: jest.fn(),
    getChannelManager: () => ({
      getChannel: (role: string) => (role === 'expression' ? expressionChannel : undefined),
      isChannelReady: () => false,
      flushQueue: jest.fn(),
    }),
  },
}));

jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: {
    getInstance: () => ({}),
    getClient: () => ({ sendCommand: jest.fn() }),
  },
}));

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ModelRootHandler } from '../../src/core/messaging/handlers/modelRootHandler';
import { ExpressionBuilderModal } from '../../src/panels/ExpressionBuilderModal';

const request = {
  expression: 'qty + 1',
  target: { name: 'qty', dataType: 'number', operation: 'set' },
  states: [],
};

function openMessage(requestId: string): any {
  return {
    id: `open-${requestId}`,
    type: EnvelopeMessageType.OPEN_EXPRESSION_BUILDER,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data: { requestId, request },
  };
}

function resultMessage(requestId: string, expression: string | null): any {
  return {
    id: `result-${requestId}`,
    type: EnvelopeMessageType.EXPRESSION_BUILDER_RESULT,
    source: 'expression-iframe',
    target: 'host',
    version: '1.0',
    data: { requestId, expression },
  };
}

/** The [target, envelope] pairs sent to the model panel. */
function sentToModel(): Array<[string, any]> {
  return sendMock.mock.calls.filter(([target]) => target === 'model');
}

let shown: ExpressionBuilderModal[];
let closeSpy: jest.SpyInstance;

beforeEach(() => {
  sendMock.mockClear();
  shown = [];
  jest.spyOn(ExpressionBuilderModal.prototype, 'show').mockImplementation(async function (
    this: ExpressionBuilderModal,
  ) {
    shown.push(this);
  });
  closeSpy = jest.spyOn(ExpressionBuilderModal.prototype, 'close').mockImplementation(() => {});
  (ModelRootHandler as any).openExpressionBuilder = null;
  expressionChannel.panel = undefined;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('expression builder modal', () => {
  it('opens one modal and sends INIT', () => {
    expect(ModelRootHandler.handleMessage(openMessage('r1'))).toBe(true);

    expect(shown).toHaveLength(1);
    expect((shown[0] as any).config.url).toBe('quodsim-react/index.html?view=expression');

    // INIT goes once the frame has loaded (and so registered the channel).
    (shown[0] as any).frameLoaded();
    const inits = sendMock.mock.calls.filter(
      ([, msg]) => msg.type === EnvelopeMessageType.EXPRESSION_BUILDER_INIT,
    );
    expect(inits).toHaveLength(1);
    expect(inits[0][0]).toBe('expression');
    expect(inits[0][1].data).toEqual({ requestId: 'r1', request });
  });

  it('ignores a second open while one is open', () => {
    ModelRootHandler.handleMessage(openMessage('r1'));
    ModelRootHandler.handleMessage(openMessage('r2'));

    expect(shown).toHaveLength(1);
    // The second caller still has a promise to settle: it gets null at once.
    const replies = sentToModel();
    expect(replies).toHaveLength(1);
    expect(replies[0][1].type).toBe(EnvelopeMessageType.EXPRESSION_BUILDER_RESULT);
    expect(replies[0][1].data).toEqual({ requestId: 'r2', expression: null });
  });

  it('forwards RESULT to the model panel', () => {
    ModelRootHandler.handleMessage(openMessage('r1'));
    expect(ModelRootHandler.handleMessage(resultMessage('r1', 'qty * 2'))).toBe(true);

    const replies = sentToModel();
    expect(replies).toHaveLength(1);
    expect(replies[0][1].type).toBe(EnvelopeMessageType.EXPRESSION_BUILDER_RESULT);
    expect(replies[0][1].data).toEqual({ requestId: 'r1', expression: 'qty * 2' });
    // Answered on the OPEN's envelope id, so the panel's pending request clears.
    expect(replies[0][1].id).toBe('open-r1');
    expect(closeSpy).toHaveBeenCalledTimes(1);
  });

  it('settles null when the frame closes without a result', () => {
    ModelRootHandler.handleMessage(openMessage('r1'));
    (shown[0] as any).frameClosed();

    const replies = sentToModel();
    expect(replies).toHaveLength(1);
    expect(replies[0][1].data).toEqual({ requestId: 'r1', expression: null });

    // And the guard is released: the next open opens a modal.
    ModelRootHandler.handleMessage(openMessage('r2'));
    expect(shown).toHaveLength(2);
  });

  it('sends exactly one RESULT when a RESULT is followed by the close', () => {
    ModelRootHandler.handleMessage(openMessage('r1'));
    ModelRootHandler.handleMessage(resultMessage('r1', 'qty * 2'));
    (shown[0] as any).frameClosed();
    (shown[0] as any).frameClosed();

    const replies = sentToModel();
    expect(replies).toHaveLength(1);
    expect(replies[0][1].data).toEqual({ requestId: 'r1', expression: 'qty * 2' });
  });

  it('releases the guard on RESULT without waiting for frameClosed', () => {
    ModelRootHandler.handleMessage(openMessage('r1'));
    ModelRootHandler.handleMessage(resultMessage('r1', 'qty * 2'));

    // No frameClosed: Lucid may not fire it after the host's own close().
    ModelRootHandler.handleMessage(openMessage('r2'));
    expect(shown).toHaveLength(2);
    expect(sentToModel().map(([, m]) => m.data)).toEqual([
      { requestId: 'r1', expression: 'qty * 2' },
    ]);

    // The first modal's late close sends nothing and does not free r2's claim.
    (shown[0] as any).frameClosed();
    expect(sentToModel()).toHaveLength(1);
    ModelRootHandler.handleMessage(openMessage('r3'));
    expect(shown).toHaveLength(2);
  });

  it('settles null and releases the guard when the modal fails to show', async () => {
    (ExpressionBuilderModal.prototype.show as jest.Mock).mockImplementationOnce(async function (
      this: ExpressionBuilderModal,
    ) {
      shown.push(this);
      throw new Error('ShowModal rejected');
    });

    ModelRootHandler.handleMessage(openMessage('r1'));
    await new Promise((resolve) => setTimeout(resolve, 0));

    const replies = sentToModel();
    expect(replies).toHaveLength(1);
    expect(replies[0][1].data).toEqual({ requestId: 'r1', expression: null });

    ModelRootHandler.handleMessage(openMessage('r2'));
    expect(shown).toHaveLength(2);
    expect(sentToModel()).toHaveLength(1);
  });

  it('ignores a RESULT for a request that is not the open one', () => {
    ModelRootHandler.handleMessage(openMessage('r1'));
    ModelRootHandler.handleMessage(resultMessage('stale', 'x'));

    expect(sentToModel()).toHaveLength(0);
    expect(closeSpy).not.toHaveBeenCalled();
  });

  it('a late close from an earlier modal does not settle or release a newer one', () => {
    ModelRootHandler.handleMessage(openMessage('r1'));
    const first = shown[0] as any;
    first.frameClosed();
    ModelRootHandler.handleMessage(openMessage('r2'));
    sendMock.mockClear();

    first.frameClosed();
    expect(sentToModel()).toHaveLength(0);
    ModelRootHandler.handleMessage(openMessage('r3'));
    expect(shown).toHaveLength(2);
  });
});
