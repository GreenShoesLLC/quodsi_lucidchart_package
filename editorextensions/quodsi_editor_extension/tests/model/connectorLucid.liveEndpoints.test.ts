// editorextensions/quodsi_editor_extension/tests/model/connectorLucid.liveEndpoints.test.ts
//
// Paste hardening: a connector's endpoints are a property of the LINE, not of
// its stored blob.
//
// Lucid copies shapeData wholesale on paste, so a pasted connector arrives
// carrying the ORIGINAL's `sourceId`/`targetId` while the pasted line is
// attached to the pasted blocks. Reconstruction preferred storage
// (`storedData?.sourceId || endpoint1.connection?.id`), so the copy reported
// the ORIGINAL's blocks: the published model routed the copy's flow into the
// original's activities, and the diagram and the model disagreed with no
// warning anywhere. Re-attaching an endpoint by hand had the same problem
// from the other direction -- storage kept naming the block the line used to
// touch.
//
// The live line therefore wins, and storage is the fallback for the case it
// is the only answer available: a DETACHED endpoint, which LineProxy reports
// as `connection === undefined`. Otherwise a line dragged loose would silently
// lose the routing it was given.
//
// Out of scope on purpose: the stored `name`. A pasted connector still carries
// its "A -> B" name from the original pair, because names are user-visible,
// user-editable-by-relabelling text and rewriting them here would fight the
// naming policy in LucidPageConversionService.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ConnectorLucid } from '../../src/types/ConnectorLucid';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeLine } from '../helpers/fakeProxies';

/** The stored blob a pasted connector inherits from the shape it was copied from. */
function storeConnector(
    storage: StorageAdapter,
    line: any,
    stored: { sourceId?: string; targetId?: string }
): void {
    storage.setElementData(
        line,
        {
            id: line.id,
            name: 'Original A → Original B',
            sourceId: stored.sourceId,
            targetId: stored.targetId,
            weight: 1,
            sourceX: 1,
            sourceY: 2,
            targetX: 3,
            targetY: 4,
            x: 2,
            y: 3,
        },
        SimulationObjectType.Connector
    );
}

describe('ConnectorLucid endpoints follow the live line', () => {
    it('reports the blocks the line is ACTUALLY attached to, not the pasted ones', () => {
        const storage = new StorageAdapter();
        const line = makeFakeLine('conn-copy', {
            endpoint1: { x: 10, y: 10, connection: { id: 'blk-C' } },
            endpoint2: { x: 20, y: 20, connection: { id: 'blk-D' } },
        });
        storeConnector(storage, line, { sourceId: 'blk-A', targetId: 'blk-B' });

        const connector = new ConnectorLucid(line, storage).getSimulationObject();

        expect(connector.sourceId).toBe('blk-C');
        expect(connector.targetId).toBe('blk-D');
    });

    it('keeps the stored id for a DETACHED endpoint -- the live line has no answer there', () => {
        const storage = new StorageAdapter();
        const line = makeFakeLine('conn-1', {
            endpoint1: { x: 10, y: 10 },                       // dragged loose
            endpoint2: { x: 20, y: 20, connection: { id: 'blk-D' } },
        });
        storeConnector(storage, line, { sourceId: 'blk-A', targetId: 'blk-B' });

        const connector = new ConnectorLucid(line, storage).getSimulationObject();

        expect(connector.sourceId).toBe('blk-A');   // storage is the fallback
        expect(connector.targetId).toBe('blk-D');   // live wins
    });

    it('a connector with no stored endpoints at all still takes the live ones', () => {
        const storage = new StorageAdapter();
        const line = makeFakeLine('conn-2', {
            endpoint1: { connection: { id: 'blk-C' } },
            endpoint2: { connection: { id: 'blk-D' } },
        });
        storeConnector(storage, line, {});

        const connector = new ConnectorLucid(line, storage).getSimulationObject();

        expect(connector.sourceId).toBe('blk-C');
        expect(connector.targetId).toBe('blk-D');
    });

    it('updateFromPlatform PERSISTS the live endpoints back into q_data', () => {
        const storage = new StorageAdapter();
        const line = makeFakeLine('conn-copy', {
            endpoint1: { x: 10, y: 10, connection: { id: 'blk-C' } },
            endpoint2: { x: 20, y: 20, connection: { id: 'blk-D' } },
        });
        storeConnector(storage, line, { sourceId: 'blk-A', targetId: 'blk-B' });

        const lucid = new ConnectorLucid(line, storage);
        lucid.updateFromPlatform();

        const persisted = storage.getElementData<any>(line);
        expect(persisted.sourceId).toBe('blk-C');
        expect(persisted.targetId).toBe('blk-D');
    });

    it('updateFromPlatform re-reads the endpoints, so a line re-attached AFTER construction is persisted', () => {
        const storage = new StorageAdapter();
        let liveSource = { id: 'blk-C' };
        const line = makeFakeLine('conn-3');
        line.getEndpoint1 = () => ({ x: 10, y: 10, connection: liveSource });
        line.getEndpoint2 = () => ({ x: 20, y: 20, connection: { id: 'blk-D' } });
        storeConnector(storage, line, { sourceId: 'blk-A', targetId: 'blk-B' });

        const lucid = new ConnectorLucid(line, storage);
        // The user drags the source end onto a different block; nothing
        // rebuilds the ConnectorLucid, updateFromPlatform is what runs.
        liveSource = { id: 'blk-E' };
        lucid.updateFromPlatform();

        expect(storage.getElementData<any>(line).sourceId).toBe('blk-E');
        expect(lucid.getSimulationObject().sourceId).toBe('blk-E');
    });

    it('leaves the stored name alone (out of scope: a pasted connector keeps its inherited name)', () => {
        const storage = new StorageAdapter();
        const line = makeFakeLine('conn-copy', {
            endpoint1: { x: 10, y: 10, connection: { id: 'blk-C' } },
            endpoint2: { x: 20, y: 20, connection: { id: 'blk-D' } },
        });
        storeConnector(storage, line, { sourceId: 'blk-A', targetId: 'blk-B' });

        const lucid = new ConnectorLucid(line, storage);
        lucid.updateFromPlatform();

        expect(storage.getElementData<any>(line).name).toBe('Original A → Original B');
    });
});
