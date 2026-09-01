// Complexity Views, Lucid half (Task 11b).
//
// SettingsEditorView is the thinnest of the *EditorView siblings (see its
// own header comment) -- no accessor, no model, nothing to buffer or flush.
// So unlike ScheduleEditorView.test.tsx/PatternEditorView.test.tsx, which
// stub the heavy shared modal to isolate accessor wiring, this test renders
// the REAL SettingsPanel: there is no accessor wiring to isolate FROM.
//
// Review round 1 (Minor): this view passes NO `onClose` to SettingsPanel --
// Lucid's own modal chrome (SettingsModal.ts's `title: 'Settings'`) already
// supplies a native title-bar X, so wiring a second one here would double
// the interactive close affordance (SettingsPanel only draws its own X when
// `onClose` is supplied). The test below pins that absence, replacing the
// prior version's "wires the close button to CLOSE_MODAL" assertion, which
// tested exactly the redundancy this fix removes.

import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'

import { SettingsEditorView } from '../SettingsEditorView'

describe('SettingsEditorView', () => {
  beforeEach(() => {
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

  it('does not draw its own close button -- Lucid\'s native modal title bar is the only way out', () => {
    render(<SettingsEditorView />)
    expect(screen.queryByRole('button', { name: /close settings/i })).not.toBeInTheDocument()
  })
})
