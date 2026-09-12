// Delete-choice forwarding (spec 2026-09-11 resource delete cleanup): the
// write handlers read a delete dialog's Seize/Release choice off the envelope
// and forward it to ModelManager. Mock harness copied from
// pageGuard.handlers.test.ts (jest mocks are per file).
import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any { return currentPage; };
(Viewport.prototype as any).getSelectedItems = function (): any { return []; };

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    // M1: ModelRootHandler.sendSnapshot reads this to decide which extra
    // targets (pattern/schedule/work-schedule) also get the snapshot -- a
    // mock without it makes sendSnapshot throw, and the mismatch path
    // swallows that (.catch(log.error)), so the corrective snapshot the
    // MODEL_ROOT_UPDATE mismatch test claims never actually goes out.
    getChannelManager: () => ({ getChannel: () => undefined }),
  },
}));

let modelManagerStub: any;
jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: { getInstance: () => modelManagerStub, getClient: () => ({}) },
}));

const rebuildMock = jest.fn().mockResolvedValue(undefined);
const selectionMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: {
    handleLucidSelectionEvent: (...args: unknown[]) => selectionMock(...args),
    sendSelectionChangedMessage: (...args: unknown[]) => rebuildMock(...args),
  },
}));

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ModelRootHandler } from '../../src/core/messaging/handlers/modelRootHandler';
import { ResourceRequirementsHandler } from '../../src/core/messaging/handlers/resourceRequirementsHandler';

const flush = () => new Promise((r) => setImmediate(r));

function msg(type: EnvelopeMessageType, source: string, data: unknown): any {
  return { id: `req-${type}`, type, source, target: 'host', version: '1.0', data };
}

beforeEach(() => {
  sendMock.mockClear();
  rebuildMock.mockClear();
  selectionMock.mockClear();
  currentPage = {
    id: 'page-B',
    allBlocks: { get: (id: string) => (id === 'a1' ? { id: 'a1' } : undefined) },
    allLines: { get: () => undefined },
    getTitle: () => 'B',
  };
  modelManagerStub = {
    saveElementData: jest.fn().mockResolvedValue(undefined),
    updateModelRoot: jest.fn().mockResolvedValue(undefined),
    updateStates: jest.fn().mockResolvedValue(undefined),
    updateEntities: jest.fn().mockResolvedValue(undefined),
    updateResourceRequirements: jest.fn().mockResolvedValue(undefined),
    validateModel: jest.fn().mockResolvedValue(undefined),
    buildModelRootProjection: jest.fn().mockResolvedValue({}),
  };
});

import { readReferenceCleanupOptions } from '../../src/core/messaging/referenceCleanupOptions';

describe('readReferenceCleanupOptions', () => {
  it("is 'remove' only for exactly 'remove'", () => {
    expect(readReferenceCleanupOptions({ seizeRelease: 'remove' })).toEqual({ seizeRelease: 'remove' });
    expect(readReferenceCleanupOptions({ seizeRelease: 'flag' })).toEqual({ seizeRelease: 'flag' });
    expect(readReferenceCleanupOptions({})).toEqual({ seizeRelease: 'flag' });
    expect(readReferenceCleanupOptions({ seizeRelease: 'REMOVE' })).toEqual({ seizeRelease: 'flag' });
    expect(readReferenceCleanupOptions(undefined)).toEqual({ seizeRelease: 'flag' });
  });
});

describe('handlers forward the delete choice', () => {
  it('MODEL_ROOT_UPDATE forwards seizeRelease to updateModelRoot', async () => {
    await (ModelRootHandler as any).handleUpdate(
      msg(EnvelopeMessageType.MODEL_ROOT_UPDATE, 'model-iframe', { patch: { resources: [] }, basedOnPageId: 'page-B', seizeRelease: 'remove' }),
    );
    await flush();
    expect(modelManagerStub.updateModelRoot).toHaveBeenCalledWith({ resources: [] }, currentPage, { seizeRelease: 'remove' });
  });

  it("MODEL_ROOT_UPDATE without a choice (Advisor, embedded Studio) passes 'flag'", async () => {
    await (ModelRootHandler as any).handleUpdate(
      msg(EnvelopeMessageType.MODEL_ROOT_UPDATE, 'studio-embed-iframe', { patch: { resources: [] } }),
    );
    await flush();
    expect(modelManagerStub.updateModelRoot).toHaveBeenCalledWith({ resources: [] }, currentPage, { seizeRelease: 'flag' });
  });

  it('RESOURCE_REQUIREMENTS_UPDATE forwards seizeRelease to updateResourceRequirements', async () => {
    ResourceRequirementsHandler.handleMessage(
      msg(EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE, 'model-iframe', { resourceRequirements: [], basedOnPageId: 'page-B', seizeRelease: 'remove' }),
    );
    await flush();
    expect(modelManagerStub.updateResourceRequirements).toHaveBeenCalledWith([], currentPage, { seizeRelease: 'remove' });
  });

  it('a page mismatch is still refused before the write, whatever the choice', async () => {
    ResourceRequirementsHandler.handleMessage(
      msg(EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE, 'model-iframe', { resourceRequirements: [], basedOnPageId: 'page-A', seizeRelease: 'remove' }),
    );
    await flush();
    expect(modelManagerStub.updateResourceRequirements).not.toHaveBeenCalled();
  });
});
