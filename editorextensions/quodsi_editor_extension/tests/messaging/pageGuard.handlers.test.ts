// Page guard (spec 2026-09-11): the five panel write handlers refuse a write
// whose basedOnPageId is missing or names a page other than the current one,
// before anything is stored. Mock style follows embedWriteRouting.test.ts.
import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any { return currentPage; };
(Viewport.prototype as any).getSelectedItems = function (): any { return []; };

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({ router: { send: sendMock } }));

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
import { StatesHandler } from '../../src/core/messaging/handlers/statesHandler';
import { EntitiesHandler } from '../../src/core/messaging/handlers/entitiesHandler';
import { ResourceRequirementsHandler } from '../../src/core/messaging/handlers/resourceRequirementsHandler';
import { ElementOpsHandler } from '../../src/core/messaging/handlers/elementOpsHandler';
import { PAGE_GUARD_MISMATCH_MESSAGE, PAGE_GUARD_MISSING_MESSAGE } from '../../src/core/messaging/pageGuard';

const flush = () => new Promise((r) => setImmediate(r));

function msg(type: EnvelopeMessageType, source: string, data: unknown): any {
  return { id: `req-${type}`, type, source, target: 'host', version: '1.0', data };
}
function resultData(type: EnvelopeMessageType): any {
  return sendMock.mock.calls.find((c) => c[1]?.type === type)?.[1]?.data;
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

describe('MODEL_ROOT_UPDATE', () => {
  const update = (source: string, data: unknown) =>
    (ModelRootHandler as any).handleUpdate(msg(EnvelopeMessageType.MODEL_ROOT_UPDATE, source, data));

  it('refuses a write based on another page: nothing stored, failure result, corrective snapshot, no rebuild', async () => {
    await update('model-iframe', { patch: { resources: [] }, basedOnPageId: 'page-A' });
    await flush();

    expect(modelManagerStub.updateModelRoot).not.toHaveBeenCalled();
    expect(resultData(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT)).toEqual({
      success: false,
      errorMessage: PAGE_GUARD_MISMATCH_MESSAGE,
    });
    expect(modelManagerStub.buildModelRootProjection).toHaveBeenCalled();
    expect(rebuildMock).not.toHaveBeenCalled();
  });

  it('refuses a panel write with no page id', async () => {
    await update('pattern-iframe', { patch: { arrivalPatterns: [] } });
    await flush();

    expect(modelManagerStub.updateModelRoot).not.toHaveBeenCalled();
    expect(resultData(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT)).toEqual({
      success: false,
      errorMessage: PAGE_GUARD_MISSING_MESSAGE,
    });
  });

  it('writes when the page id matches', async () => {
    await update('model-iframe', { patch: { resources: [] }, basedOnPageId: 'page-B' });
    await flush();

    expect(modelManagerStub.updateModelRoot).toHaveBeenCalledWith({ resources: [] }, currentPage);
    expect(resultData(EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT)).toEqual({ success: true });
  });

  it('lets the embedded Studio frame write without a page id', async () => {
    await update('studio-embed-iframe', { patch: { resources: [] } });
    await flush();

    expect(modelManagerStub.updateModelRoot).toHaveBeenCalled();
  });
});

describe.each([
  {
    name: 'STATES_UPDATE',
    handler: StatesHandler,
    type: EnvelopeMessageType.STATES_UPDATE,
    resultType: EnvelopeMessageType.STATES_UPDATE_RESULT,
    payload: { states: [] },
    write: 'updateStates',
  },
  {
    name: 'ENTITIES_UPDATE',
    handler: EntitiesHandler,
    type: EnvelopeMessageType.ENTITIES_UPDATE,
    resultType: EnvelopeMessageType.ENTITIES_UPDATE_RESULT,
    payload: { entities: [] },
    write: 'updateEntities',
  },
  {
    name: 'RESOURCE_REQUIREMENTS_UPDATE',
    handler: ResourceRequirementsHandler,
    type: EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE,
    resultType: EnvelopeMessageType.RESOURCE_REQUIREMENTS_UPDATE_RESULT,
    payload: { resourceRequirements: [] },
    write: 'updateResourceRequirements',
  },
])('$name', ({ handler, type, resultType, payload, write }) => {
  async function send(source: string, extra: Record<string, unknown>) {
    (handler as any).handleMessage(msg(type, source, { ...payload, ...extra }));
    await flush();
  }

  it('refuses a write based on another page: nothing stored, failure result, one forced rebuild', async () => {
    await send('model-iframe', { basedOnPageId: 'page-A' });

    expect(modelManagerStub[write]).not.toHaveBeenCalled();
    expect(resultData(resultType)).toEqual({ success: false, errorMessage: PAGE_GUARD_MISMATCH_MESSAGE });
    expect(rebuildMock).toHaveBeenCalledTimes(1);
    expect(rebuildMock).toHaveBeenCalledWith(true);
  });

  it('refuses a panel write with no page id, without a rebuild', async () => {
    await send('model-iframe', {});

    expect(modelManagerStub[write]).not.toHaveBeenCalled();
    expect(resultData(resultType)).toEqual({ success: false, errorMessage: PAGE_GUARD_MISSING_MESSAGE });
    expect(rebuildMock).not.toHaveBeenCalled();
  });

  it('writes when the page id matches', async () => {
    await send('model-iframe', { basedOnPageId: 'page-B' });

    expect(modelManagerStub[write]).toHaveBeenCalled();
    expect(resultData(resultType)).toEqual({ success: true });
  });

  it('does not rebuild on an ordinary (non-guard) failure', async () => {
    modelManagerStub[write].mockRejectedValueOnce(new Error('boom'));

    await send('model-iframe', { basedOnPageId: 'page-B' });

    expect(resultData(resultType)).toEqual({ success: false, errorMessage: 'boom' });
    expect(rebuildMock).not.toHaveBeenCalled();
  });
});

describe('STATES_UPDATE / ENTITIES_UPDATE from the embedded Studio frame', () => {
  it('writes states without a page id', async () => {
    StatesHandler.handleMessage(msg(EnvelopeMessageType.STATES_UPDATE, 'studio-embed-iframe', { states: [] }));
    await flush();
    expect(modelManagerStub.updateStates).toHaveBeenCalled();
  });

  it('writes entities without a page id', async () => {
    EntitiesHandler.handleMessage(msg(EnvelopeMessageType.ENTITIES_UPDATE, 'studio-embed-iframe', { entities: [] }));
    await flush();
    expect(modelManagerStub.updateEntities).toHaveBeenCalled();
  });
});

describe('ELEMENT_UPDATE', () => {
  const update = (source: string, data: unknown) =>
    (ElementOpsHandler as any).handleElementUpdate(msg(EnvelopeMessageType.ELEMENT_UPDATE, source, data));

  it('refuses a model settings write based on another page: nothing saved, failure result, one forced rebuild', async () => {
    await update('model-iframe', { elementId: 'original-page-id', type: 'Model', data: { name: 'M' }, basedOnPageId: 'page-A' });
    await flush();

    expect(modelManagerStub.saveElementData).not.toHaveBeenCalled();
    expect(resultData(EnvelopeMessageType.ELEMENT_UPDATE_RESULT)).toEqual({
      success: false,
      elementId: 'original-page-id',
      errorMessage: PAGE_GUARD_MISMATCH_MESSAGE,
    });
    expect(rebuildMock).toHaveBeenCalledTimes(1);
  });

  it('refuses a model settings write with no page id', async () => {
    await update('model-iframe', { elementId: 'page-B', type: 'Model', data: { name: 'M' } });
    await flush();

    expect(modelManagerStub.saveElementData).not.toHaveBeenCalled();
    expect(resultData(EnvelopeMessageType.ELEMENT_UPDATE_RESULT)).toMatchObject({
      success: false,
      errorMessage: PAGE_GUARD_MISSING_MESSAGE,
    });
  });

  it("saves a model settings write whose page id matches, even when the model's element id differs (duplicated page)", async () => {
    await update('model-iframe', { elementId: 'original-page-id', type: 'Model', data: { name: 'M' }, basedOnPageId: 'page-B' });
    await flush();

    expect(modelManagerStub.saveElementData).toHaveBeenCalled();
  });

  it('leaves shape writes unguarded', async () => {
    await update('model-iframe', { elementId: 'a1', type: 'Activity', data: { capacity: 2 } });
    await flush();

    expect(modelManagerStub.saveElementData).toHaveBeenCalled();
  });
});
