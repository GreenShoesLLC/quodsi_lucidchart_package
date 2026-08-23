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
// Plan 2b polish P3: a FAILED write must nonetheless push a fresh SNAPSHOT.
// createModelRootSource.saveModel echoes the patch into its cached
// projection optimistically before sending, so a write the host REJECTS
// would otherwise leave the echoed (wrong) value on screen indefinitely --
// handleUpdate used to send MODEL_ROOT_UPDATE_RESULT { success: false } and
// return, with no snapshot behind it. The snapshot goes AFTER the result
// send so the panel's own saveModel promise rejects first.
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

  it('pushes a fresh snapshot after a FAILED update, after the failure result and without a selection refresh', async () => {
    modelManagerStub.updateModelRoot = async () => {
      throw new Error('boom');
    };

    // Recorded at call time so the ordering assertion below is on what the
    // panel actually observes: the rejecting UPDATE_RESULT first, the
    // corrective snapshot behind it.
    let sendCountWhenSnapshotStarted = -1;
    const snapshotSpy = jest
      .spyOn(ModelRootHandler as any, 'sendSnapshot')
      .mockImplementation(async () => {
        sendCountWhenSnapshotStarted = sendMock.mock.calls.length;
      });

    try {
      await (ModelRootHandler as any).handleUpdate(updateMsg());
      await flush();

      const failureResult = sendMock.mock.calls.find(
        ([, envelope]: any[]) => envelope.type === EnvelopeMessageType.MODEL_ROOT_UPDATE_RESULT,
      );
      expect(failureResult?.[1].data.success).toBe(false);

      expect(snapshotSpy).toHaveBeenCalledTimes(1);
      expect(snapshotSpy).toHaveBeenCalledWith('req-1');
      // The failure result was already on the wire when the snapshot began.
      expect(sendCountWhenSnapshotStarted).toBe(1);

      // The selection re-process stays a SUCCESS-path-only concern.
      expect(handleLucidSelectionEventMock).not.toHaveBeenCalled();
    } finally {
      snapshotSpy.mockRestore();
    }
  });
});
