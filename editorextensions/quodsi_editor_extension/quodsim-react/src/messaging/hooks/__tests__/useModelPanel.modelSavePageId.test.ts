// Page guard (spec 2026-09-11): the Model editor's settings save must be
// stamped from the page whose model data the Basic form is actually editing
// -- documentContext.metadata.modelItemData.id -- not `referenceData.pageId`,
// which is rebuilt by a different code path and can still be the previous
// page's after a page switch with nothing selected (final-review.md C1/I1).
// The host builds a page's modelItemData with id = the LIVE page id
// (itemDataBuilder.ts), so the form and its page id always travel together.
import { renderHook } from '@testing-library/react'

const { updateElementData, selectionRef } = vi.hoisted(() => ({
  updateElementData: vi.fn(),
  selectionRef: { current: {} as any },
}))

vi.mock('../../MessageProvider', () => ({
  useMessaging: () => ({
    selection: selectionRef.current,
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

beforeEach(() => {
  updateElementData.mockClear()
})

describe('useModelPanel model settings save', () => {
  it("stamps the save with the page id of the model data the form edits, not referenceData's (possibly lagging) page id", () => {
    selectionRef.current = {
      selectedElements: [],
      documentContext: {
        documentId: 'doc-1',
        pageId: 'page-B',
        documentTitle: 'Doc',
        isQuodsiModel: true,
        metadata: {
          modelItemData: {
            id: 'page-B',
            name: 'Model',
            type: 'Model',
            metadata: { type: 'Model', id: 'stored-model-id' },
            data: {},
          },
        },
      },
      // Lagging: rebuilt from the previous page by a processor that never
      // called setCurrentPage (I1). Must NOT be what gets sent.
      referenceData: { pageId: 'page-A' },
      diagramElementType: undefined,
      lastUpdated: undefined,
    }

    const { result } = renderHook(() => useModelPanel())

    result.current.onElementUpdate('page-B', { name: 'Renamed' })

    expect(updateElementData).toHaveBeenCalledTimes(1)
    const call = updateElementData.mock.calls[0]
    expect(call[1]).toBe('Model')
    expect(call[4]).toBe('page-B')
    expect(call[4]).not.toBe('page-A')
    expect(call[4]).not.toBe('stored-model-id')
  })

  it('sends undefined for the placeholder model (no metadata.modelItemData), so a save from it is refused as not tied to a loaded page', () => {
    selectionRef.current = {
      selectedElements: [],
      documentContext: {
        documentId: 'doc-1',
        pageId: 'page-B',
        documentTitle: 'Doc',
        isQuodsiModel: true,
        // No metadata.modelItemData -- useModelPanel builds a placeholder
        // Model element whose id is the DOCUMENT id, not a page id.
        metadata: undefined,
      },
      referenceData: { pageId: 'page-A' },
      diagramElementType: undefined,
      lastUpdated: undefined,
    }

    const { result } = renderHook(() => useModelPanel())

    result.current.onElementUpdate('doc-1', { name: 'Renamed' })

    expect(updateElementData).toHaveBeenCalledTimes(1)
    const call = updateElementData.mock.calls[0]
    expect(call[1]).toBe('Model')
    expect(call[4]).toBeUndefined()
  })
})
