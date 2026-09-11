// Page guard (spec 2026-09-11): the Model editor's settings save passes the
// page id of the referenceData it was based on. The model element's own id is
// NOT used -- a duplicated Lucid page keeps the original page's model id.
import { renderHook } from '@testing-library/react'

const { updateElementData } = vi.hoisted(() => ({ updateElementData: vi.fn() }))

vi.mock('../../MessageProvider', () => ({
  useMessaging: () => ({
    selection: {
      selectedElements: [],
      documentContext: {
        documentId: 'doc-1',
        pageId: 'page-1',
        documentTitle: 'Doc',
        isQuodsiModel: true,
        metadata: {
          modelItemData: {
            id: 'original-page-id',
            name: 'Model',
            type: 'Model',
            metadata: { type: 'Model', id: 'original-page-id' },
            data: {},
          },
        },
      },
      referenceData: { pageId: 'page-1' },
      diagramElementType: undefined,
      lastUpdated: undefined,
    },
    validation: { isValid: true, issues: [], summary: undefined },
    simulation: { error: null, lastUpdated: undefined },
    app: { initialized: true },
  }),
}))

vi.mock('../../senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({
    updateElementData,
    convertElement: vi.fn(),
    validateModel: vi.fn(),
    removeModel: vi.fn(),
    convertPage: vi.fn(),
  }),
}))

vi.mock('../../senders/simulationSender', () => ({
  useSimulationSender: () => ({ requestSimulation: vi.fn() }),
}))

import { useModelPanel } from '../useModelPanel'

describe('useModelPanel model settings save', () => {
  it("passes referenceData.pageId, not the model element's id, as basedOnPageId", () => {
    const { result } = renderHook(() => useModelPanel())

    result.current.onElementUpdate('original-page-id', { name: 'Renamed' })

    expect(updateElementData).toHaveBeenCalledTimes(1)
    const call = updateElementData.mock.calls[0]
    expect(call[1]).toBe('Model')
    expect(call[4]).toBe('page-1')
  })
})
