import { ElementProxy, PageProxy } from 'lucid-extension-sdk';
import { SimulationObjectType, getLogger, type Connector } from '@quodsi/lucid-shared';
import type { ReconcileAction, ReconcileLine, ReconcileShape, ReconcileView } from '@quodsi/shared';
import { StorageAdapter } from './StorageAdapter';
import type { ModelManager } from './ModelManager';
import { toFlowType } from '../services/conversion/LucidPageAnalyzer';
import { LucidElementFactory } from '../services/LucidElementFactory';
import { blockToNameable, lineToNameable } from '../types/nameableShape';

const log = getLogger('connectorReconcile');

type StoredRecord = Record<string, unknown> & { id: string };

/**
 * The host-neutral view of one page that the shared connector rule reads.
 * Pure reads: nothing here writes.
 */
export function buildReconcileView(page: PageProxy, storage: StorageAdapter): ReconcileView {
    const shapes: ReconcileShape[] = [];
    for (const [id, block] of page.allBlocks) {
        const info = storage.getElementType(block);
        const stored = info ? storage.getElementData<{ name?: string }>(block) : null;
        shapes.push({
            id,
            flowType: toFlowType(info?.type),
            name: stored?.name || blockToNameable(block).text || id,
        });
    }

    const skipped = storage.getSkippedElements(page);
    const lines: ReconcileLine[] = [];
    for (const [id, line] of page.allLines) {
        const isConnector = storage.getElementType(line)?.type === SimulationObjectType.Connector;
        lines.push({
            id,
            ends: [line.getEndpoint1()?.connection?.id ?? null, line.getEndpoint2()?.connection?.id ?? null],
            text: lineToNameable(line).text ?? null,
            hostName: null,
            mapped: isConnector ? (storage.getElementData<StoredRecord>(line) as ReconcileLine['mapped']) : null,
            optedOut: skipped[id] === 'user',
            stash: storage.getConnectorStash(line) as ReconcileLine['stash'],
        });
    }
    return { shapes, lines };
}

/**
 * Applies the rule's actions through Lucid's write paths. One failing write
 * never aborts the rest. Never writes the skip record: only the user's explicit
 * None opts a line out.
 */
export async function applyReconcileActions(
    page: PageProxy,
    actions: ReconcileAction[],
    deps: { storage: StorageAdapter; modelManager: ModelManager }
): Promise<{ applied: ReconcileAction[]; failed: ReconcileAction[] }> {
    const applied: ReconcileAction[] = [];
    const failed: ReconcileAction[] = [];
    for (const action of actions) {
        try {
            const line = page.allLines.get(action.lineId);
            if (!line) throw new Error(`line ${action.lineId} not on page`);
            await applyOne(line, action, deps);
            applied.push(action);
        } catch (error) {
            log.error(`Reconcile ${action.kind} failed for line ${action.lineId}:`, error);
            failed.push(action);
        }
    }
    return { applied, failed };
}

async function applyOne(
    line: ElementProxy,
    action: ReconcileAction,
    { storage, modelManager }: { storage: StorageAdapter; modelManager: ModelManager }
): Promise<void> {
    switch (action.kind) {
        case 'map': {
            if (action.restore) {
                storage.setElementData(
                    line,
                    { ...action.restore, id: line.id, sourceId: action.sourceId, targetId: action.targetId },
                    SimulationObjectType.Connector
                );
                // Read it back through the Lucid class so registerElement puts it
                // in the cached model and marks the model dirty (a bare q_data
                // write leaves the cache stale).
                const restored = new LucidElementFactory(storage)
                    .createPlatformObject(line, SimulationObjectType.Connector)
                    .getSimulationObject() as Connector;
                restored.sourceId = action.sourceId;
                restored.targetId = action.targetId;
                await modelManager.registerElement(restored, line);
            } else {
                const platformObject = new LucidElementFactory(storage).createPlatformObject(
                    line,
                    SimulationObjectType.Connector,
                    true
                );
                const connector = platformObject.getSimulationObject() as Connector;
                connector.sourceId = action.sourceId;
                connector.targetId = action.targetId;
                connector.weight = 1;
                connector.name = action.name;
                platformObject.updateFromPlatform();
                await modelManager.registerElement(connector, line);
            }
            storage.setConnectorStash(line, null);
            return;
        }
        case 'unmap': {
            const priorStash = storage.getConnectorStash(line);
            storage.setConnectorStash(line, action.stash);
            await modelManager.removeElement(line.id);
            // removeElement returns silently when it cannot act (element not
            // found, page too new); only a cleared q_data counts as unmapped.
            if (storage.getElementType(line)) {
                storage.setConnectorStash(line, priorStash);
                throw new Error(`removeElement left line ${line.id} mapped`);
            }
            return;
        }
        case 'refresh': {
            const connector = new LucidElementFactory(storage)
                .createPlatformObject(line, SimulationObjectType.Connector)
                .getSimulationObject() as Connector;
            connector.sourceId = action.sourceId;
            connector.targetId = action.targetId;
            await modelManager.updateElement(connector);
            // updateElement returns silently on a too-new page.
            const stored = storage.getElementData<{ sourceId?: string; targetId?: string }>(line);
            if (stored?.sourceId !== action.sourceId || stored?.targetId !== action.targetId) {
                throw new Error(`updateElement did not store the ends of line ${line.id}`);
            }
            return;
        }
    }
}
