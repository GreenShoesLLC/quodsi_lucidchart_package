// Complexity Views, Lucid half (Task 11b).
//
// SettingsEditorView is the thinnest of the *EditorView siblings (see its
// own header comment) -- no accessor, no model, nothing to buffer or flush.
// So unlike ScheduleEditorView.test.tsx/PatternEditorView.test.tsx, which
// stub the heavy shared modal to isolate accessor wiring, this test renders
// the REAL SettingsPanel: there is no accessor wiring to isolate FROM, and
// exercising the real component is what proves the close button's onClose
// actually reaches CLOSE_MODAL through this view.

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'

const mockSendMessage = vi.fn()
vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ sendMessage: mockSendMessage }),
}))

import { SettingsEditorView } from '../SettingsEditorView'

describe('SettingsEditorView', () => {
  beforeEach(() => {
    mockSendMessage.mockClear()
    localStorage.clear()
  })

  it('renders the shared Settings screen', () => {
    render(<SettingsEditorView />)
    expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    // The View section is the one every host gets (Studio's theme control
    // lives behind extraSections, deliberately omitted here -- see this
    // view's own header comment).
    expect(screen.getByText(/^View$/i)).toBeInTheDocument()
  })

  it("wires SettingsPanel's close button to CLOSE_MODAL -- this modal has no other native way out for a chromeless close", () => {
    render(<SettingsEditorView />)
    fireEvent.click(screen.getByRole('button', { name: /close settings/i }))
    expect(mockSendMessage).toHaveBeenCalledWith(EnvelopeMessageType.CLOSE_MODAL)
  })
})
