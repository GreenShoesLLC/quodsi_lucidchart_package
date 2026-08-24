// tests/messaging/extensionCreateItemsHook.test.ts
//
// Task 2 of the LucidChart Paste Normalizer plan: DocumentProxy.hookCreateItems
// registered in extension boot, routed into the Task 1 normalizer
// (normalizePastedItems), refreshing the model + selection whenever anything
// was normalized, and pushing consumed-once INFO notices.
//
// Booting extension.ts under Jest is impractical -- it constructs a real
// EditorClient, the ModelManager singleton, RightDockPanel, and the whole
// messaging system for a live Lucid document, none of which exist in a test
// process. The plan pre-authorizes testing the wiring function
// (onItemsCreated, exported from src/core/pasteHookWiring.ts) directly
// instead, plus a source-level check -- reading extension.ts's text via fs,
// crude but honest -- that it actually registers a hookCreateItems callback
// wired to that module.
//
// Mocking style mirrors tests/messaging/modelRootHandler.selectionRefresh.test.ts:
// Viewport monkey-patched via the shared __mocks__ file, SelectionHandler
// mocked at the same module path onItemsCreated imports it from.

import * as fs from 'fs';
import * as path from 'path';
import { Viewport, documentPagesForTests } from '../__mocks__/lucid-extension-sdk';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { SimulationObjectType, ValidationSeverity } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

let selectedItems: any[] = [];
(Viewport.prototype as any).getSelectedItems = function (): any {
  return selectedItems;
};

const handleLucidSelectionEventMock = jest.fn().mockResolvedValue(undefined);
jest.mock('../../src/core/messaging/handlers/selection/SelectionHandler', () => ({
  SelectionHandler: {
    handleLucidSelectionEvent: (...args: unknown[]) => handleLucidSelectionEventMock(...args),
  },
}));

import { onItemsCreated } from '../../src/core/pasteHookWiring';

/**
 * Duplicated from tests/core/pasteNormalizer.detection.test.ts's local
 * makePastedBlock helper (not exported there -- it's a file-local function).
 * Builds a detached block whose q_data was written for a different id, i.e.
 * it looks exactly like the result of a Lucid paste: the shape gets a new
 * id, its shapeData (including q_data) is copied verbatim.
 */
function makePastedBlock(sa: StorageAdapter, newId: string, originalId: string): any {
  const throwaway = makeFakeBlock(originalId);
  sa.setElementData(
    throwaway,
    { id: originalId, name: 'Original Activity' },
    SimulationObjectType.Activity
  );
  const rawQData = throwaway.shapeData.get('q_data');
  const block = makeFakeBlock(newId);
  block.shapeData.set('q_data', rawQData!);
  return block;
}

describe('extension.ts registers the create-items hook', () => {
  it('wires DocumentProxy.hookCreateItems to the paste-hook wiring module', () => {
    const extensionSrc = fs.readFileSync(
      path.join(__dirname, '../../src/extension.ts'),
      'utf8'
    );
    expect(extensionSrc).toMatch(/hookCreateItems/);
    expect(extensionSrc).toMatch(/onItemsCreated/);
    expect(extensionSrc).toMatch(/pasteHookWiring/);
  });
});

describe('onItemsCreated', () => {
  let sa: StorageAdapter;
  let page: any;
  let modelManagerStub: any;
  const clientStub = {};

  beforeEach(() => {
    sa = new StorageAdapter();
    page = makeFakePage('page-1');
    selectedItems = [{ id: 'shape-9' }];
    handleLucidSelectionEventMock.mockClear();
    documentPagesForTests.length = 0;
    modelManagerStub = {
      pushNotices: jest.fn(),
      invalidateModelCache: jest.fn(),
    };
  });

  it('a pasted item: pushes notices once with paste_normalized INFO issues, invalidates the cache, re-runs the selection once', async () => {
    const pastedBlock = addBlock(page, makePastedBlock(sa, 'new-id', 'old-id'));

    await onItemsCreated([pastedBlock], {
      storageAdapter: sa,
      modelManager: modelManagerStub,
      client: clientStub as any,
    });

    // Task 1's generic (default-branch) normalization doesn't itself produce
    // a notice sentence yet -- typed per-element rules with notice text land
    // in Tasks 3-7 -- so `result.notices` is currently always []; this pins
    // that pushNotices is invoked exactly once with normalizePastedItems's
    // notices mapped to paste_normalized INFO issues (an empty map of an
    // empty array is still the correct call).
    expect(modelManagerStub.pushNotices).toHaveBeenCalledTimes(1);
    const pushedIssues = modelManagerStub.pushNotices.mock.calls[0][0];
    expect(pushedIssues).toEqual([]);
    for (const issue of pushedIssues) {
      expect(issue.code).toBe('paste_normalized');
      expect(issue.severity).toBe(ValidationSeverity.INFO);
    }

    expect(modelManagerStub.invalidateModelCache).toHaveBeenCalledTimes(1);

    expect(handleLucidSelectionEventMock).toHaveBeenCalledTimes(1);
    expect(handleLucidSelectionEventMock).toHaveBeenCalledWith(
      clientStub,
      selectedItems,
      modelManagerStub
    );
  });

  // Task 3: the Resource rule's cross-page lookup needs the document's other
  // pages, and PageProxy carries no back-reference to its document -- so
  // normalizePastedItems takes an `allPages` enumerator and THIS module is
  // where the real one is built (`new DocumentProxy(client).pages`). Pinned
  // end-to-end rather than by asserting on the option object: a paste whose
  // resource lives only on ANOTHER page can only be cloned if the enumeration
  // actually reached the normalizer.
  it('passes the document page enumeration through: a resource that lives only on another page is cloned into this one', async () => {
    const otherPage = makeFakePage('page-other');
    sa.setResources(otherPage, [{ id: 'res-1', name: 'Nurse', capacity: 3, description: 'Floor nurse' }]);
    sa.setResources(page, []);
    documentPagesForTests.push(otherPage, page);

    const throwaway = makeFakeBlock('block-orig');
    sa.setElementData(throwaway, { id: 'block-orig', resourceId: 'res-1' }, SimulationObjectType.Resource);
    const pastedResource = addBlock(page, makeFakeBlock('block-new'));
    pastedResource.shapeData.set('q_data', throwaway.shapeData.get('q_data')!);

    await onItemsCreated([pastedResource], {
      storageAdapter: sa,
      modelManager: modelManagerStub,
      client: clientStub as any,
    });

    const cloned = sa.getResources(page);
    expect(cloned).toHaveLength(1);
    expect(cloned[0].name).toBe('Nurse');
    expect(cloned[0].id).not.toBe('res-1');
    expect(sa.getElementData<{ resourceId: string }>(pastedResource)!.resourceId).toBe(cloned[0].id);
    // Source page untouched.
    expect(sa.getResources(otherPage).map((r) => r.id)).toEqual(['res-1']);

    const pushedIssues = modelManagerStub.pushNotices.mock.calls[0][0];
    expect(pushedIssues).toHaveLength(1);
    expect(pushedIssues[0].code).toBe('paste_normalized');
    expect(pushedIssues[0].severity).toBe(ValidationSeverity.INFO);
  });

  it('nothing pasted: pushes no notices, does not invalidate the cache, does not re-run the selection', async () => {
    const plainBlock = addBlock(page, makeFakeBlock('plain-id'));
    sa.setElementData(plainBlock, { id: 'plain-id', name: 'Normal Activity' }, SimulationObjectType.Activity);

    await onItemsCreated([plainBlock], {
      storageAdapter: sa,
      modelManager: modelManagerStub,
      client: clientStub as any,
    });

    expect(modelManagerStub.pushNotices).not.toHaveBeenCalled();
    expect(modelManagerStub.invalidateModelCache).not.toHaveBeenCalled();
    expect(handleLucidSelectionEventMock).not.toHaveBeenCalled();
  });
});
