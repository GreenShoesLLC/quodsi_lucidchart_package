// editorextensions/quodsi_editor_extension/tests/relay/diagramMappingRelayHandler.test.ts
import { buildFinalMappings } from '../../src/core/messaging/handlers/diagramMappingRelayHandler';
import { SimulationObjectType } from '@quodsi/lucid-shared';

describe('buildFinalMappings (Entity guard)', () => {
  it('drops Entity changes and keeps the rest', () => {
    const map = buildFinalMappings([
      { elementId: 'b1', targetType: SimulationObjectType.Resource },
      { elementId: 'b2', targetType: SimulationObjectType.Entity },   // must be skipped
      { elementId: 'l1', targetType: null },                          // skip/unmap kept
    ]);
    expect(map.get('b1')).toBe(SimulationObjectType.Resource);
    expect(map.has('b2')).toBe(false);
    expect(map.get('l1')).toBe(null);
  });
});
