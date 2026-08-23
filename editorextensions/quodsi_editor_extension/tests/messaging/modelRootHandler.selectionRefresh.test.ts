// tests/messaging/modelRootHandler.selectionRefresh.test.ts
//
// Plan 2b, Task 7: after a successful MODEL_ROOT_UPDATE, handleUpdate must
// re-process the current Lucid selection (SelectionHandler.handleLucidSelectionEvent)
// so the Activity/Generator panel's referenceData (the Requirements picker's
// Resources group) reflects a resource created or renamed on the Resources
// tab -- the same refresh handleElementConvert already performs after a
// convert (see elementOpsHandler.ts). Before this task, writing
// `{ resources }` through updateModelRoot updated the model but left the
// currently-open element panel's cached referenceData stale until the next
// unrelated selection change.
//
// A write that FAILS (updateModelRoot throws) must NOT trigger the refresh:
// there is nothing new to reflect, and refreshing selection state after a
// rejected write would be pure noise on the failure path.
//
// Mocking style mirrors tests/messaging/modelRootHandler.broadcast.test.ts
// (Viewport monkey-patched via the shared __mocks__ file, core/messaging and
// core/ModelManager mocked before importing ModelRootHandler) and
// tests/messaging/elementOpsHandler.routing.test.ts (SelectionHandler mocked
// the same way, at the same module path modelRootHandler.ts now imports).

import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
let selectedItems: any[] = [];
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};
(Viewport.prototype as any).getSelectedItems = function (): any {
  return selectedItems;
};

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: {
    send: sendMock,
    getChannelManager: () => ({
      getChannel: () => undefined,
    }),
  },
}));

let modelManagerStub: any;
const clientStub = {};
jest.mock('../../src/core/ModelManager', () => ({
  ModelManager: {
    getInstance: () => modelManagerStub,
    getClient: () => clientStub,
  },
}));

const handleLucidSelectionEventMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: {
    handleLucidSelectionEvent: (...args: unknown[]) => handleLucidSelectionEventMock(...args),
  },
}));

import { EnvelopeMessageType } from '@quodsi/lucid-shared';
import { ModelRootHandler } from '../../src/core/messaging/handlers/modelRootHandler';

function flush(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function updateMsg(): any {
  return {
    id: 'req-1',
    type: EnvelopeMessageType.MODEL_ROOT_UPDATE,
    source: 'model-iframe',
    target: 'host',
    version: '1.0',
    data: { patch: { resources: [] } },
  };
}

beforeEach(() => {
  sendMock.mockClear();
  handleLucidSelectionEventMock.mockClear();
  currentPage = { id: 'page-1' };
  selectedItems = [{ id: 'shape-9' }];
  modelManagerStub = {
    buildModelRootProjection: async () => ({ generators: [], arrivalPatterns: [] }),
    updateModelRoot: async () => undefined,
    validateModel: async () => undefined,
  };
});

describe('ModelRootHandler selection refresh after model-root writes', () => {
  it('re-processes the current selection once after a successful update', async () => {
    await (ModelRootHandler as any).handleUpdate(updateMsg());
    await flush();

    expect(handleLucidSelectionEventMock).toHaveBeenCalledTimes(1);
    expect(handleLucidSelectionEventMock).toHaveBeenCalledWith(
      clientStub,
      selectedItems,
      modelManagerStub,
    );
  });

  it('does not refresh the selection after a failed update', async () => {
    modelManagerStub.updateModelRoot = async () => {
      throw new Error('boom');
    };

    await (ModelRootHandler as any).handleUpdate(updateMsg());
    await flush();

    expect(handleLucidSelectionEventMock).not.toHaveBeenCalled();
  });
});
