// editorextensions/quodsi_editor_extension/tests/messaging/swimlaneHandler.update.test.ts
//
// Unlinking a lane UNLINKS A LANE. It does not delete a resource.
//
// Under format 1 the lane mapping WAS the resource's only home, so dropping
// the mapping had to cascade: handleUpdate diffed the old and new lane
// records and called ModelManager.cleanupDeletedResource for anything that
// disappeared. Under format 2 the record lives in the page's q_resources and
// outlives every claimant -- a resource with no lane and no block is a
// perfectly good unclaimed resource. Cascading here would silently destroy
// model-level data the user never asked to delete, so the whole path (and
// cleanupDeletedResource itself) is gone.
//
// Mocks lucid-extension-sdk's Viewport in place on the SAME module instance
// swimlaneHandler.ts resolves through jest's moduleNameMapper, and mocks
// core/messaging so `router.send` is observable (which also sidesteps the
// messaging <-> modal circular require). ModelManager is the REAL class: the
// last assertion is about its prototype.
import { Viewport } from '../__mocks__/lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));

import { EnvelopeMessageType, SwimLaneQuodsiData } from '@quodsi/lucid-shared';
import { ModelManager } from '../../src/core/ModelManager';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { SwimLaneHandler } from '../../src/core/messaging/handlers/swimlaneHandler';
import { makeFakePage, makeFakeBlock, addBlock } from '../helpers/fakeProxies';

const SWIMLANE_DATA_KEY = 'q_swimlane';

let storage: StorageAdapter;
let invalidated: number;

beforeEach(() => {
  sendMock.mockClear();
  storage = new StorageAdapter();
  invalidated = 0;
  (ModelManager as any).getClient = () => ({});
  (ModelManager as any).getInstance = () => ({
    invalidateModelCache: () => { invalidated++; },
    getStorageAdapter: () => storage,
  });
});

describe('SwimLaneHandler.handleUpdate', () => {
  it('persists a nulled lane and leaves q_resources untouched', async () => {
    const page = makeFakePage('p1');
    currentPage = page;
    storage.setResources(page, [{ id: 'res-1', name: 'Nurse', capacity: 1, description: '' }]);

    const block = addBlock(page, makeFakeBlock('sw-1', {
      className: 'AdvancedSwimLaneBlock',
      lanes: ['Nurse'],
    }));
    const before: SwimLaneQuodsiData = {
      lanes: [{ laneId: 'lane-1', titleSnapshot: 'Nurse', assignmentMode: 'runtime-derive', resourceId: 'res-1' }],
      lastSyncedAt: '2026-01-01T00:00:00.000Z',
    };
    block.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify(before));

    const after: SwimLaneQuodsiData = { lanes: [null], lastSyncedAt: '2026-01-02T00:00:00.000Z' };
    await (SwimLaneHandler as any).handleUpdate({
      id: 'msg-1',
      type: EnvelopeMessageType.SWIMLANE_UPDATE,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
      data: { swimlaneBlockId: 'sw-1', swimlaneData: after },
    });

    expect(JSON.parse(block.shapeData.get(SWIMLANE_DATA_KEY) as string)).toEqual(after);
    // The record survives the unlink -- it is now simply unclaimed.
    expect(storage.getResources(page)).toEqual([
      { id: 'res-1', name: 'Nurse', capacity: 1, description: '' },
    ]);
    expect(invalidated).toBe(1);
    expect(sendMock).toHaveBeenCalledWith('model', expect.objectContaining({
      id: 'msg-1',
      type: EnvelopeMessageType.SWIMLANE_UPDATE_RESULT,
      data: { success: true, error: undefined },
    }));
  });

  it('no longer has a resource-deleting cascade to call', () => {
    expect((ModelManager.prototype as any).cleanupDeletedResource).toBeUndefined();
  });
});

describe('SwimLaneHandler.handleUpdate -- linking a lane', () => {
  // The lane-convert message is gone (Task 9). A lane is linked the same way
  // a Resource BLOCK is: the PANEL mints the model-level record through the
  // shared ResourceLinkPicker (a model-root write the extension confirms),
  // then writes a POINTER -- so the only thing that reaches this handler is
  // the finished q_swimlane blob. This test therefore seeds through the same
  // seam the panel uses (StorageAdapter for the record, handleUpdate for the
  // blob) and keeps the assertions the convert-path test carried: the lane
  // holds a pointer and no inline record, and no resource is created or
  // destroyed here.
  it('persists a pointer-only lane and mints no resource of its own', async () => {
    const page = makeFakePage('p1');
    currentPage = page;
    // Already on the page: the record the picker created before linking.
    storage.setResources(page, [
      { id: 'res-0', name: 'Nurse', capacity: 1, description: '' },
      { id: 'res-1', name: 'Doctor', capacity: 1, description: '' },
    ]);

    const block = addBlock(page, makeFakeBlock('sw-1', {
      className: 'AdvancedSwimLaneBlock',
      lanes: ['Nurse', 'Doctor'],
    }));
    block.shapeData.set(SWIMLANE_DATA_KEY, JSON.stringify({
      lanes: [null, null],
      lastSyncedAt: '2026-01-01T00:00:00.000Z',
    } as SwimLaneQuodsiData));

    const linked: SwimLaneQuodsiData = {
      lanes: [
        null,
        {
          laneId: 'lane-2',
          titleSnapshot: 'Doctor',
          assignmentMode: 'runtime-derive',
          resourceId: 'res-1',
        },
      ],
      lastSyncedAt: '2026-01-02T00:00:00.000Z',
    };

    await (SwimLaneHandler as any).handleUpdate({
      id: 'msg-2',
      type: EnvelopeMessageType.SWIMLANE_UPDATE,
      source: 'model-iframe',
      target: 'host',
      version: '1.0',
      data: { swimlaneBlockId: 'sw-1', swimlaneData: linked },
    });

    const data = JSON.parse(block.shapeData.get(SWIMLANE_DATA_KEY) as string);
    expect(data.lanes[0]).toBeNull();
    expect(data.lanes[1]).toEqual({
      laneId: 'lane-2',
      titleSnapshot: 'Doctor',
      assignmentMode: 'runtime-derive',
      resourceId: 'res-1',
    });
    // Format 1's inline copy never comes back.
    expect('resource' in data.lanes[1]).toBe(false);

    // The handler is a persister, not a factory: the record list is exactly
    // what the panel put there.
    expect(storage.getResources(page)).toEqual([
      { id: 'res-0', name: 'Nurse', capacity: 1, description: '' },
      { id: 'res-1', name: 'Doctor', capacity: 1, description: '' },
    ]);
    expect(invalidated).toBe(1);
    expect(sendMock).toHaveBeenCalledWith('model', expect.objectContaining({
      id: 'msg-2',
      type: EnvelopeMessageType.SWIMLANE_UPDATE_RESULT,
      data: { success: true, error: undefined },
    }));
  });

  it('has no lane-side resource-creation entry point left', () => {
    expect((SwimLaneHandler as any).handleConvertLane).toBeUndefined();
  });
});
