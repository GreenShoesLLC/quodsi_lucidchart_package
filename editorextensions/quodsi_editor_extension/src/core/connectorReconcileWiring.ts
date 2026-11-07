// src/core/connectorReconcileWiring.ts
//
// Runs the shared connector rule (@quodsi/shared reconcileConnectors) on a Lucid
// page: build the view, decide, apply through ModelManager's write paths
// (connectorReconcile.ts), announce. Called from the document hooks
// (extension.ts), the paste hook, the block type-conversion path and, before
// every rebuild, ModelManager.ensureModelDefinition.
// Spec: docs/superpowers/specs/2026-11-06-connector-lifecycle-design.md.

import type { EditorClient, PageProxy } from 'lucid-extension-sdk';
import { Viewport } from 'lucid-extension-sdk';
import { getLogger } from '@quodsi/lucid-shared';
import { connectorNotices, reconcileConnectors, unmappedFlowLineNotices, type ReconcileAction } from '@quodsi/shared';
import type { StorageAdapter } from './StorageAdapter';
import type { ModelManager } from './ModelManager';
import { buildReconcileView, applyReconcileActions } from './connectorReconcile';
import { pageTooNewError } from './storageFormat';
import { SelectionHandler } from './messaging/handlers/selection/SelectionHandler';

const log = getLogger('connectorReconcileWiring');

/**
 * Pages with a run in progress. Applying an action goes through
 * registerElement/updateElement/removeElement, which rebuild the model, and
 * every rebuild calls reconcilePage: that nested call (and any hook firing
 * meanwhile) is skipped rather than run, so nothing recurses.
 */
const inFlight = new Set<string>();

/**
 * Pages whose Convert is running (count, for nesting). Convert's own
 * removeElement/registerElement rebuild the model, and a rule run in the middle
 * would map a line before Convert writes the user's None for it.
 */
const suspended = new Map<string, number>();

/**
 * Runs `fn` with reconcilePage a no-op for `page` (Convert); the caller runs
 * reconcilePage once after. drawio's equivalent is isConvertInProgress.
 */
export async function withReconcileSuspended<T>(page: PageProxy, fn: () => Promise<T>): Promise<T> {
    suspended.set(page.id, (suspended.get(page.id) ?? 0) + 1);
    try {
        return await fn();
    } finally {
        const n = (suspended.get(page.id) ?? 1) - 1;
        if (n > 0) suspended.set(page.id, n);
        else suspended.delete(page.id);
    }
}

/**
 * Brings the page's lines in line with the rule. Returns the applied actions.
 * A call made while a run is in progress for the same page, or while Convert
 * runs on it (withReconcileSuspended), returns [] at once.
 * Never rejects: a failure is logged and returns [] (callers include
 * ensureModelDefinition and saveElementData, which must not fail over it).
 */
export async function reconcilePage(
    page: PageProxy,
    deps: { storage: StorageAdapter; modelManager: ModelManager }
): Promise<ReconcileAction[]> {
    const { storage, modelManager } = deps;
    if (inFlight.has(page.id) || suspended.has(page.id)) return [];
    if (!storage.isQuodsiModel(page) || pageTooNewError(storage, page)) return [];
    inFlight.add(page.id);
    try {
        const view = buildReconcileView(page, storage);
        const actions = reconcileConnectors(view);
        if (actions.length === 0) return [];

        // The writes resolve elements through the manager's current page.
        if (modelManager.getCurrentPageId() !== page.id) modelManager.setCurrentPage(page);

        // Deferred: this run may itself be inside a validation run's rebuild,
        // and a write's validation would wait on that run -- a deadlock.
        const { applied, failed } = await modelManager.withValidationDeferred(() =>
            applyReconcileActions(page, actions, deps)
        );

        const notices = [...connectorNotices(applied, view), ...unmappedFlowLineNotices(failed, view)];
        if (notices.length > 0) modelManager.pushNotices(notices);
        if (applied.length > 0) modelManager.invalidateModelCache();
        return applied;
    } catch (err) {
        // A convenience step: the build, validation or save it runs ahead of
        // must go on (applyReconcileActions already catches per action).
        log.error(`Connector reconcile failed for page ${page.id}; lines left as they are:`, err);
        return [];
    } finally {
        inFlight.delete(page.id);
    }
}

export interface DiagramChangeDeps {
    storageAdapter: StorageAdapter;
    modelManager: ModelManager;
    client: EditorClient;
}

/** reconcilePage on the page Lucid is showing; [] when there is none. */
export async function reconcileCurrentPage(deps: DiagramChangeDeps): Promise<ReconcileAction[]> {
    const page = new Viewport(deps.client).getCurrentPage();
    if (!page) return [];
    return reconcilePage(page, { storage: deps.storageAdapter, modelManager: deps.modelManager });
}

/**
 * The document hooks' handler (create, delete, all changes). When anything
 * changed, re-runs the selection so the panel shows the new types and the
 * validation that drains the notices. Never rejects: extension.ts calls it as
 * `void onDiagramChanged(...)`.
 */
export async function onDiagramChanged(deps: DiagramChangeDeps): Promise<ReconcileAction[]> {
    try {
        const applied = await reconcileCurrentPage(deps);
        if (applied.length > 0) await refreshSelection(deps);
        return applied;
    } catch (err) {
        log.error('Connector reconcile failed:', err);
        return [];
    }
}

async function refreshSelection({ client, modelManager }: DiagramChangeDeps): Promise<void> {
    try {
        const viewport = new Viewport(client);
        await SelectionHandler.handleLucidSelectionEvent(client, viewport.getSelectedItems(), modelManager);
    } catch (err) {
        log.error('Error refreshing selection after connector reconcile:', err);
    }
}
