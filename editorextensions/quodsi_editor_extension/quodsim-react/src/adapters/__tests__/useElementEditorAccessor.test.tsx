// useElementEditorAccessor (spec 2026-09-14 lucid-shared-generator-editor §1):
// one composite accessor per mounted editor, refreshed when the selection
// changes.
import { renderHook, cleanup } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

const messaging = vi.hoisted(() => ({ current: {} as any }))
vi.mock('../../messaging/MessageProvider', () => ({ useMessaging: () => messaging.current }))
vi.mock('../../messaging/senders/modelOpsSender', () => ({
  useModelOpsSender: () => ({
    updateResourceRequirements: vi.fn(async () => {}),
    updateElement: vi.fn(async () => {}),
  }),
}))

import { useElementEditorAccessor } from '../useElementEditorAccessor'
import { resetModelRootWritesForTests } from '../modelRootWrites'

const REFERENCE = { pageId: 'page-1', connectors: [] } as any
const posted: any[] = []
const requests = () => posted.filter((e) => e?.type === EnvelopeMessageType.MODEL_ROOT_REQUEST).length

beforeEach(() => {
  posted.length = 0
  vi.spyOn(window.parent, 'postMessage').mockImplementation((envelope: any) => {
    posted.push(envelope)
  })
  messaging.current = {
    app: { panelType: 'model' },
    selection: { lastUpdated: 1, documentContext: { pageId: 'page-1' } },
    sendMessage: vi.fn(),
  }
})

afterEach(() => {
  cleanup()
  resetModelRootWritesForTests()
  vi.restoreAllMocks()
})

describe('useElementEditorAccessor', () => {
  it('keeps one accessor across rerenders', () => {
    const { result, rerender } = renderHook(() => useElementEditorAccessor(REFERENCE))
    const first = result.current.accessor
    rerender()
    expect(result.current.accessor).toBe(first)
  })

  it('asks for a model-root snapshot on mount and again when the selection changes', () => {
    const { rerender } = renderHook(() => useElementEditorAccessor(REFERENCE))
    expect(requests()).toBe(1)

    messaging.current = { ...messaging.current, selection: { ...messaging.current.selection, lastUpdated: 2 } }
    rerender()

    expect(requests()).toBe(2)
  })

  it('reports no projection until a snapshot arrives', () => {
    const { result } = renderHook(() => useElementEditorAccessor(REFERENCE))
    expect(result.current.projection).toBeNull()
  })
})
