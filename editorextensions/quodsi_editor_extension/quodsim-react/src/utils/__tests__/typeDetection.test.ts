import { SimulationObjectType, DiagramElementType } from '@quodsi/lucid-shared';
import { getSimulationObjectType } from '../typeDetection';
import type { ExtendedModelItemData } from '../../types/ModelItemData';

const element = (metadataType: unknown): ExtendedModelItemData =>
  ({ id: 'e1', name: 'E1', metadata: { type: metadataType } } as unknown as ExtendedModelItemData);

describe('getSimulationObjectType', () => {
  it('returns Resource first, whatever the other sources say', () => {
    expect(getSimulationObjectType('Activity', element('Activity'), { type: 'Resource' })).toBe(SimulationObjectType.Resource);
    expect(getSimulationObjectType(DiagramElementType.LINE, element('Resource'))).toBe(SimulationObjectType.Resource);
    expect(getSimulationObjectType('Resource')).toBe(SimulationObjectType.Resource);
  });

  it('prefers metadata.type over the element type, matching its name case-insensitively', () => {
    expect(getSimulationObjectType('Generator', element('activity'))).toBe(SimulationObjectType.Activity);
    expect(getSimulationObjectType(DiagramElementType.LINE, element('Generator'))).toBe(SimulationObjectType.Generator);
  });

  it('falls through a None or unrecognised metadata.type', () => {
    expect(getSimulationObjectType('Generator', element('None'))).toBe(SimulationObjectType.Generator);
    expect(getSimulationObjectType('Generator', element('block'))).toBe(SimulationObjectType.Generator);
  });

  it('maps a diagram line to Connector', () => {
    expect(getSimulationObjectType(DiagramElementType.LINE)).toBe(SimulationObjectType.Connector);
    expect(getSimulationObjectType('line')).toBe(SimulationObjectType.Connector);
  });

  it('matches the element type name case-insensitively', () => {
    expect(getSimulationObjectType('connector')).toBe(SimulationObjectType.Connector);
    expect(getSimulationObjectType('GENERATOR')).toBe(SimulationObjectType.Generator);
  });

  it('returns None when nothing names a type', () => {
    expect(getSimulationObjectType(undefined)).toBe(SimulationObjectType.None);
    expect(getSimulationObjectType('block')).toBe(SimulationObjectType.None);
  });
});
