// tests/model/connectorLucid.entityTypeCondition.test.ts
//
// A connector's routing condition is a Condition: on a state, or on the
// entity's type (custom metrics, Task 11). ConnectorLucid reads it back by
// kind, so an entity-type condition comes back as one instead of being forced
// through StateCondition.fromJSON (which throws on it, losing the condition).
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ConnectorLucid } from '../../src/types/ConnectorLucid';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { EntityTypeCondition, StateCondition, isEntityTypeCondition } from '@quodsi/shared';
import { makeFakeLine } from '../helpers/fakeProxies';

function lineWithCondition(condition: unknown) {
    const storage = new StorageAdapter();
    const line = makeFakeLine('conn-1', {
        endpoint1: { x: 10, y: 10, connection: { id: 'blk-A' } },
        endpoint2: { x: 20, y: 20, connection: { id: 'blk-B' } },
    });
    storage.setElementData(
        line,
        { id: 'conn-1', name: 'A -> B', sourceId: 'blk-A', targetId: 'blk-B', weight: 1, condition },
        SimulationObjectType.Connector,
    );
    return { storage, line };
}

describe('ConnectorLucid reads a stored condition by kind', () => {
    it('round-trips an entity-type condition', () => {
        const { storage, line } = lineWithCondition({ entityId: 'ent-patient', comparison: 'not_equal' });

        const first = new ConnectorLucid(line, storage);
        expect(first.getSimulationObject().condition).toBeInstanceOf(EntityTypeCondition);
        first.updateFromPlatform();

        const condition = new ConnectorLucid(line, storage).getSimulationObject().condition;
        expect(isEntityTypeCondition(condition)).toBe(true);
        expect(condition).toEqual(new EntityTypeCondition('ent-patient', 'not_equal' as any));
        expect(storage.getElementData<any>(line).condition).toEqual({ entityId: 'ent-patient', comparison: 'not_equal' });
    });

    it('still reads a state condition as one', () => {
        const { storage, line } = lineWithCondition({ stateId: 's-1', comparison: 'equal', value: 3 });

        const condition = new ConnectorLucid(line, storage).getSimulationObject().condition;
        expect(condition).toBeInstanceOf(StateCondition);
        expect(isEntityTypeCondition(condition)).toBe(false);
    });
});
