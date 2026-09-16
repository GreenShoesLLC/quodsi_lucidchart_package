// quodsim-react/src/features/studies/__tests__/embedWriteEnvelope.test.ts
//
// Pure translation tests for embedWriteEnvelope.ts: one case per write kind,
// asserting the envelope's type and data. Moved (and expanded to a
// standalone file) from the deleted Studio-iframe component's own write-relay
// test, whose "buildWriteEnvelope" describe block covered this same module --
// which has no DOM dependency, so it needs no component to exercise it.
import { describe, it, expect } from 'vitest'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { buildWriteEnvelope, WRITE_ID_TTL_MS, WRITE_RESULT_TYPES, writeTtlMs } from '../embedWriteEnvelope'

describe('buildWriteEnvelope', () => {
  it('element: maps to ELEMENT_UPDATE with the line hint for a Connector', () => {
    expect(buildWriteEnvelope('element', { elementId: 'c1', type: 'Connector', patch: { weight: 2 } }, 'id-1')).toEqual({
      id: 'id-1', type: EnvelopeMessageType.ELEMENT_UPDATE, source: 'studio-embed-iframe', target: 'host', version: '1.0',
      data: { elementId: 'c1', type: 'Connector', data: { weight: 2, id: 'c1' }, diagramElementType: 'line' },
    })
  })

  it('element: maps to ELEMENT_UPDATE with the block hint for a non-Connector', () => {
    expect(buildWriteEnvelope('element', { elementId: 'a1', type: 'Activity', patch: { capacity: 2 } }, 'id-2')?.data)
      .toMatchObject({ diagramElementType: 'block', data: { capacity: 2, id: 'a1' } })
  })

  it('modelRoot: maps to MODEL_ROOT_UPDATE carrying the patch', () => {
    expect(buildWriteEnvelope('modelRoot', { patch: { resources: [] } }, 'id-3')).toEqual({
      id: 'id-3', type: EnvelopeMessageType.MODEL_ROOT_UPDATE, source: 'studio-embed-iframe', target: 'host', version: '1.0',
      data: { patch: { resources: [] } },
    })
  })

  it('states: maps to STATES_UPDATE carrying the states list', () => {
    expect(buildWriteEnvelope('states', { states: [{ id: 's1' }] }, 'id-4')).toEqual({
      id: 'id-4', type: EnvelopeMessageType.STATES_UPDATE, source: 'studio-embed-iframe', target: 'host', version: '1.0',
      data: { states: [{ id: 's1' }] },
    })
  })

  it('entities: maps to ENTITIES_UPDATE carrying the entities list', () => {
    expect(buildWriteEnvelope('entities', { entities: [{ id: 'e1' }] }, 'id-5')).toEqual({
      id: 'id-5', type: EnvelopeMessageType.ENTITIES_UPDATE, source: 'studio-embed-iframe', target: 'host', version: '1.0',
      data: { entities: [{ id: 'e1' }] },
    })
  })

  it('model: maps to ELEMENT_UPDATE on the page with no element-type hint', () => {
    expect(buildWriteEnvelope('model', { elementId: 'page-1', patch: { replications: 5, name: 'Clinic v2' } }, 'id-7')).toEqual({
      id: 'id-7', type: EnvelopeMessageType.ELEMENT_UPDATE, source: 'studio-embed-iframe', target: 'host', version: '1.0',
      data: { elementId: 'page-1', type: 'Model', data: { replications: 5, name: 'Clinic v2', id: 'page-1' } },
    })
  })

  it('createShape: maps to SHAPE_CREATE', () => {
    expect(buildWriteEnvelope('createShape', { type: 'Activity', element: { name: 'Triage' }, near: { elementId: 'a1', side: 'right' } }, 'id-8')).toEqual({
      id: 'id-8', type: EnvelopeMessageType.SHAPE_CREATE, source: 'studio-embed-iframe', target: 'host', version: '1.0',
      data: { shapeType: 'Activity', element: { name: 'Triage' }, near: { elementId: 'a1', side: 'right' } },
    })
  })

  it('deleteShape: maps to SHAPE_DELETE', () => {
    expect(buildWriteEnvelope('deleteShape', { type: 'Connector', elementId: 'c1' }, 'id-9')).toEqual({
      id: 'id-9', type: EnvelopeMessageType.SHAPE_DELETE, source: 'studio-embed-iframe', target: 'host', version: '1.0',
      data: { shapeType: 'Connector', elementId: 'c1' },
    })
  })

  it('moveShape: maps to SHAPE_MOVE', () => {
    expect(buildWriteEnvelope('moveShape', { elementId: 'a1', x: 100, y: 200 }, 'id-10')).toEqual({
      id: 'id-10', type: EnvelopeMessageType.SHAPE_MOVE, source: 'studio-embed-iframe', target: 'host', version: '1.0',
      data: { elementId: 'a1', x: 100, y: 200 },
    })
  })

  it('createModel: maps to MODEL_CREATE_PAGE carrying the document', () => {
    const document = { activities: [], resources: [] }
    expect(buildWriteEnvelope('createModel', { document }, 'id-11')).toEqual({
      id: 'id-11', type: EnvelopeMessageType.MODEL_CREATE_PAGE, source: 'studio-embed-iframe', target: 'host', version: '1.0',
      data: { document },
    })
  })

  it('returns null for an unknown kind', () => {
    expect(buildWriteEnvelope('bogus' as any, {} as any, 'id-6')).toBeNull()
  })
})

describe('WRITE_RESULT_TYPES', () => {
  it('includes the four shape-op results', () => {
    expect(WRITE_RESULT_TYPES.has(EnvelopeMessageType.SHAPE_CREATE_RESULT)).toBe(true)
    expect(WRITE_RESULT_TYPES.has(EnvelopeMessageType.SHAPE_DELETE_RESULT)).toBe(true)
    expect(WRITE_RESULT_TYPES.has(EnvelopeMessageType.SHAPE_MOVE_RESULT)).toBe(true)
    expect(WRITE_RESULT_TYPES.has(EnvelopeMessageType.MODEL_CREATE_PAGE_RESULT)).toBe(true)
  })
})

describe('writeTtlMs', () => {
  it('gives createModel a longer eviction window; everything else keeps WRITE_ID_TTL_MS', () => {
    expect(writeTtlMs('createModel')).toBe(65_000)
    expect(writeTtlMs('createShape')).toBe(WRITE_ID_TTL_MS)
    expect(writeTtlMs('deleteShape')).toBe(WRITE_ID_TTL_MS)
    expect(writeTtlMs('moveShape')).toBe(WRITE_ID_TTL_MS)
    expect(writeTtlMs('element')).toBe(WRITE_ID_TTL_MS)
  })
})
