// editorextensions/quodsi_editor_extension/tests/conversion/reconversion.removeThenAdd.test.ts
import { LucidPageConversionService } from '../../src/services/conversion/LucidPageConversionService';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

describe('convertPageWithMappings re-conversion', () => {
  it('removes the element via ModelManager.removeElement before re-adding (type change)', async () => {
    const removed: string[] = [];
    const modelManager: any = {
      removeElement: async (id: string) => { removed.push(id); },
      registerElement: async () => {},
      initializeModel: async () => {},
      validateModel: async () => ({ isValid: true, messages: [] }),
      getModelDefinition: async () => null,
    };
    const storageAdapter: any = {
      isQuodsiModel: () => true,            // force the re-conversion branch
      clearElementData: () => {},
      getSkippedElements: () => ({}),
      setSkippedElements: () => {},
      getElementType: () => ({ type: SimulationObjectType.Activity, id: 'b1' }),
      updateElementData: () => {},
      getElementData: () => null,           // no resourceName → processAutoCreatedResources is a no-op
    };
    const factory: any = {
      createPlatformObject: () => ({
        getSimulationObject: () => ({ id: 'b1', type: SimulationObjectType.Resource, name: 'R' }),
        updateFromPlatform: () => {},
      }),
    };

    const page = makeFakePage('p1');
    const block = makeFakeBlock('b1');
    // Add getClassName so convertSwimLanes skips it (not a swimlane block)
    (block as any).getClassName = () => 'ProcessBlock';
    page.allBlocks.set('b1', block);

    const svc = new LucidPageConversionService(modelManager, factory, storageAdapter);
    const mappings = new Map<string, SimulationObjectType | null>([['b1', SimulationObjectType.Resource]]);
    await svc.convertPageWithMappings(page, mappings, new Set(['b1']));

    expect(removed).toContain('b1'); // old element removed before re-add
  });
});
