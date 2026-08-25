// editorextensions/quodsi_editor_extension/tests/model/connectorLucid.actionsRoundtrip.test.ts
//
// Task 7 (connector-move-time-actions): `connector.actions` -- the assign /
// move-time-delay / assign pattern ConnectorMoveTimeSection edits -- has to
// survive a write-back to q_data and a fresh reconstruction from it, or every
// edit the section makes is silently dropped on the next selection. Follows
// the ActivityLucid idiom (always write the array; hydrate StateModification
// instances on read), NOT the `levers` idiom (`undefined` when empty), which
// can never clear a merged store -- see StorageAdapter.updateElementData.

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ConnectorLucid } from '../../src/types/ConnectorLucid';
import {
    SimulationObjectType,
    StateModification,
    createAssignAction,
    createDelayAction,
    createAssignModification,
    Duration,
    PeriodUnit,
} from '@quodsi/lucid-shared';
import { makeFakeLine } from '../helpers/fakeProxies';

function storeConnector(storage: StorageAdapter, line: any, extra: Record<string, unknown> = {}): void {
    storage.setElementData(
        line,
        {
            id: line.id,
            name: 'A -> B',
            sourceId: 'blk-A',
            targetId: 'blk-B',
            weight: 1,
            ...extra,
        },
        SimulationObjectType.Connector
    );
}

describe('ConnectorLucid round-trips connector.actions through shape storage', () => {
    it('round-trips connector.actions through stored shape data', () => {
        const storage = new StorageAdapter();
        const line = makeFakeLine('conn-1', {
            endpoint1: { x: 10, y: 10, connection: { id: 'blk-A' } },
            endpoint2: { x: 20, y: 20, connection: { id: 'blk-B' } },
        });
        storeConnector(storage, line);

        const departure = createAssignAction([createAssignModification('state-1', 1)]);
        const move = createDelayAction(Duration.constant(5, PeriodUnit.MINUTES));
        const arrival = createAssignAction([createAssignModification('state-2', 2)]);

        const lucid = new ConnectorLucid(line, storage);
        lucid.getSimulationObject().actions = [departure, move, arrival];
        lucid.updateFromPlatform();

        // Storage actually carries the array -- not silently dropped.
        const stored = storage.getElementData<any>(line);
        expect(stored.actions).toHaveLength(3);

        // A fresh reconstruction (what reselecting the shape does) restores
        // the same actions, with ids preserved and modifications hydrated
        // back into real StateModification instances.
        const reconstructed = new ConnectorLucid(line, storage).getSimulationObject();
        expect(reconstructed.actions).toHaveLength(3);
        expect(reconstructed.actions.map((a) => a.id)).toEqual([departure.id, move.id, arrival.id]);
        expect(reconstructed.actions).toEqual([departure, move, arrival]);
        const reconstructedDeparture = reconstructed.actions[0] as any;
        expect(reconstructedDeparture.modifications[0]).toBeInstanceOf(StateModification);
    });

    it('write-back ALWAYS stores actions as an array, so clearing to [] actually clears storage', () => {
        const storage = new StorageAdapter();
        const line = makeFakeLine('conn-2', {
            endpoint1: { x: 10, y: 10, connection: { id: 'blk-A' } },
            endpoint2: { x: 20, y: 20, connection: { id: 'blk-B' } },
        });
        const move = createDelayAction(Duration.constant(5, PeriodUnit.MINUTES));
        storeConnector(storage, line, { actions: [move] });

        const lucid = new ConnectorLucid(line, storage);
        expect(lucid.getSimulationObject().actions).toHaveLength(1);

        // The section's "Remove move time" clears actions back to [].
        lucid.getSimulationObject().actions = [];
        lucid.updateFromPlatform();

        // updateElementData merges and skips `undefined` -- only an explicit
        // `[]` on the wire can overwrite the previously-stored move time.
        const stored = storage.getElementData<any>(line);
        expect(stored.actions).toEqual([]);
        expect(new ConnectorLucid(line, storage).getSimulationObject().actions).toEqual([]);
    });

    it('a connector with no stored actions at all reconstructs with an empty array', () => {
        const storage = new StorageAdapter();
        const line = makeFakeLine('conn-3', {
            endpoint1: { x: 10, y: 10, connection: { id: 'blk-A' } },
            endpoint2: { x: 20, y: 20, connection: { id: 'blk-B' } },
        });
        storeConnector(storage, line);

        const connector = new ConnectorLucid(line, storage).getSimulationObject();
        expect(connector.actions).toEqual([]);
    });
});
