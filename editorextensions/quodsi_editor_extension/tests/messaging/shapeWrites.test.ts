// tests/messaging/shapeWrites.test.ts
//
// Spec 2026-09-13 lucid-shape-writes §1: shape edits ride MODEL_ROOT_UPDATE,
// and every entry is checked before anything is written, so a refused batch
// changes nothing.

import { SimulationObjectType } from '@quodsi/lucid-shared';
import { readShapeWrites, resolveShapeWrites } from '../../src/core/messaging/shapeWrites';
import { addBlock, makeFakeBlock, makeFakePage } from '../helpers/fakeProxies';

function pageWith(types: Record<string, string>) {
  const page = makeFakePage('page-1');
  for (const id of Object.keys(types)) addBlock(page, makeFakeBlock(id));
  return { page, getStoredType: (element: any) => types[element.id] };
}

describe('readShapeWrites', () => {
  it('returns no writes when the payload has no shapes list', () => {
    expect(readShapeWrites({})).toEqual([]);
    expect(readShapeWrites(undefined)).toEqual([]);
  });

  it('keeps each entry and only string cleared fields', () => {
    expect(readShapeWrites({
      shapes: [{ shapeId: 'act-1', type: 'Activity', patch: { name: 'Triage' }, clearedFields: ['queueRanking', 7] }],
    })).toEqual([{ shapeId: 'act-1', type: 'Activity', patch: { name: 'Triage' }, clearedFields: ['queueRanking'] }]);
  });
});

describe('resolveShapeWrites', () => {
  it('resolves each shape to its block and simulation type', () => {
    const { page, getStoredType } = pageWith({ 'act-1': 'Activity', 'gen-1': 'Generator' });
    const resolved = resolveShapeWrites([
      { shapeId: 'act-1', type: 'Activity', patch: { capacity: 2 }, clearedFields: ['workScheduleId'] },
      { shapeId: 'gen-1', type: 'Generator', patch: {}, clearedFields: ['arrivalScheduleId', 'volume'] },
    ], page, getStoredType);
    expect(resolved.map((r) => [r.shapeId, r.simulationType, (r.element as any).id])).toEqual([
      ['act-1', SimulationObjectType.Activity, 'act-1'],
      ['gen-1', SimulationObjectType.Generator, 'gen-1'],
    ]);
  });

  it('refuses a shape that is not on the page', () => {
    const { page, getStoredType } = pageWith({});
    expect(() => resolveShapeWrites([{ shapeId: 'act-9', type: 'Activity', patch: {}, clearedFields: [] }], page, getStoredType))
      .toThrow('Shape not found on this page: act-9');
  });

  it('refuses a shape stored as another type', () => {
    const { page, getStoredType } = pageWith({ 'gen-1': 'Generator' });
    expect(() => resolveShapeWrites([{ shapeId: 'gen-1', type: 'Activity', patch: {}, clearedFields: [] }], page, getStoredType))
      .toThrow('Shape gen-1 is not stored as Activity');
  });

  it('refuses a clear outside the type allow-list', () => {
    const { page, getStoredType } = pageWith({ 'act-1': 'Activity' });
    expect(() => resolveShapeWrites([{ shapeId: 'act-1', type: 'Activity', patch: {}, clearedFields: ['name'] }], page, getStoredType))
      .toThrow('Cannot clear name on Activity');
  });

  it('refuses a type other than Activity or Generator', () => {
    const { page, getStoredType } = pageWith({ 'res-1': 'Resource' });
    expect(() => resolveShapeWrites([{ shapeId: 'res-1', type: 'Resource' as any, patch: {}, clearedFields: [] }], page, getStoredType))
      .toThrow('Unsupported shape type: Resource');
  });
});
