// editorextensions/quodsi_editor_extension/tests/relay/diagramMappingRelayHandler.test.ts
import { buildFinalMappings, buildAutoMappings } from '../../src/core/messaging/handlers/diagramMappingRelayHandler';
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

describe('buildAutoMappings (auto-convert helper)', () => {
  it('applies proposed types, skips null + Entity', () => {
    const map = buildAutoMappings({ mappings: [
      { elementId: 'b1', proposedType: SimulationObjectType.Activity },
      { elementId: 'b2', proposedType: SimulationObjectType.Entity },
      { elementId: 'b3', proposedType: null },
    ] });
    expect(map.get('b1')).toBe(SimulationObjectType.Activity);
    expect(map.has('b2')).toBe(false);
    expect(map.has('b3')).toBe(false);
  });

  it('includes Resource and Connector proposed types', () => {
    const map = buildAutoMappings({ mappings: [
      { elementId: 'r1', proposedType: SimulationObjectType.Resource },
      { elementId: 'c1', proposedType: SimulationObjectType.Connector },
    ] });
    expect(map.get('r1')).toBe(SimulationObjectType.Resource);
    expect(map.get('c1')).toBe(SimulationObjectType.Connector);
    expect(map.size).toBe(2);
  });

  it('returns empty map when all entries are null or Entity', () => {
    const map = buildAutoMappings({ mappings: [
      { elementId: 'x1', proposedType: null },
      { elementId: 'x2', proposedType: SimulationObjectType.Entity },
    ] });
    expect(map.size).toBe(0);
  });
});
