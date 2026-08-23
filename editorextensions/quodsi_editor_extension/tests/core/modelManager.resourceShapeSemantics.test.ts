// tests/core/modelManager.resourceShapeSemantics.test.ts
//
// Plan 2b Task 5: a Resource BLOCK is now a POINTER at a model-level
// resource, not the resource itself. Everything that used to treat the
// shape as the owning record has to stop:
//
//   - un-classifying or deleting the block clears the pointer and nothing
//     else. The resource, and every requirement that requests it, survive;
//   - a Resource-typed ELEMENT_UPDATE writes exactly `{ resourceId }` into
//     q_data -- never a rebuilt domain Resource with name/capacity/geometry;
//   - registerElement / updateElement no longer add resources or mint
//     auto-requirements (the record lives in q_resources; the builder
//     derives the auto-requirement);
//   - a block vanishing from the canvas leaves its resource in place,
//     simply unclaimed.
//
// Harness: the wireModelDefinition pattern from
// tests/model/modelManager.removeElement.arrivalPatternCleanup.test.ts (a
// real ModelDefinition wired straight in, ensureModelDefinition stubbed so
// the trailing validate does not re-run the builder over a bare fake page).

import {
    ModelDefinition,
    Model,
    Resource,
    ResourceRequirement,
    SimulationObjectType,
} from '@quodsi/lucid-shared';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { LucidVersionManager } from '../../src/versioning/LucidVersionManager';
import { router } from '../../src/core/messaging';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

function wireModelDefinition(manager: ModelManager, page: any, modelDefinition: ModelDefinition): void {
    (manager as any).currentPage = page;
    (manager as any).modelDefinition = modelDefinition;
    (manager as any).ensureModelDefinition = async () => modelDefinition;
}

/** A custom requirement that requests `resourceId` — the cascade's real target. */
function customRequirementRequesting(resourceId: string): any {
    return {
        id: 'req-custom',
        name: 'Custom',
        rootClause: { id: 'c-root', mode: 'require_all', requests: [{ resourceId, quantity: 1 }] },
    };
}

/** Records every cleanupRequirementReferences call so "no cascade" is provable. */
function trackRequirementCascade(manager: ModelManager): string[] {
    const seen: string[] = [];
    (manager as any).cleanupRequirementReferences = async (reqId: string) => { seen.push(reqId); return 0; };
    return seen;
}

describe('ModelManager — a Resource block is a pointer (Plan 2b Task 5)', () => {
    beforeEach(() => {
        jest.spyOn(router, 'send').mockImplementation(() => { });
    });
    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('removeElement on a Resource block clears the pointer only; the resource and its requirements stay', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = addBlock(page, makeFakeBlock('blk-1'));
        storage.setElementData(block, { id: 'blk-1', resourceId: 'r1' }, SimulationObjectType.Resource);
        storage.setResources(page, [{ id: 'r1', name: 'Nurse', capacity: 2 }]);
        storage.setResourceRequirements(page, [customRequirementRequesting('r1')]);
        const requirementsBefore = page.shapeData.get('q_res_requirements');

        const modelDef = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        modelDef.resources.add(new Resource('r1', 'Nurse', 2));

        const manager = new ModelManager(storage);
        wireModelDefinition(manager, page, modelDef);
        const cascaded = trackRequirementCascade(manager);

        await manager.removeElement('blk-1');

        expect(storage.getElementData(block)).toBeNull();
        expect(storage.getResources(page)).toEqual([{ id: 'r1', name: 'Nurse', capacity: 2 }]);
        expect(page.shapeData.get('q_res_requirements')).toBe(requirementsBefore);
        expect(cascaded).toEqual([]);
        expect(modelDef.resources.get('r1')).toBeDefined();
    });

    it('removeElement spares the resource even when it shares the block id (the migrated legacy convention)', async () => {
        // Format-1 blocks owned their record under the BLOCK's id, and the
        // migration keeps that id, so resourceId === blockId is the common
        // case in the field. This is the arrangement the pre-Task-5 cascade
        // actually fired on: modelDef.resources.get(elementId) hit, the
        // requirement requesting it was deleted from storage, and the
        // blanket removal dropped the resource from the model.
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = addBlock(page, makeFakeBlock('blk-1'));
        storage.setElementData(block, { id: 'blk-1', resourceId: 'blk-1' }, SimulationObjectType.Resource);
        storage.setResources(page, [{ id: 'blk-1', name: 'Nurse', capacity: 2 }]);
        storage.setResourceRequirements(page, [customRequirementRequesting('blk-1')]);
        const requirementsBefore = page.shapeData.get('q_res_requirements');

        const modelDef = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        modelDef.resources.add(new Resource('blk-1', 'Nurse', 2));

        const manager = new ModelManager(storage);
        wireModelDefinition(manager, page, modelDef);
        const cascaded = trackRequirementCascade(manager);

        await manager.removeElement('blk-1');

        expect(storage.getElementData(block)).toBeNull();
        expect(storage.getResources(page)).toEqual([{ id: 'blk-1', name: 'Nurse', capacity: 2 }]);
        expect(page.shapeData.get('q_res_requirements')).toBe(requirementsBefore);
        expect(cascaded).toEqual([]);
        expect(modelDef.resources.get('blk-1')).toBeDefined();
    });

    it('saveElementData with { resourceId } on a Resource block writes exactly the pointer and touches q_resources not at all', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = addBlock(page, makeFakeBlock('blk-1', { text: 'Nurse' }));
        // An existing pointer at a DIFFERENT resource, so the merge path runs
        // (updateElementData), not the create path.
        storage.setElementData(block, { id: 'blk-1', resourceId: 'r0' }, SimulationObjectType.Resource);
        storage.setResources(page, [{ id: 'r1', name: 'Nurse', capacity: 2 }]);
        const resourcesBefore = page.shapeData.get('q_resources');

        const modelDef = new ModelDefinition(new Model('model-1', 'Test Model', 1));
        modelDef.resources.add(new Resource('r1', 'Nurse', 2));

        const manager = new ModelManager(storage);
        wireModelDefinition(manager, page, modelDef);

        await manager.saveElementData(block, { resourceId: 'r1' }, SimulationObjectType.Resource, page);

        // Exactly the pointer: no name, no capacity, no geometry rebuilt from
        // a ResourceLucid sim object.
        expect(storage.getElementData(block)).toEqual({ id: 'blk-1', type: 'Resource', resourceId: 'r1' });
        expect(page.shapeData.get('q_resources')).toBe(resourcesBefore);
    });

    it('registerElement / updateElement with a Resource neither mint requirements nor add resources', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        const block = addBlock(page, makeFakeBlock('r1', { text: 'Nurse' }));
        storage.setElementData(block, { id: 'r1', resourceId: 'r1' }, SimulationObjectType.Resource);
        const pointerBefore = block.shapeData.get('q_data');

        const modelDef = new ModelDefinition(new Model('model-1', 'Test Model', 1));

        const manager = new ModelManager(storage);
        wireModelDefinition(manager, page, modelDef);

        const dirtied: string[] = [];
        const originalMarkDirty = (manager as any).markModelDirty.bind(manager);
        (manager as any).markModelDirty = (id?: string) => { dirtied.push(id ?? ''); originalMarkDirty(id); };

        const resourcesBefore = modelDef.resources.size();
        const requirementsBefore = modelDef.resourceRequirements.size();

        await manager.registerElement(new Resource('r1', 'Nurse', 2), block);
        expect(modelDef.resources.size()).toBe(resourcesBefore);
        expect(modelDef.resourceRequirements.size()).toBe(requirementsBefore);
        expect(dirtied).toContain('r1');

        dirtied.length = 0;
        await manager.updateElement(new Resource('r1', 'Nurse', 5));
        expect(modelDef.resources.size()).toBe(resourcesBefore);
        expect(modelDef.resourceRequirements.size()).toBe(requirementsBefore);
        expect(dirtied).toContain('r1');
        // updateElement must not push a domain Resource back into q_data:
        // the pointer is written only by conversion or by an ELEMENT_UPDATE
        // carrying resourceId.
        expect(block.shapeData.get('q_data')).toBe(pointerBefore);
    });

    it('a Resource block vanishing from the canvas leaves its resource present and unclaimed', async () => {
        const storage = new StorageAdapter();
        const page = makeFakePage('page-1');
        storage.setElementData(page, { id: 'model-1', name: 'M' } as any, SimulationObjectType.Model);
        storage.setStorageFormat(page, 2);
        storage.setResources(page, [{ id: 'r1', name: 'Nurse', capacity: 2 }]);
        const block = addBlock(page, makeFakeBlock('blk-1', { box: { x: 11, y: 22, w: 33, h: 44 } }));
        storage.setElementData(block, { id: 'blk-1', resourceId: 'r1' }, SimulationObjectType.Resource);

        jest.spyOn(LucidVersionManager.prototype, 'handlePageLoad')
            .mockResolvedValue({ upgraded: false, sourceVersion: '', targetVersion: '' });

        const manager = new ModelManager(storage);
        manager.setCurrentPage(page);

        const first: any = (await manager.getModelDefinition())!.resources.get('r1');
        expect(first.shapeId).toBe('blk-1');
        expect([first.x, first.y]).toEqual([11, 22]);

        const cascaded: string[] = [];
        (manager as any).cleanupResourceReferences = async (resourceId: string) => { cascaded.push(resourceId); return []; };

        page.allBlocks.delete('blk-1');
        manager.invalidateModelCache();

        const second: any = (await manager.getModelDefinition())!.resources.get('r1');
        expect(second).toBeDefined();
        expect(second.name).toBe('Nurse');
        expect(second.shapeId).toBeUndefined();
        expect(second.laneRef).toBeUndefined();
        expect(cascaded).toEqual([]);
        // The auto-requirement the builder derives is unaffected by the block.
        expect((await manager.getModelDefinition())!.resourceRequirements.get('r1')).toBeDefined();
    });
});
