// Page guard (spec 2026-09-11, decision 5): ModelManager keeps one cached
// ModelDefinition. The rebuild diffs the cached model against the new one to
// find canvas deletions (detectAndCleanupDeletedElements) and writes cleanups
// to the page being rebuilt. After a page switch the cached model belongs to
// ANOTHER page, so diffing it treated that page's elements as deleted from
// this one. The diff must run only when rebuilding the same page.
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { ModelDefinitionPageBuilder } from '../../src/core/ModelDefinitionPageBuilder';
import { ModelDefinition, Model } from '@quodsi/lucid-shared';
import { makeFakePage } from '../helpers/fakeProxies';

describe('ModelManager rebuild diff is page-scoped', () => {
    afterEach(() => jest.restoreAllMocks());

    function setup() {
        const manager: any = new ModelManager(new StorageAdapter());
        const pageA = makeFakePage('page-A');
        const pageB = makeFakePage('page-B');
        jest.spyOn(ModelDefinitionPageBuilder.prototype, 'buildFromConvertedPage')
            .mockImplementation(() => new ModelDefinition(new Model('model-1', 'M', 1)));
        const diff = jest.spyOn(manager, 'detectAndCleanupDeletedElements').mockResolvedValue(undefined);
        return { manager, pageA, pageB, diff };
    }

    async function rebuildOn(manager: any, page: any) {
        manager.setCurrentPage(page);
        // Skip the once-per-page storage upgrade block -- not under test.
        manager.versionCheckedPageId = page.id;
        await manager.ensureModelDefinition();
    }

    it("does not diff page A's cached model against page B after a page switch", async () => {
        const { manager, pageA, pageB, diff } = setup();

        await rebuildOn(manager, pageA);
        await rebuildOn(manager, pageB);

        expect(diff).not.toHaveBeenCalled();
    });

    it('still diffs a rebuild of the same page, so canvas deletions are cleaned up', async () => {
        const { manager, pageA, diff } = setup();

        await rebuildOn(manager, pageA);
        await rebuildOn(manager, pageA);

        expect(diff).toHaveBeenCalledTimes(1);
        expect(diff.mock.calls[0][2]).toBe(pageA);
    });

    it('diffs again once the cache belongs to the new page', async () => {
        const { manager, pageA, pageB, diff } = setup();

        await rebuildOn(manager, pageA);
        await rebuildOn(manager, pageB);
        await rebuildOn(manager, pageB);

        expect(diff).toHaveBeenCalledTimes(1);
        expect(diff.mock.calls[0][2]).toBe(pageB);
    });
});
