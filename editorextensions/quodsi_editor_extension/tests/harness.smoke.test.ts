// editorextensions/quodsi_editor_extension/tests/harness.smoke.test.ts
import { StorageAdapter } from '../src/core/StorageAdapter';
import { SimulationObjectType } from '@quodsi/lucid-shared';
import { makeFakeBlock } from './helpers/fakeProxies';

describe('extension test harness', () => {
  it('StorageAdapter round-trips type via q_data', () => {
    const sa = new StorageAdapter();
    const block = makeFakeBlock('b1');
    sa.setElementData(block, { id: 'b1', name: 'A' }, SimulationObjectType.Activity);
    const info = sa.getElementType(block);
    expect(info?.type).toBe(SimulationObjectType.Activity);
    expect(info?.id).toBe('b1');
  });
});
