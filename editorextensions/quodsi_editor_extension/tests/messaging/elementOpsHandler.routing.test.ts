// tests/messaging/elementOpsHandler.routing.test.ts
//
// Task 3b: same bug as modelRootHandler.routing.test.ts, but for
// ElementOpsHandler.handleElementUpdate. useModelRootSource's saveShape
// (quodsim-react/src/adapters/useModelRootSource.ts) sends ELEMENT_UPDATE
// and awaits ELEMENT_UPDATE_RESULT -- this is the route the pattern-editor
// modal's GeneratorPatternTab actually writes through (via
// createBufferingAccessor -> base.updateShape -> deps.save ->
// transport.saveShape). Before this task the RESULT was hardcoded to
// router.send('model', …), so a modal-originated ELEMENT_UPDATE was
// answered on the side panel's channel and the modal's 30s timeout fired.
//
// handleElementConvert (ELEMENT_CONVERT / ELEMENT_CONVERT_RESULT) is a
// DIFFERENT message pair, reachable only from the side panel's element
// editors (modelOpsSender.convertElement) -- the pattern modal never sends
// ELEMENT_CONVERT (confirmed: PatternEditorView / bufferingAccessor only
// ever call accessor.updateShape and accessor.updateModel). Its two
// router.send('model', …) sites were deliberately left hardcoded; the last
// test below pins that they stay hardcoded even if a caller mislabels the
// message source, so a later "fix for consistency" doesn't silently change
// panel-only behaviour.
//
// Mocking style mirrors tests/messaging/modelRootHandler.broadcast.test.ts
// (Task 2's closely-related test): mock lucid-extension-sdk's Viewport in
// place via the shared __mocks__ file, mock core/messaging, core/ModelManager
// and the selection handler before importing ElementOpsHandler.

import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};
(Viewport.prototype as any).getSelectedItems = function (): any {
  return [];
};

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));

let modelManagerStub: any;
jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: {
    getInstance: () => modelManagerStub,
    getClient: () => ({}),
  },
}));

const handleLucidSelectionEventMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: {
    handleLucidSelectionEvent: (...args: unknown[]) => handleLucidSelectionEventMock(...args),
  },
}));

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ElementOpsHandler } from '../../src/core/messaging/handlers/elementOpsHandler';

function updateMsg(source: string, id: string): any {
  return {
    id,
    type: EnvelopeMessageType.ELEMENT_UPDATE,
    source,
    target: 'host',
    version: '1.0',
    data: { elementId: 'shape-1', type: 'Generator', data: { volume: 10 } },
  };
}

function convertMsg(source: string, id: string): any {
  return {
    id,
    type: EnvelopeMessageType.ELEMENT_CONVERT,
    source,
    target: 'host',
    version: '1.0',
    data: { elementId: 'shape-1', newType: 'Generator', data: {} },
  };
}

beforeEach(() => {
  sendMock.mockClear();
  handleLucidSelectionEventMock.mockClear();
  currentPage = {
    id: 'page-1',
    allBlocks: { get: (id: string) => (id === 'shape-1' ? { id: 'shape-1' } : undefined) },
    allLines: { get: () => undefined },
  };
  modelManagerStub = {
    saveElementData: jest.fn().mockResolvedValue(undefined),
    validateModel: jest.fn().mockResolvedValue(undefined),
  };
});

describe('ElementOpsHandler.getResponseChannel routing -- ELEMENT_UPDATE (the pattern modal\'s actual write path)', () => {
  it('routes a panel-originated (model-iframe) ELEMENT_UPDATE_RESULT to "model" -- the working path is unchanged', async () => {
    await (ElementOpsHandler as any).handleElementUpdate(updateMsg('model-iframe', 'req-panel-1'));

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, msg] = sendMock.mock.calls[0];
    expect(target).toBe('model');
    expect(msg.type).toBe(EnvelopeMessageType.ELEMENT_UPDATE_RESULT);
    expect(msg.data.success).toBe(true);
  });

  it('routes a modal-originated (pattern-iframe) ELEMENT_UPDATE_RESULT to "pattern"', async () => {
    await (ElementOpsHandler as any).handleElementUpdate(updateMsg('pattern-iframe', 'req-pattern-1'));

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, msg] = sendMock.mock.calls[0];
    expect(target).toBe('pattern');
    expect(msg.type).toBe(EnvelopeMessageType.ELEMENT_UPDATE_RESULT);
    expect(msg.data.success).toBe(true);
  });

  it('routes a failed modal-originated ELEMENT_UPDATE_RESULT to "pattern" too', async () => {
    modelManagerStub.saveElementData = jest.fn().mockRejectedValue(new Error('boom'));

    await (ElementOpsHandler as any).handleElementUpdate(updateMsg('pattern-iframe', 'req-pattern-2'));

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, msg] = sendMock.mock.calls[0];
    expect(target).toBe('pattern');
    expect(msg.data.success).toBe(false);
  });
});

describe('ElementOpsHandler -- ELEMENT_CONVERT_RESULT stays hardcoded to "model" (panel-only route, not used by the pattern modal)', () => {
  it('a panel-originated (model-iframe) ELEMENT_CONVERT_RESULT still goes to "model"', async () => {
    await (ElementOpsHandler as any).handleElementConvert(convertMsg('model-iframe', 'req-panel-convert'));

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target, msg] = sendMock.mock.calls[0];
    expect(target).toBe('model');
    expect(msg.type).toBe(EnvelopeMessageType.ELEMENT_CONVERT_RESULT);
  });

  it('even a (hypothetical) pattern-sourced ELEMENT_CONVERT still gets routed to "model" -- deliberately not wired to getResponseChannel', async () => {
    await (ElementOpsHandler as any).handleElementConvert(convertMsg('pattern-iframe', 'req-hypothetical-convert'));

    expect(sendMock).toHaveBeenCalledTimes(1);
    const [target] = sendMock.mock.calls[0];
    expect(target).toBe('model');
  });
});
