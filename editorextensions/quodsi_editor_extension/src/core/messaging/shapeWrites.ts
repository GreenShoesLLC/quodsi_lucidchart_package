// editorextensions/quodsi_editor_extension/src/core/messaging/shapeWrites.ts
//
// Shape edits riding MODEL_ROOT_UPDATE (spec 2026-09-13 lucid-shape-writes §1).
// The panel batches Activity and Generator edits in the same queue as
// model-root edits, so one MODEL_ROOT_UPDATE can carry both. Every entry is
// checked here BEFORE anything is written -- the shape is on the page, it is
// stored as the type the panel thinks, and every cleared field is on that
// type's allow-list -- so a refused batch changes nothing.

import { SimulationObjectType } from '@quodsi/lucid-shared';
import { ACTIVITY_CLEARABLE_KEYS } from '../../types/ActivityLucid';
import { GENERATOR_CLEARABLE_KEYS } from '../../types/GeneratorLucid';

export type ShapeWriteType = 'Activity' | 'Generator';

export type ShapeWrite = {
  shapeId: string;
  type: ShapeWriteType;
  /** Defined values only; clears travel in clearedFields. */
  patch: Record<string, unknown>;
  clearedFields: string[];
};

export type ResolvedShapeWrite = ShapeWrite & {
  element: unknown;
  simulationType: SimulationObjectType;
};

const CLEARABLE: Record<ShapeWriteType, readonly string[]> = {
  Activity: ACTIVITY_CLEARABLE_KEYS,
  Generator: GENERATOR_CLEARABLE_KEYS,
};

const SIMULATION_TYPE: Record<ShapeWriteType, SimulationObjectType> = {
  Activity: SimulationObjectType.Activity,
  Generator: SimulationObjectType.Generator,
};

/** The payload's shapes list (empty when absent). Entries are checked by resolveShapeWrites. */
export function readShapeWrites(data: { shapes?: unknown } | undefined): ShapeWrite[] {
  const raw = data?.shapes;
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    return {
      shapeId: String(e.shapeId ?? ''),
      type: e.type as ShapeWriteType,
      patch: (e.patch && typeof e.patch === 'object' ? e.patch : {}) as Record<string, unknown>,
      clearedFields: Array.isArray(e.clearedFields)
        ? e.clearedFields.filter((f): f is string => typeof f === 'string')
        : [],
    };
  });
}

/** Throws on the first entry that cannot be written; writes nothing itself. */
export function resolveShapeWrites(
  shapes: ShapeWrite[],
  page: { allBlocks?: { get(id: string): unknown } },
  getStoredType: (element: unknown) => string | undefined,
): ResolvedShapeWrite[] {
  return shapes.map((shape) => {
    if (shape.type !== 'Activity' && shape.type !== 'Generator') {
      throw new Error(`Unsupported shape type: ${shape.type}`);
    }
    const element = page.allBlocks?.get(shape.shapeId);
    if (!element) {
      throw new Error(`Shape not found on this page: ${shape.shapeId}`);
    }
    const stored = getStoredType(element);
    if (stored !== SIMULATION_TYPE[shape.type] && stored !== shape.type) {
      throw new Error(`Shape ${shape.shapeId} is not stored as ${shape.type}`);
    }
    const disallowed = shape.clearedFields.find((field) => !CLEARABLE[shape.type].includes(field));
    if (disallowed) {
      throw new Error(`Cannot clear ${disallowed} on ${shape.type}`);
    }
    return { ...shape, element, simulationType: SIMULATION_TYPE[shape.type] };
  });
}
