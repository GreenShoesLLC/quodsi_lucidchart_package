// Page guard (spec 2026-09-11, residual round): the Model editor's settings
// save must be stamped from the id of the DRAFT BEING SAVED (`data.id`), not
// from documentContext or referenceData read at send time.
//
// Both of those are PROPS, refreshed by the host's SELECTION_CHANGED message.
// ModelEditor's localModelDraft is refreshed from the same source, but one
// render later -- useFormSync resyncs it inside a passive effect (ModelEditor
// ~line 293-300; useEditorState.ts useFormSync ~line 41-61). A 500ms autosave
// debounce (useAutoSave, useEditorState.ts ~161-162 dispatches
// onSaveRef.current(draftRef.current)) can fire inside that one-render gap
// after a page switch: documentContext/modelItemData already show the NEW
// page, but localModelDraft (and the data it saves) still holds the OLD
// page's content. Stamping from props would tag page A's draft with page B's
// id and the host would accept a wrong-page overwrite (final-review.md C1(b)
// data-loss class). data.id is the draft's own id -- ModelPanel.tsx ~302-305
// builds `elementData = { ...currentElement.data, id: currentElement.id }`,
// and features/utils/modelEditorHelpers.ts's extractModelData carries that id
// into localModelDraft.id and then into the saved Model -- so it always names
// the page the CONTENT being sent actually came from, never a page it raced
// past.
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
  it("stamps the save with the DRAFT's own page id, not documentContext/referenceData's (already-switched) page id", () => {
    // The panel has already moved on to page B (documentContext, modelItemData,
    // referenceData all say so), but the draft being saved right now is the
    // one ModelEditor captured before the switch -- its data still carries
    // page A's id. This is the switch-gap case: a stale debounced flush must
    // still be tagged with the page its OWN content came from.
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
      referenceData: { pageId: 'page-B' },
      diagramElementType: undefined,
      lastUpdated: undefined,
    }

    const { result } = renderHook(() => useModelPanel())

    result.current.onElementUpdate('page-A', { id: 'page-A', name: 'Renamed' })

    expect(updateElementData).toHaveBeenCalledTimes(1)
    const call = updateElementData.mock.calls[0]
    expect(call[1]).toBe('Model')
    expect(call[4]).toBe('page-A')
    expect(call[4]).not.toBe('page-B')
    expect(call[4]).not.toBe('stored-model-id')
  })

  it("stamps the save with the draft's id when it matches the current page (the ordinary case)", () => {
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
      referenceData: { pageId: 'page-B' },
      diagramElementType: undefined,
      lastUpdated: undefined,
    }

    const { result } = renderHook(() => useModelPanel())

    result.current.onElementUpdate('page-B', { id: 'page-B', name: 'Renamed' })

    expect(updateElementData).toHaveBeenCalledTimes(1)
    const call = updateElementData.mock.calls[0]
    expect(call[1]).toBe('Model')
    expect(call[4]).toBe('page-B')
  })

  it('sends undefined when the draft carries no id', () => {
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
      referenceData: { pageId: 'page-B' },
      diagramElementType: undefined,
      lastUpdated: undefined,
    }

    const { result } = renderHook(() => useModelPanel())

    result.current.onElementUpdate('page-B', { name: 'Renamed' })

    expect(updateElementData).toHaveBeenCalledTimes(1)
    const call = updateElementData.mock.calls[0]
    expect(call[1]).toBe('Model')
    expect(call[4]).toBeUndefined()
  })
})
