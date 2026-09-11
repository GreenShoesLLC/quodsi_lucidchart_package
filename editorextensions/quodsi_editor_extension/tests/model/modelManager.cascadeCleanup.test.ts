// tests/model/modelManager.cascadeCleanup.test.ts
//
// Review F2 (HIGH) on wire-cleanup Phase B2 Task 9: three cascade-cleanup
// sites in ModelManager.ts still referenced pre-clean field names/shapes
// (a sibling loop in the same function was already converted; these three
// were missed). Each test proves the cascade actually fires end-to-end
// against real ModelManager private methods (not just field-name greps).

import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { ModelDefaults, SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakeLine, makeFakePage } from '../helpers/fakeProxies';

const DEFAULT_ENT = ModelDefaults.DEFAULT_ENTITY_ID;

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

    it('re-points a generator entityId naming the deleted entity to the fallback', async () => {
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
        const affected = await (manager as any).cleanupEntityReferences('entity-1', DEFAULT_ENT, page);

        const stored = storage.getElementData<any>(block);
        expect(stored.entityId).toBe(DEFAULT_ENT);
        expect(stored.interarrivalTime).toEqual({ value: 1, unit: 'minutes' });
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
        const affected = await (manager as any).cleanupEntityReferences('entity-other', DEFAULT_ENT, page);

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

    // --- connector entityId (entity-template routing edges) ----------------
    //
    // The connectors loop cleaned only `actions`, never the connector's own
    // `entityId`, so deleting an entity left every entity-template edge
    // pointing at a dead id. The engine's clean loader cross-references it
    // (`root.py` check 4) and rejects the WHOLE document -- the model stops
    // loading, with an error naming an entity the user already deleted.
    //
    // DELETED, not set to "": `entityId` is OPTIONAL on a connector ("no
    // entity-template restriction"), unlike Generator.entityId and
    // Activity.sourceConfig.entityId, which are REQUIRED and use "" as their
    // unset sentinel. `setElementData` re-stringifies the whole envelope, so
    // a `delete` really does clear -- this is not the `updateElementData`
    // merge path, whose undefined-stripping cannot express deletion.

    it('drops a connector entityId naming the deleted entity', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const line = makeFakeLine('conn-1');
        storage.setElementData(
            line,
            {
                id: 'conn-1',
                name: 'done -> split_b',
                sourceId: 'a1',
                targetId: 'a2',
                weight: 1,
                entityId: 'entity-1',
            },
            SimulationObjectType.Connector
        );
        page.allLines.set(line.id, line);

        const manager = new ModelManager(storage);
        const affected = await (manager as any).cleanupEntityReferences('entity-1', DEFAULT_ENT, page);

        const stored = storage.getElementData<any>(line);
        expect(stored).not.toHaveProperty('entityId');
        expect(affected).toBe(1);
    });

    it('leaves a connector entityId naming a DIFFERENT entity alone', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const line = makeFakeLine('conn-1');
        storage.setElementData(
            line,
            {
                id: 'conn-1',
                name: 'done -> split_b',
                sourceId: 'a1',
                targetId: 'a2',
                weight: 1,
                entityId: 'entity-keep',
            },
            SimulationObjectType.Connector
        );
        page.allLines.set(line.id, line);

        const manager = new ModelManager(storage);
        const affected = await (manager as any).cleanupEntityReferences('entity-1', DEFAULT_ENT, page);

        const stored = storage.getElementData<any>(line);
        expect(stored.entityId).toBe('entity-keep');
        expect(affected).toBe(0);
    });

    it('does not touch a connector that carries no entityId at all', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const line = makeFakeLine('conn-1');
        storage.setElementData(
            line,
            { id: 'conn-1', name: 'plain', sourceId: 'a1', targetId: 'a2', weight: 1 },
            SimulationObjectType.Connector
        );
        page.allLines.set(line.id, line);

        const manager = new ModelManager(storage);
        const affected = await (manager as any).cleanupEntityReferences('entity-1', DEFAULT_ENT, page);

        expect(affected).toBe(0);
    });

    // --- shared rule (spec 2026-09-11): the host runs removeEntityReferences --

    it('re-points a self-generating activity sourceConfig.entityId to the fallback', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('act-1');
        storage.setElementData(
            block,
            { id: 'act-1', name: 'Self-gen', sourceConfig: { entityId: 'entity-1', mode: 'FREQUENCY' } },
            SimulationObjectType.Activity
        );
        page.allBlocks.set(block.id, block);

        const manager = new ModelManager(storage);
        const affected = await (manager as any).cleanupEntityReferences('entity-1', DEFAULT_ENT, page);

        const stored = storage.getElementData<any>(block);
        expect(stored.sourceConfig).toEqual({ entityId: DEFAULT_ENT, mode: 'FREQUENCY' });
        expect(affected).toBe(1);
    });

    it('nulls CREATE templates inside BRANCH and LOOP bodies on an activity', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('act-1');
        storage.setElementData(
            block,
            {
                id: 'act-1',
                name: 'Loops',
                actions: [
                    {
                        id: 'loop',
                        type: 'LOOP',
                        actions: [
                            { id: 'c1', type: 'CREATE', entityTemplateId: 'entity-1' },
                            {
                                id: 'br',
                                type: 'BRANCH',
                                ifTrue: [{ id: 'c2', type: 'CREATE', entityTemplateId: 'entity-1' }],
                                ifFalse: [],
                            },
                        ],
                    },
                ],
            },
            SimulationObjectType.Activity
        );
        page.allBlocks.set(block.id, block);

        const manager = new ModelManager(storage);
        await (manager as any).cleanupEntityReferences('entity-1', DEFAULT_ENT, page);

        const loop = storage.getElementData<any>(block).actions[0];
        expect(loop.actions[0].entityTemplateId).toBeNull();
        expect(loop.actions[1].ifTrue[0].entityTemplateId).toBeNull();
    });

    it('does not rewrite elements the rule leaves unchanged', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const touched = makeFakeBlock('gen-1');
        const untouched = makeFakeBlock('gen-2');
        storage.setElementData(touched, { id: 'gen-1', name: 'G1', entityId: 'entity-1' }, SimulationObjectType.Generator);
        storage.setElementData(untouched, { id: 'gen-2', name: 'G2', entityId: 'entity-keep' }, SimulationObjectType.Generator);
        page.allBlocks.set(touched.id, touched);
        page.allBlocks.set(untouched.id, untouched);

        const manager = new ModelManager(storage);
        const spy = jest.spyOn(storage, 'setElementData');
        const affected = await (manager as any).cleanupEntityReferences('entity-1', DEFAULT_ENT, page);

        expect(affected).toBe(1);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toBe(touched);
        expect(spy.mock.calls[0][2]).toBe(SimulationObjectType.Generator);
    });

    it('keeps the stored record id even when it differs from the block id', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = makeFakeBlock('blk-9');
        storage.setElementData(block, { id: 'legacy-id', name: 'G', entityId: 'entity-1' }, SimulationObjectType.Generator);
        page.allBlocks.set(block.id, block);

        const manager = new ModelManager(storage);
        await (manager as any).cleanupEntityReferences('entity-1', DEFAULT_ENT, page);

        const stored = storage.getElementData<any>(block);
        expect(stored.id).toBe('legacy-id');
        expect(stored.entityId).toBe(DEFAULT_ENT);
    });

    it('updateEntities re-points a generator using a removed entity to the Default Entity', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        storage.setEntities(page, [
            { id: DEFAULT_ENT, name: 'Default Entity' } as any,
            { id: 'entity-1', name: 'Customer' } as any,
        ]);
        const block = makeFakeBlock('gen-1');
        storage.setElementData(block, { id: 'gen-1', name: 'G1', entityId: 'entity-1' }, SimulationObjectType.Generator);
        page.allBlocks.set(block.id, block);

        const manager = new ModelManager(storage);
        await manager.updateEntities([{ id: DEFAULT_ENT, name: 'Default Entity' } as any], page);

        expect(storage.getElementData<any>(block).entityId).toBe(DEFAULT_ENT);
        expect(storage.getEntities(page).map((e) => e.id)).toEqual([DEFAULT_ENT]);
    });

    // --- shared state rule (spec 2026-09-11 States): the host runs removeStateReferences --

    it('cleans every state reference kind through the shared rule', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');

        const gen = makeFakeBlock('gen-1');
        storage.setElementData(
            gen,
            {
                id: 'gen-1',
                name: 'G',
                entityId: 'e',
                initialStates: [
                    { stateId: 'state-sev', operation: 'assign', value: 1 },
                    { stateId: 'state-keep', operation: 'assign', value: 2 },
                ],
            },
            SimulationObjectType.Generator
        );
        page.allBlocks.set(gen.id, gen);

        const act = makeFakeBlock('act-1');
        storage.setElementData(
            act,
            {
                id: 'act-1',
                name: 'A',
                sourceConfig: { entityId: 'e', initialStates: [{ stateId: 'state-sev', operation: 'assign', value: 1 }] },
                queueRanking: { stateId: 'state-sev', order: 'ascending' },
                actions: [
                    {
                        id: 'loop',
                        type: 'loop',
                        actions: [
                            { id: 'set', type: 'assign', modifications: [{ stateId: 'state-sev', operation: 'assign', value: 3 }] },
                            { id: 'br', type: 'branch', condition: { stateId: 'state-sev', comparison: 'equal', value: 'red' }, ifTrue: [], ifFalse: [] },
                        ],
                    },
                    { id: 'split', type: 'split', inheritStates: ['severity', 'other'], splitIndexState: 'severity' },
                    { id: 'join', type: 'join', matchState: 'severity', joinCountState: 'severity' },
                ],
            },
            SimulationObjectType.Activity
        );
        page.allBlocks.set(act.id, act);

        const line = makeFakeLine('conn-1');
        storage.setElementData(
            line,
            {
                id: 'conn-1',
                name: 'C',
                sourceId: 'act-1',
                targetId: 'a2',
                weight: 1,
                condition: { stateId: 'state-sev', comparison: 'equal', value: 'red' },
                actions: [{ id: 'ca', type: 'assign', modifications: [{ stateId: 'state-sev', operation: 'assign', value: 1 }] }],
            },
            SimulationObjectType.Connector
        );
        page.allLines.set(line.id, line);

        const manager = new ModelManager(storage);
        const affected = await (manager as any).cleanupStateReferences('state-sev', 'severity', page);

        expect(affected).toBe(3);

        const g = storage.getElementData<any>(gen);
        expect(g.initialStates).toEqual([{ stateId: 'state-keep', operation: 'assign', value: 2 }]);
        expect(g.entityId).toBe('e');

        const a = storage.getElementData<any>(act);
        expect(a.sourceConfig.initialStates).toEqual([]);
        expect('queueRanking' in a).toBe(false);
        expect(a.actions[0].actions[0].modifications).toEqual([]);
        expect(a.actions[0].actions[1].condition).toBeNull();
        expect(a.actions[1].inheritStates).toEqual(['other']);
        expect(a.actions[1].splitIndexState).toBeNull();
        expect(a.actions[2].matchState).toBeNull();
        expect(a.actions[2].joinCountState).toBeNull();

        const c = storage.getElementData<any>(line);
        expect(c.condition).toBeNull();
        expect(c.actions[0].modifications).toEqual([]);
        expect(c.weight).toBe(1);
    });

    it('state cleanup does not rewrite elements that never referenced the state', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const touched = makeFakeBlock('gen-1');
        const untouched = makeFakeBlock('gen-2');
        storage.setElementData(touched, { id: 'gen-1', name: 'G1', entityId: 'e', initialStates: [{ stateId: 'state-sev', operation: 'assign', value: 1 }] }, SimulationObjectType.Generator);
        storage.setElementData(untouched, { id: 'gen-2', name: 'G2', entityId: 'e', initialStates: [{ stateId: 'state-keep', operation: 'assign', value: 1 }] }, SimulationObjectType.Generator);
        page.allBlocks.set(touched.id, touched);
        page.allBlocks.set(untouched.id, untouched);

        const manager = new ModelManager(storage);
        const spy = jest.spyOn(storage, 'setElementData');
        const affected = await (manager as any).cleanupStateReferences('state-sev', 'severity', page);

        expect(affected).toBe(1);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0][0]).toBe(touched);
    });

    it('updateStates cleans references to a removed state end to end', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const sev = { id: 'state-sev', name: 'severity', componentType: 'entity', dataType: 'number', initialValue: 0, collectStatistics: true };
        const keep = { ...sev, id: 'state-keep', name: 'priority' };
        storage.setStates(page, [sev, keep] as any);
        const gen = makeFakeBlock('gen-1');
        storage.setElementData(gen, { id: 'gen-1', name: 'G', entityId: 'e', initialStates: [{ stateId: 'state-sev', operation: 'assign', value: 1 }] }, SimulationObjectType.Generator);
        page.allBlocks.set(gen.id, gen);

        const manager = new ModelManager(storage);
        await manager.updateStates([keep] as any, page);

        expect(storage.getElementData<any>(gen).initialStates).toEqual([]);
        expect(storage.getStates(page).map((s: any) => s.id)).toEqual(['state-keep']);
    });
});
