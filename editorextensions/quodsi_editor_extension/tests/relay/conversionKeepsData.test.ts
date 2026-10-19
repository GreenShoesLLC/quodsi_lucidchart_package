// tests/relay/conversionKeepsData.test.ts
//
// Spec 2026-10-16 decision L6: Lucid's Convert keeps any Quodsi data already
// on the page -- per-shape q_data whose type matches the mapped type, the
// page-level lists (q_entities, q_states, q_resources, q_res_requirements),
// and a parked Model record under page key `q_pending_model` (amendment 3).
// Diagram Mapping's re-convert can still wipe on demand (C1) via
// `resetExisting`.
//
// Real StorageAdapter + LucidElementFactory + ModelManager over fake page
// proxies, so what is asserted is what lands in shapeData.

import { Viewport } from '../__mocks__/lucid-extension-sdk';
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { SimulationObjectType, PeriodUnit } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

let currentPage: any = null;
(Viewport.prototype as any).getCurrentPage = function (): any {
  return currentPage;
};

beforeAll(() => {
  (ModelManager as any).getClient = () => ({ loadBlockClasses: async () => {} });
});

type Harness = { storage: StorageAdapter; manager: ModelManager; service: LucidPageConversionService };

function makeHarness(): Harness {
  const storage = new StorageAdapter();
  const manager = new ModelManager(storage);
  const service = new LucidPageConversionService(manager, new LucidElementFactory(storage), storage);
  return { storage, manager, service };
}

function writeQData(element: any, type: SimulationObjectType, domain: Record<string, unknown>): void {
  new StorageAdapter().setElementData(element, { id: element.id, ...domain } as any, type);
}

function tunedPage() {
  const page = makeFakePage('page-1');
  currentPage = page;
  const act = addBlock(page, makeFakeBlock('act-1', { text: 'Screening' }));
  writeQData(act, SimulationObjectType.Activity, { name: 'Screening', capacity: 3, inboundCapacity: 5 });
  return { page, act };
}

const activityMapping = (id = 'act-1') => new Map<string, SimulationObjectType | null>([[id, SimulationObjectType.Activity]]);

describe('Convert keeps Quodsi data already on the page (L6)', () => {
  it("keeps a tuned Activity's capacity and duration on first conversion", async () => {
    const { storage, service } = makeHarness();
    const { page, act } = tunedPage();
    expect(storage.isQuodsiModel(page)).toBe(false);

    await service.convertPageWithMappings(page, activityMapping());

    const stored = storage.getElementData<any>(act);
    expect(stored.type).toBe(SimulationObjectType.Activity);
    expect(stored.capacity).toBe(3);
    expect(stored.inboundCapacity).toBe(5);
    expect(stored.name).toBe('Screening');
  });

  it("keeps a pending model's run settings and clears the key", async () => {
    const { storage, service } = makeHarness();
    const { page } = tunedPage();
    storage.setPendingModel(page, {
      replications: 10,
      seed: 12345,
      runTime: { unit: 'hours', value: 8 },
      name: 'Airport Security',
    });

    await service.convertPageWithMappings(page, activityMapping());

    const model = storage.getElementData<any>(page);
    expect(model.type).toBe(SimulationObjectType.Model);
    expect(model.replications).toBe(10);
    expect(model.seed).toBe(12345);
    expect(model.runTime).toEqual({ unit: 'hours', value: 8 });
    expect(model.name).toBe('Airport Security');
    expect(storage.takePendingModel(page)).toBeNull();
  });

  it('applies the pending model on the MODEL_CONVERT path too', async () => {
    const { storage, service } = makeHarness();
    const { page, act } = tunedPage();
    storage.setPendingModel(page, { replications: 7, timeUnit: PeriodUnit.HOURS });

    await service.convertPage(page);

    const model = storage.getElementData<any>(page);
    expect(model.replications).toBe(7);
    expect(model.timeUnit).toBe(PeriodUnit.HOURS);
    expect(storage.takePendingModel(page)).toBeNull();
    expect(storage.getElementData<any>(act).capacity).toBe(3);
  });

  it('keeps page entities written before conversion', async () => {
    const { storage, service } = makeHarness();
    const { page } = tunedPage();
    const entities = [{ id: 'ent-pax', name: 'Passenger', description: '' } as any];
    storage.setEntities(page, entities);

    await service.convertPageWithMappings(page, activityMapping());

    expect(storage.getEntities(page).map(e => e.id)).toContain('ent-pax');
    expect(storage.getEntities(page).find(e => e.id === 'ent-pax')?.name).toBe('Passenger');
  });

  it('a shape with no Quodsi data still converts from defaults', async () => {
    const { storage, service } = makeHarness();
    const page = makeFakePage('page-1');
    currentPage = page;
    const blank = addBlock(page, makeFakeBlock('blank-1', { text: 'Check-in' }));

    await service.convertPageWithMappings(page, activityMapping('blank-1'));

    const stored = storage.getElementData<any>(blank);
    expect(stored.type).toBe(SimulationObjectType.Activity);
    expect(stored.name).toBe('Check-in');
    expect(stored.capacity).toBe(1);
  });

  it('keeps a Resource block whose pointer resolves, and converts a dangling one fresh', async () => {
    const { storage, service } = makeHarness();
    const page = makeFakePage('page-1');
    currentPage = page;
    const kept = addBlock(page, makeFakeBlock('res-1', { text: 'Officer' }));
    const dangling = addBlock(page, makeFakeBlock('res-2', { text: 'Agent' }));
    storage.setResources(page, [{ id: 'officer-rec', name: 'Officer', capacity: 4 } as any]);
    writeQData(kept, SimulationObjectType.Resource, { resourceId: 'officer-rec' });
    writeQData(dangling, SimulationObjectType.Resource, { resourceId: 'gone' });

    await service.convertPageWithMappings(page, new Map([
      ['res-1', SimulationObjectType.Resource],
      ['res-2', SimulationObjectType.Resource],
    ]));

    expect(storage.getElementData<any>(kept).resourceId).toBe('officer-rec');
    expect(storage.getElementData<any>(dangling).resourceId).toBe('res-2');
    const records = storage.getResources(page);
    expect(records.find(r => String(r.id) === 'officer-rec')?.capacity).toBe(4);
    expect(records.map(r => r.name).sort()).toEqual(['Agent', 'Officer']);
  });

  it('re-conversion keeps unchanged-type elements; resetExisting wipes them', async () => {
    const { storage, service } = makeHarness();
    const { page, act } = tunedPage();
    await service.convertPageWithMappings(page, activityMapping());
    expect(storage.getElementData<any>(act).capacity).toBe(3);

    // Re-convert without reset: kept.
    await service.convertPageWithMappings(page, activityMapping());
    expect(storage.getElementData<any>(act).capacity).toBe(3);

    // Re-convert with reset: defaults.
    await service.convertPageWithMappings(page, activityMapping(), new Set(), { resetExisting: true });
    expect(storage.getElementData<any>(act).capacity).toBe(1);
  });

  it('re-conversion does not re-mint the auto-resource a kept Activity once asked for', async () => {
    const { storage, service } = makeHarness();
    const page = makeFakePage('page-1');
    currentPage = page;
    (page as any).addBlock = ({ boundingBox }: any) =>
      addBlock(page, makeFakeBlock(`auto-${page.allBlocks.size}`, { box: boundingBox }));
    addBlock(page, makeFakeBlock('a1', { text: 'name: Triage | resource: Nurse' }));

    await service.convertPageWithMappings(page, activityMapping('a1'));
    expect(storage.getResources(page).map(r => r.name)).toEqual(['Nurse']);

    await service.convertPageWithMappings(page, activityMapping('a1'));
    expect(storage.getResources(page).map(r => r.name)).toEqual(['Nurse']);
  });

  it('type change still removes the old element', async () => {
    const { storage, manager, service } = makeHarness();
    const { page, act } = tunedPage();
    await service.convertPageWithMappings(page, activityMapping());
    const removeSpy = jest.spyOn(manager, 'removeElement');

    await service.convertPageWithMappings(page, new Map([['act-1', SimulationObjectType.Generator]]));

    expect(removeSpy).toHaveBeenCalledWith('act-1');
    const stored = storage.getElementData<any>(act);
    expect(stored.type).toBe(SimulationObjectType.Generator);
    expect(stored.capacity).toBeUndefined();
    const def = await manager.getModelDefinition();
    expect(def?.activities.get('act-1')).toBeUndefined();
  });

  it('clearAllModelData also clears q_pending_model', () => {
    const storage = new StorageAdapter();
    const page = makeFakePage('page-1');
    storage.setPendingModel(page, { replications: 3 });
    storage.clearAllModelData(page);
    expect(storage.takePendingModel(page)).toBeNull();
  });
});
