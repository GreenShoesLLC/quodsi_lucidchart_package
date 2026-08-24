// getShapeInfo half of createModelRootSource's deps (Plan 2b, Task 8).
//
// WHY THIS IS A DEP AND NOT A HOST ROUND TRIP. Lucid's shapes live in the
// extension realm, so a synchronous "what is this shape called?" lookup is
// impossible over postMessage. The MODEL_ROOT_SNAPSHOT projection already
// carries the answer for the only shapes any shared panel asks about: each
// resources[] row stamps `shapeId` + `shapeLabel` at build time (Task 3/7).
// So this dep is a pure read of the cached projection -- no message, no
// async -- which is exactly what ModelStateAccessor.getShapeInfo's
// synchronous `ShapeInfoLike | null` signature requires.
//
// The only consumer today is ResourcesEditor's link-status column
// (`accessor.getShapeInfo?.(shapeId)?.name ?? shapeId`), so an unresolved
// lookup must return a falsy value rather than a fabricated ShapeInfoLike --
// the raw id is a better fallback than a shape name invented here.

import { describe, it, expect, vi } from 'vitest'
import { createModelRootSource } from '../useModelRootSource'

const BASE = { generators: [], arrivalPatterns: [], model: {} }

describe('createModelRootSource getShapeInfo', () => {
  it('resolves a shape-linked resource row to a ShapeInfoLike carrying the shape label', () => {
    const source = createModelRootSource({ send: vi.fn() })
    source.acceptSnapshot({
      ...BASE,
      resources: [{ id: 'r1', name: 'Nurse', shapeId: 'blk-1', shapeLabel: 'Nurse Station' }],
    })

    expect(source.deps.getShapeInfo!('blk-1')).toEqual({
      shapeId: 'blk-1',
      name: 'Nurse Station',
      text: 'Nurse Station',
      masterName: null,
      is1D: false,
      quodsiType: 'Resource',
      quodsiData: null,
    })
  })

  // A Lucid block with no text has no shapeLabel to project, so the id is
  // the only honest label left -- and it is precisely what the caller's own
  // `?? shapeId` fallback would have produced anyway.
  it('falls back to the raw shapeId when the row carries no shapeLabel', () => {
    const source = createModelRootSource({ send: vi.fn() })
    source.acceptSnapshot({
      ...BASE,
      resources: [{ id: 'r1', name: 'Nurse', shapeId: 'blk-1' }],
    })

    const info = source.deps.getShapeInfo!('blk-1')
    expect(info?.name).toBe('blk-1')
    expect(info?.text).toBe('blk-1')
  })

  it('returns null for a shape id no resource row points at', () => {
    const source = createModelRootSource({ send: vi.fn() })
    source.acceptSnapshot({
      ...BASE,
      resources: [{ id: 'r1', name: 'Nurse', shapeId: 'blk-1' }],
    })

    expect(source.deps.getShapeInfo!('nope')).toBeNull()
  })

  it('returns null before any snapshot has arrived', () => {
    const source = createModelRootSource({ send: vi.fn() })
    expect(source.deps.getShapeInfo!('blk-1')).toBeNull()
  })
})
