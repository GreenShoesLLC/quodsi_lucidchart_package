// src/core/pasteHookWiring.ts
//
// Task 2: routes DocumentProxy.hookCreateItems (registered in extension.ts)
// into the Task 1 normalizer (normalizePastedItems). Pulled out as a plain,
// dependency-injected function -- rather than inlined in extension.ts's
// callback -- so it is directly testable: booting extension.ts under Jest
// is impractical (it constructs a real EditorClient, the ModelManager
// singleton, panels, and the whole messaging system for a live Lucid
// document).

import type { ItemProxy, EditorClient, PageProxy } from 'lucid-extension-sdk';
import { DocumentProxy, Viewport } from 'lucid-extension-sdk';
import { ValidationMessages, ValidationSeverity, getLogger } from '@quodsi/lucid-shared';
import { StorageAdapter } from './StorageAdapter';
import type { ModelManager } from './ModelManager';
import { normalizePastedItems } from './PasteNormalizer';
import { SelectionHandler } from './messaging/handlers/selection/SelectionHandler';

const log = getLogger('pasteHookWiring');

export interface PasteHookDeps {
    storageAdapter: StorageAdapter;
    modelManager: ModelManager;
    client: EditorClient;
}

/**
 * Handles a DocumentProxy.hookCreateItems callback: normalizes any pasted
 * items among `items`, and -- only when something was actually normalized --
 * pushes the resulting notices onto the consumed-once notices channel,
 * invalidates the cached ModelDefinition, and re-runs the current selection
 * so the open panel's referenceData reflects the just-normalized data. Same
 * refresh posture ModelRootHandler.handleUpdate performs after a successful
 * model-root write (see its tail): a fresh `new Viewport(client)` read of the
 * current selection, in its own try/catch so a refresh failure never masks
 * the normalization that already succeeded.
 */
export async function onItemsCreated(items: ItemProxy[], deps: PasteHookDeps): Promise<void> {
    // extension.ts invokes this as `void onItemsCreated(...)`: nothing awaits
    // the promise, so a rejection would surface as an unhandled rejection in
    // the live editor rather than as a handled error. Everything below is
    // therefore inside one guard -- the normalizer has its own per-page and
    // per-item catches, but the wiring around it (the notices channel, the
    // cache invalidation, the DocumentProxy construction) has none.
    try {
        await normalizeAndRefresh(items, deps);
    } catch (err) {
        log.error('Paste hook failed; pasted items left as-is:', err);
    }
}

async function normalizeAndRefresh(items: ItemProxy[], deps: PasteHookDeps): Promise<void> {
    const { storageAdapter, modelManager, client } = deps;

    // The cross-page pointer lookup (Resource rule 3) needs the document's other
    // pages; PageProxy has no back-reference to its document, so the normalizer
    // takes the enumeration as an option. Lazy AND memoized for the lifetime of
    // this callback: the enumeration is a live document read, and page-duplicate
    // detection alone calls it once per page in the gesture -- on top of every
    // unresolved Resource/pattern/schedule pointer. The document cannot change
    // underneath a single synchronous normalizePastedItems pass, so one read is
    // both cheaper and more self-consistent than N.
    let pages: PageProxy[] | undefined;
    const result = normalizePastedItems(items, storageAdapter, {
        allPages: () => (pages ??= [...new DocumentProxy(client).pages.values()]),
    });
    if (!result.changed) {
        return;
    }

    modelManager.pushNotices(
        result.notices.map(notice =>
            ValidationMessages.createIssue(ValidationSeverity.INFO, 'paste_normalized', notice)
        )
    );
    modelManager.invalidateModelCache();

    try {
        const viewport = new Viewport(client);
        await SelectionHandler.handleLucidSelectionEvent(client, viewport.getSelectedItems(), modelManager);
    } catch (err) {
        log.error('Error refreshing selection after paste normalization:', err);
    }
}
