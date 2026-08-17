// tests/model/modelManager.cascadeCleanup.test.ts
//
// Review F2 (HIGH) on wire-cleanup Phase B2 Task 9: three cascade-cleanup
// sites in ModelManager.ts still referenced pre-clean field names/shapes
// (a sibling loop in the same function was already converted; these three
// were missed). Each test proves the cascade actually fires end-to-end
// against real ModelManager private methods (not just field-name greps).

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakeLine, makeFakePage } from '../helpers/fakeProxies';

describe('ModelManager cascade cleanup (review F2)', () => {
    it('drops a connector condition naming the deleted state', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const line = makeFakeLine('conn-1');
        storage.setElementData(
            line,
            {
                id: 'conn-1',
                name: 'C1',
                sourceId: 'a1',
                targetId: 'a2',
                weight: 1,
                condition: { stateId: 'state-sev', comparison: 'equal', value: 'red' },
            },
            SimulationObjectType.Connector
        );
        page.allLines.set(line.id, line);

        const manager = new ModelManager(storage);
        const affected = await (manager as any).cleanupStateReferences('state-sev', 'severity', page);

        const stored = storage.getElementData<any>(line);
        expect(stored.condition).toBeNull();
        expect(affected).toBe(1);
    });

    it('leaves a connector condition on a DIFFERENT state alone', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const line = makeFakeLine('conn-1');
        storage.setElementData(
            line,
            {
                id: 'conn-1',
                name: 'C1',
                sourceId: 'a1',
                targetId: 'a2',
                weight: 1,
                condition: { stateId: 'state-sev', comparison: 'equal', value: 'red' },
            },
            SimulationObjectType.Connector
        );
        page.allLines.set(line.id, line);

        const manager = new ModelManager(storage);
        const affected = await (manager as any).cleanupStateReferences('state-other', 'urgency', page);

        const stored = storage.getElementData<any>(line);
        expect(stored.condition).toEqual({ stateId: 'state-sev', comparison: 'equal', value: 'red' });
        expect(affected).toBe(0);
    });

    it('clears a generator entityId naming the deleted entity', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('gen-1');
        storage.setElementData(
            block,
            {
                id: 'gen-1',
                name: 'Gen1',
                entityId: 'entity-1',
                interarrivalTime: { value: 1, unit: 'minutes' },
            },
            SimulationObjectType.Generator
        );
        page.allBlocks.set(block.id, block);

        const manager = new ModelManager(storage);
        const affected = await (manager as any).cleanupEntityReferences('entity-1', page);

        const stored = storage.getElementData<any>(block);
        expect(stored.entityId).toBe('');
        expect(affected).toBe(1);
    });

    it('leaves a generator entityId naming a DIFFERENT entity alone', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('gen-1');
        storage.setElementData(
            block,
            {
                id: 'gen-1',
                name: 'Gen1',
                entityId: 'entity-1',
                interarrivalTime: { value: 1, unit: 'minutes' },
            },
            SimulationObjectType.Generator
        );
        page.allBlocks.set(block.id, block);

        const manager = new ModelManager(storage);
        const affected = await (manager as any).cleanupEntityReferences('entity-other', page);

        const stored = storage.getElementData<any>(block);
        expect(stored.entityId).toBe('entity-1');
        expect(affected).toBe(0);
    });

    it('drops an orphaned initialStates entry referencing a state no longer in storage', () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        storage.setStates(page, [
            {
                id: 'state-live',
                name: 'Live',
                componentType: 'entity',
                dataType: 'number',
                initialValue: 0,
                collectStatistics: true,
            } as any,
        ]);

        const manager = new ModelManager(storage);
        const elementData: any = {
            id: 'gen-1',
            initialStates: [
                { stateId: 'state-live', operation: 'assign', value: 1 },
                { stateId: 'state-orphan', operation: 'assign', value: 2 },
            ],
        };

        const result = (manager as any).cleanOrphanedStateModifications(
            elementData,
            SimulationObjectType.Generator,
            page
        );

        expect(result.cleaned).toBe(true);
        expect(result.data.initialStates).toEqual([
            { stateId: 'state-live', operation: 'assign', value: 1 },
        ]);
    });

    it('leaves initialStates untouched when every referenced state still exists', () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        storage.setStates(page, [
            {
                id: 'state-live',
                name: 'Live',
                componentType: 'entity',
                dataType: 'number',
                initialValue: 0,
                collectStatistics: true,
            } as any,
        ]);

        const manager = new ModelManager(storage);
        const elementData: any = {
            id: 'gen-1',
            initialStates: [{ stateId: 'state-live', operation: 'assign', value: 1 }],
        };

        const result = (manager as any).cleanOrphanedStateModifications(
            elementData,
            SimulationObjectType.Generator,
            page
        );

        expect(result.cleaned).toBe(false);
        expect(result.data.initialStates).toEqual([
            { stateId: 'state-live', operation: 'assign', value: 1 },
        ]);
    });
});
