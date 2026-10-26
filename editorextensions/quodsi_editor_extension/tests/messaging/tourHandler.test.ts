// editorextensions/quodsi_editor_extension/tests/messaging/tourHandler.test.ts
//
// Lucid onboarding tour (spec 2026-10-16 L2, L3, L7, §5.3-5.4, amendment 3):
// TourHandler builds the "Airport Security (example)" page with the
// Advisor's page builder, then un-converts it (the page's Model record is
// parked under q_pending_model and the page's own q_data cleared) so Convert
// stays a tour step; selects a shape by its Quodsi name; and switches back to
// the example page.
//
// Mocking style mirrors shapeOpsHandler.createPage.test.ts: Viewport and
// DocumentProxy prototypes patched over the shared SDK mock, the
// documentPagesForTests seam for DocumentProxy.pages, router.send mocked.
// The page builder is mocked here (its own behaviour is pinned by
// shapeOpsHandler.createPage.test.ts); the real builder runs in
// tourHandler.integration.test.ts.
import { Viewport, documentPagesForTests } from '../__mocks__/lucid-extension-sdk';
import { makeFakePage, makeFakeBlock, addBlock } from '../helpers/fakeProxies';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};
const setCurrentPageSpy = jest.fn((page: any) => {
  currentPage = page;
});
(Viewport.prototype as any).setCurrentPage = function (page: any): void {
  setCurrentPageSpy(page);
};
const setSelectedItemsSpy = jest.fn();
(Viewport.prototype as any).setSelectedItems = function (items: any[]): void {
  setSelectedItemsSpy(items);
};
const focusCameraSpy = jest.fn();
(Viewport.prototype as any).focusCameraOnItems = function (items: any[]): void {
  focusCameraSpy(items);
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

const buildModelPageMock = jest.fn();
jest.mock('../../src/core/ModelPageBuilder', () => ({
  buildModelPage: (...args: unknown[]) => buildModelPageMock(...args),
}));

const refreshPageContextMock = jest.fn();
jest.mock('../../src/core/messaging/handlers/pageContextRefresh', () => ({
  refreshPageContext: (...args: unknown[]) => refreshPageContextMock(...args),
}));

import { EnvelopeMessageType, SimulationObjectType } from '@quodsi/lucid-shared';
import { TourHandler } from '../../src/core/messaging/handlers/tourHandler';
import { sizeForLucid } from '../../src/core/lucidDrawSizing';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import {
  AIRPORT_SECURITY_EXAMPLE,
  EXAMPLE_PAGE_TITLE,
} from '../../src/core/examples/airportSecurityExample';

const storage = new StorageAdapter();

function titledPage(id: string, title: string): any {
  const page = makeFakePage(id);
  page.getTitle = () => title;
  page.delete = jest.fn(() => {
    const i = documentPagesForTests.indexOf(page);
    if (i >= 0) documentPagesForTests.splice(i, 1);
  });
  return page;
}

function msg(type: EnvelopeMessageType, data: unknown, id = 'req-1', source = 'model-iframe'): any {
  return { id, type, source, target: 'host', version: '1.0', data };
}

function replies(type: EnvelopeMessageType) {
  return sendMock.mock.calls.filter((c) => c[1]?.type === type);
}

/** What the real builder leaves behind: a page carrying a Model q_data
 *  record (the document's run settings) and one tuned activity block. */
function fakeBuild(document: Record<string, any>, opts: { title: string }) {
  const page = titledPage('page-new', opts.title);
  storage.setElementData(page, {
    id: page.id,
    name: document.name,
    replications: document.replications,
    seed: document.seed,
  } as any, SimulationObjectType.Model);
  const block = addBlock(page, makeFakeBlock('blk-screening', { text: 'Security Screening' }));
  storage.setElementData(block, { id: block.id, name: 'Security Screening', capacity: 3 } as any, SimulationObjectType.Activity);
  documentPagesForTests.push(page);
  currentPage = page;
  return { page, idMap: {} };
}

let userPage: any;

beforeEach(() => {
  sendMock.mockClear();
  setCurrentPageSpy.mockClear();
  setSelectedItemsSpy.mockClear();
  focusCameraSpy.mockClear();
  refreshPageContextMock.mockClear();
  buildModelPageMock.mockReset();
  buildModelPageMock.mockImplementation(async (document: any, opts: any) => fakeBuild(document, opts));

  documentPagesForTests.length = 0;
  userPage = titledPage('page-user', 'My process');
  documentPagesForTests.push(userPage);
  currentPage = userPage;

  modelManagerStub = {
    getStorageAdapter: () => storage,
    resetState: jest.fn(),
    setCurrentPage: jest.fn(),
  };
});

const flush = () => new Promise((r) => setImmediate(r));

describe('TOUR_LOAD_EXAMPLE', () => {
  it("loads the example on a new page titled 'Airport Security (example)', unconverted", async () => {
    expect(TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: false }))).toBe(true);
    await flush();

    expect(buildModelPageMock).toHaveBeenCalledWith(sizeForLucid(AIRPORT_SECURITY_EXAMPLE), { title: EXAMPLE_PAGE_TITLE });
    const page = documentPagesForTests.find((p) => p.id === 'page-new');
    expect(page.getTitle()).toBe('Airport Security (example)');

    // Un-converted: no Model q_data on the page; the record is parked.
    expect(storage.isQuodsiModel(page)).toBe(false);
    // Per-shape tuned data survives the un-convert.
    expect(storage.getElementData<any>(page.allBlocks.get('blk-screening')).capacity).toBe(3);

    expect(modelManagerStub.resetState).toHaveBeenCalled();
    expect(modelManagerStub.setCurrentPage).toHaveBeenLastCalledWith(page);
    expect(refreshPageContextMock).toHaveBeenCalledWith(expect.anything(), 'page-new', modelManagerStub, { isQuodsiModel: false });

    const r = replies(EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT);
    expect(r).toHaveLength(1);
    expect(r[0][0]).toBe('model');
    expect(r[0][1]).toMatchObject({ id: 'req-1', target: 'model-iframe', data: { outcome: 'loaded', pageId: 'page-new' } });

    // The parked record is what Convert takes back (read last: take clears it).
    expect((storage.takePendingModel(page) as any).replications).toBe(10);
  });

  it("replies 'loaded' only after the page-context refresh has gone out (no pause-card flash)", async () => {
    let finishRefresh!: () => void;
    refreshPageContextMock.mockImplementationOnce(() => new Promise<void>((r) => { finishRefresh = r; }));
    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: false }));
    await flush();
    expect(refreshPageContextMock).toHaveBeenCalledTimes(1);
    expect(replies(EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT)).toHaveLength(0);

    finishRefresh();
    await flush();
    expect(replies(EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT)[0][1].data).toMatchObject({ outcome: 'loaded' });
  });

  it('existing example page + replace:false -> occupied, nothing created', async () => {
    const existing = titledPage('page-old-example', EXAMPLE_PAGE_TITLE);
    documentPagesForTests.push(existing);

    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: false }));
    await flush();

    expect(buildModelPageMock).not.toHaveBeenCalled();
    expect(existing.delete).not.toHaveBeenCalled();
    expect(documentPagesForTests.map((p) => p.id)).toEqual(['page-user', 'page-old-example']);
    expect(replies(EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT)[0][1].data).toEqual({ outcome: 'occupied' });
  });

  it('replace:true deletes the old example page and builds a new one; other pages untouched', async () => {
    const existing = titledPage('page-old-example', EXAMPLE_PAGE_TITLE);
    documentPagesForTests.push(existing);

    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: true }));
    await flush();

    expect(existing.delete).toHaveBeenCalled();
    expect(userPage.delete).not.toHaveBeenCalled();
    expect(documentPagesForTests.map((p) => p.id)).toEqual(['page-user', 'page-new']);
    expect(replies(EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT)[0][1].data).toEqual({ outcome: 'loaded', pageId: 'page-new' });
  });

  it('build failure -> failed, and no page left behind', async () => {
    buildModelPageMock.mockRejectedValue(new Error('create model failed at blk: nope'));

    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: false }));
    await flush();

    expect(documentPagesForTests.map((p) => p.id)).toEqual(['page-user']);
    expect(refreshPageContextMock).not.toHaveBeenCalled();
    expect(replies(EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT)[0][1].data).toEqual({
      outcome: 'failed',
      error: 'create model failed at blk: nope',
    });
  });

  it('a failure after the build deletes the new page and restores the original one', async () => {
    const spy = jest.spyOn(storage, 'setPendingModel').mockImplementationOnce(() => {
      throw new Error('storage full');
    });

    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: false }));
    await flush();
    spy.mockRestore();

    expect(documentPagesForTests.map((p) => p.id)).toEqual(['page-user']);
    expect(setCurrentPageSpy).toHaveBeenLastCalledWith(userPage);
    expect(modelManagerStub.setCurrentPage).toHaveBeenLastCalledWith(userPage);
    expect(replies(EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT)[0][1].data).toEqual({ outcome: 'failed', error: 'storage full' });
  });

  it('replace:true keeps the old example page when the build fails', async () => {
    const existing = titledPage('page-old-example', EXAMPLE_PAGE_TITLE);
    documentPagesForTests.push(existing);
    buildModelPageMock.mockRejectedValue(new Error('boom'));

    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: true }));
    await flush();

    expect(existing.delete).not.toHaveBeenCalled();
    expect(replies(EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT)[0][1].data).toEqual({ outcome: 'failed', error: 'boom' });
  });

  it('replies on the studio-embed channel for a studio-embed request', async () => {
    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_LOAD_EXAMPLE, { replace: false }, 'req-9', 'studio-embed-iframe'));
    await flush();
    const r = replies(EnvelopeMessageType.TOUR_LOAD_EXAMPLE_RESULT);
    expect(r[0][0]).toBe('studio-embed');
    expect(r[0][1]).toMatchObject({ id: 'req-9', target: 'studio-embed-iframe' });
  });
});

describe('TOUR_SELECT_SHAPE', () => {
  function pageWithShapes() {
    const page = titledPage('page-ex', EXAMPLE_PAGE_TITLE);
    const a = addBlock(page, makeFakeBlock('b-a', { text: 'ID Check' }));
    const b = addBlock(page, makeFakeBlock('b-b', { text: 'screening (canvas text)' }));
    storage.setElementData(a, { id: 'b-a', name: 'ID Check' } as any, SimulationObjectType.Activity);
    storage.setElementData(b, { id: 'b-b', name: 'Security Screening' } as any, SimulationObjectType.Activity);
    currentPage = page;
    return { page, a, b };
  }

  it('selects and focuses the block whose Quodsi name matches', async () => {
    const { b } = pageWithShapes();
    expect(TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_SELECT_SHAPE, { name: 'Security Screening' }))).toBe(true);
    await flush();
    expect(setSelectedItemsSpy).toHaveBeenCalledWith([b]);
    expect(focusCameraSpy).toHaveBeenCalledWith([b]);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('null clears the selection', async () => {
    pageWithShapes();
    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_SELECT_SHAPE, { name: null }));
    await flush();
    expect(setSelectedItemsSpy).toHaveBeenCalledWith([]);
    expect(focusCameraSpy).not.toHaveBeenCalled();
  });

  it('no match selects nothing and sends no reply', async () => {
    pageWithShapes();
    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_SELECT_SHAPE, { name: 'Nope' }));
    await flush();
    expect(setSelectedItemsSpy).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('TOUR_SHOW_EXAMPLE_PAGE', () => {
  it('shown: switches to the example page', async () => {
    const example = titledPage('page-ex', EXAMPLE_PAGE_TITLE);
    documentPagesForTests.push(example);
    expect(TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, {}, 'req-show'))).toBe(true);
    await flush();
    expect(setCurrentPageSpy).toHaveBeenCalledWith(example);
    const r = replies(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT);
    expect(r[0][1]).toMatchObject({ id: 'req-show', data: { outcome: 'shown', pageId: 'page-ex' } });
  });

  it('missing: no example page', async () => {
    TourHandler.handleMessage(msg(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE, {}, 'req-show'));
    await flush();
    expect(setCurrentPageSpy).not.toHaveBeenCalled();
    expect(replies(EnvelopeMessageType.TOUR_SHOW_EXAMPLE_PAGE_RESULT)[0][1].data).toEqual({ outcome: 'missing' });
  });
});

it('ignores other message types', () => {
  expect(TourHandler.handleMessage(msg(EnvelopeMessageType.SHAPE_CREATE, {}))).toBe(false);
});

