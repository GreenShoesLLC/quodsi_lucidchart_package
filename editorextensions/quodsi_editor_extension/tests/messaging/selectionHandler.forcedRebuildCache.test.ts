// tests/messaging/selectionHandler.forcedRebuildCache.test.ts
//
// ClickUp 86e37z4nq: sendSelectionChangedMessage(true) rebuilt referenceData
// for the outgoing message but never wrote it back into SelectionState. The
// next non-forced send (e.g. RightDockPanel reopening -> setSelectionState)
// re-sent the cached pre-write copy, so a just-deleted state reappeared in
// the panel -- and an Add from that list would write it back to storage.
//
// Setup mirrors selectionHandler.pageFollow.test.ts (same SDK mock, same
// module-load Viewport patch).

import { PageProxy, Viewport } from 'lucid-extension-sdk';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};

const sendMock = jest.fn();
jest.mock('../../src/core/messaging/index', () => ({
  router: { send: sendMock },
}));

import { SelectionHandler } from '../../src/core/messaging/handlers/selection/SelectionHandler';
import { ModelManager } from '../../src/core/ModelManager';

// sendSelectionChangedMessage's rebuild calls ModelManager.getClient(), which
// throws until a client is set; without one the rebuild is silently skipped.
(ModelManager as any).editorClient = {};

function page(id: string): any {
  return Object.assign(new (PageProxy as any)(), {
    id,
    getTitle: () => id,
    allBlocks: new Map(),
    allLines: new Map(),
  });
}

const state = (id: string) => ({ id, name: id, componentType: 'model', dataType: 'number', initialValue: 0 });

function makeModelManager(p: any, states: { current: any[] }) {
  const list = <T,>(items: () => T[]) => ({ getAll: () => items() } as any);
  const mm: any = {
    currentPage: p,
    setCurrentPage(next: any) { mm.currentPage = next; },
    getCurrentPageId() { return mm.currentPage?.id; },
    isQuodsiModel: () => true,
    validateModel: async () => ({ isValid: true, issues: [] }),
    getModelDefinition: async () => ({
      activities: list(() => []),
      generators: list(() => []),
      resources: list(() => []),
      entities: list(() => []),
      resourceRequirements: list(() => []),
      connectors: list(() => []),
      states: list(() => states.current),
      timePatterns: list(() => []),
      timeDistributedConfigs: list(() => []),
      scenarios: list(() => []),
    }),
    getElementData: () => ({ name: 'M' }),
    getElementType: () => ({ type: 'Model', id: 'stored-model-id' }),
    isUnconvertedElement: () => false,
  };
  return mm;
}

const flush = () => new Promise((r) => setImmediate(r));
const lastStateIds = () =>
  (sendMock.mock.calls.at(-1)?.[1]?.data?.referenceData?.states ?? []).map((s: any) => s.id);

describe('SelectionHandler forced referenceData rebuild', () => {
  it('caches the rebuilt referenceData, so a later send does not resurrect a deleted state', async () => {
    const p = page('page-A');
    currentPage = p;
    const states = { current: [state('s1'), state('s2')] };
    const mm = makeModelManager(p, states);
    SelectionHandler.setModelManager(mm);

    // A selection event establishes the Quodsi document context.
    await SelectionHandler.handleLucidSelectionEvent({} as any, [], mm);
    await flush();
    // A processor (e.g. ActivityProcessor) caches referenceData with both states.
    await SelectionHandler.sendSelectionChangedMessage(true);
    SelectionHandler.setSelectionState({
      referenceData: sendMock.mock.calls.at(-1)?.[1]?.data?.referenceData,
    });
    await flush();
    expect(lastStateIds()).toEqual(['s1', 's2']);

    // Delete s2, then the post-write forced refresh.
    states.current = [state('s1')];
    await SelectionHandler.sendSelectionChangedMessage(true);
    expect(lastStateIds()).toEqual(['s1']);

    // Panel reopen: RightDockPanel -> setSelectionState -> non-forced send.
    SelectionHandler.setSelectionState({ selectedElements: [], selectionCount: 0, totalElementCount: 0 });
    await flush();
    expect(lastStateIds()).toEqual(['s1']);
    expect(SelectionHandler.getSelectionState().referenceData?.states?.map((s: any) => s.id)).toEqual(['s1']);
  });
});
