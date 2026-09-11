// tests/messaging/selectionHandler.pageFollow.test.ts
//
// Page guard (spec 2026-09-11), Fix 1 (I1): ModelManager must follow the
// Lucid page on EVERY selection event, not just the ones whose processor
// happens to call setCurrentPage (Activity/Generator/Connector/Model do;
// None/Resource/SwimLane/Multiple never did). Before this fix, switching
// pages with nothing selected left ModelManager (and therefore
// referenceData, built from ModelManager.currentPage) stamped with the
// PREVIOUS page, even though modelItemData and documentContext already
// reflected the new page -- see final-review.md C1(a)/I1 and the scratch
// probe this file adapts
// (<scratchpad>/pageswitch/pageSwitchStamp.test.ts).
//
// Mocking style mirrors tests/messaging/modelRootHandler.selectionRefresh.test.ts:
// `lucid-extension-sdk` resolves through jest.config.ts's moduleNameMapper
// to tests/__mocks__/lucid-extension-sdk.ts, and Viewport.getCurrentPage is
// monkey-patched ONCE at module load (a `let currentPage` closure), not
// re-required per test -- jest.resetModules() would hand SelectionHandler a
// different copy of the mocked 'lucid-extension-sdk' module than the one
// this file's top-level import patches.

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

function page(id: string): any {
  return Object.assign(new (PageProxy as any)(), {
    id,
    getTitle: () => id,
    allBlocks: new Map(),
    allLines: new Map(),
  });
}

function emptyModelDef() {
  const list = <T,>(items: T[]) => ({ getAll: () => items } as any);
  return {
    activities: list([]),
    generators: list([]),
    resources: list([]),
    entities: list([]),
    resourceRequirements: list([]),
    connectors: list([]),
    states: list([]),
    timePatterns: list([]),
    timeDistributedConfigs: list([]),
    scenarios: list([]),
  };
}

function makeModelManager(startingPage: any) {
  const mm: any = {
    currentPage: startingPage,
    setCurrentPage(p: any) {
      mm.currentPage = p;
    },
    getCurrentPageId() {
      return mm.currentPage?.id;
    },
    isQuodsiModel: () => true,
    validateModel: async () => ({ isValid: true, issues: [] }),
    getModelDefinition: async () => emptyModelDef(),
    getElementData: () => ({ name: 'M' }),
    getElementType: () => ({ type: 'Model', id: 'stored-model-id' }),
    isUnconvertedElement: () => false,
  };
  return mm;
}

const flush = () => new Promise((r) => setImmediate(r));

describe('SelectionHandler.handleLucidSelectionEvent follows the Lucid page', () => {
  beforeEach(() => {
    sendMock.mockClear();
    currentPage = null;
  });

  it('moves ModelManager to the viewport page, before referenceData is built, when nothing is selected', async () => {
    const pageA = page('page-A');
    const pageB = page('page-B');
    currentPage = pageB;

    const mm = makeModelManager(pageA);
    const setCurrentPageSpy = jest.spyOn(mm, 'setCurrentPage');
    SelectionHandler.setModelManager(mm);

    await SelectionHandler.handleLucidSelectionEvent({} as any, [], mm);
    await flush();

    expect(setCurrentPageSpy).toHaveBeenCalledWith(pageB);
    expect(mm.getCurrentPageId()).toBe('page-B');

    const data = sendMock.mock.calls.at(-1)?.[1]?.data;
    expect(data?.referenceData?.pageId).toBe('page-B');
  });

  it('does not call setCurrentPage when ModelManager already matches the viewport page', async () => {
    const pageB = page('page-B');
    currentPage = pageB;

    const mm = makeModelManager(pageB);
    const setCurrentPageSpy = jest.spyOn(mm, 'setCurrentPage');
    SelectionHandler.setModelManager(mm);

    await SelectionHandler.handleLucidSelectionEvent({} as any, [], mm);
    await flush();

    expect(setCurrentPageSpy).not.toHaveBeenCalled();
  });
});
