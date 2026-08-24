// editorextensions/quodsi_editor_extension/tests/conversion/resourceBlocks.multiple.test.ts
//
// Converting MORE THAN ONE Resource block in a single pass.
//
// Every format-1 leak found in this plan hid in the "second one" case, because
// the conversion loop's de-duplication reads `element.name` off the sim object
// and, on a collision, writes the whole sim object back to the block:
//
//     if (typeNames.has(element.name)) { element.name = ...; updateElementData(block, element); }
//
// Since Plan 2b Task 5 a Resource's sim object is a PLACEHOLDER always named
// 'Unlinked Resource', so with two Resource blocks that branch fires on the
// second one every time -- merging name/capacity/x/y/width/height/financials
// onto the block's q_data and thereby destroying the pointer that is the only
// thing marking the block as storage format 2 (ResourceStorageMigration
// classifies purely on `resourceId !== undefined`). A single-Resource test
// cannot see any of this.
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { LucidElementFactory } from '../../src/services/LucidElementFactory';
import { StorageAdapter } from '../../src/core/StorageAdapter';
import { ModelManager } from '../../src/core/ModelManager';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage, addBlock } from '../helpers/fakeProxies';

// processAutoCreatedResources reaches for the SDK client to load a block class
// before it can draw a shape; the fake page below does the drawing instead.
beforeAll(() => {
  (ModelManager as any).getClient = () => ({ loadBlockClasses: async () => {} });
});

let autoBlockSeq = 0;
/** Gives a fake page the `addBlock` that auto-resource creation needs. */
function withAddBlock(page: any): any {
  page.addBlock = ({ boundingBox }: any) =>
    addBlock(page, makeFakeBlock(`auto-${++autoBlockSeq}`, { box: boundingBox }));
  return page;
}

function makeService(storageAdapter: StorageAdapter): LucidPageConversionService {
  const modelManager: any = {
    registerElement: async () => {},
    removeElement: async () => {},
    initializeModel: async (model: any, p: any) => {
      storageAdapter.setElementData(p, model, SimulationObjectType.Model);
    },
    validateModel: async () => ({ isValid: true, messages: [] }),
    getModelDefinition: async () => null,
  };
  return new LucidPageConversionService(
    modelManager,
    new LucidElementFactory(storageAdapter),
    storageAdapter
  );
}

/** Every key a format-1 record carried; none may appear on a block's q_data. */
const RECORD_KEYS = ['name', 'capacity', 'x', 'y', 'width', 'height', 'financialProperties'];

describe('converting several Resource blocks in one pass', () => {
  it('gives each block its own de-duplicated record and leaves both blocks holding only a pointer', async () => {
    const storageAdapter = new StorageAdapter();
    const page = makeFakePage('p1');
    const b1 = addBlock(page, makeFakeBlock('r1', { text: 'Nurse' }));
    const b2 = addBlock(page, makeFakeBlock('r2', { text: 'Nurse' }));

    await makeService(storageAdapter).convertPageWithMappings(
      page,
      new Map([
        ['r1', SimulationObjectType.Resource],
        ['r2', SimulationObjectType.Resource],
      ]),
      new Set()
    );

    expect(storageAdapter.getResources(page).map((r) => r.name)).toEqual(['Nurse', 'Nurse_2']);
    expect(storageAdapter.getResources(page).map((r) => String(r.id))).toEqual(['r1', 'r2']);

    for (const block of [b1, b2]) {
      const stored = storageAdapter.getElementData<any>(block);
      expect(stored.resourceId).toBe(block.id);
      for (const key of RECORD_KEYS) {
        expect(stored[key]).toBeUndefined();
      }
    }
  });

  it('de-duplicates a swimlane lane against the Resource BLOCKS converted in the same pass', async () => {
    // The lane's name must be checked against the record the block just minted,
    // not against the placeholder name the sim object carries.
    const storageAdapter = new StorageAdapter();
    const page = makeFakePage('p1');
    addBlock(page, makeFakeBlock('r1', { text: 'Nurse' }));
    addBlock(page, makeFakeBlock('sw-1', {
      className: 'AdvancedSwimLaneBlock',
      box: { x: 300, y: 0, w: 200, h: 200 },
      lanes: ['Nurse'],
    }));

    await makeService(storageAdapter).convertPageWithMappings(
      page,
      new Map([['r1', SimulationObjectType.Resource]]),
      new Set()
    );

    expect(storageAdapter.getResources(page).map((r) => r.name)).toEqual(['Nurse', 'Nurse_2']);
  });

  it('de-duplicates an auto-created resource against a resource already on the page', async () => {
    // "resource: Nurse" on an activity, with a Nurse record already stored.
    const storageAdapter = new StorageAdapter();
    const page = withAddBlock(makeFakePage('p1'));
    storageAdapter.setResources(page, [{ id: 'pre', name: 'Nurse' }]);
    addBlock(page, makeFakeBlock('a1', { text: 'name: Triage | resource: Nurse' }));

    await makeService(storageAdapter).convertPageWithMappings(
      page,
      new Map([['a1', SimulationObjectType.Activity]]),
      new Set()
    );

    const names = storageAdapter.getResources(page).map((r) => r.name);
    expect(names[0]).toBe('Nurse');
    expect(names).toHaveLength(2);
    // The auto-created one must not collide with the record already there.
    expect(names[1]).toBe('Nurse_2');

    // ...and the SHAPE must say what the record says. planAutoResources labels
    // the block it plans, so if its isNameTaken predicate cannot see the
    // records already on the page it labels the shape 'Nurse' while
    // createFromConversion (which can see them) stores 'Nurse_2'.
    const autoBlock = page.allBlocks.get('auto-1');
    expect(autoBlock.textAreas.get('Text')).toBe('Nurse_2');
  });
});
