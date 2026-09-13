// The shared Model editor's Resources tab in Lucid's host (spec 2026-09-13):
// Studio's shared ResourcesEditor in host mode on the ONE model-root accessor.
// The dialog counts steps AND levers from that accessor's activity summaries,
// and the delete goes to the host with the user's choice, with no shape writes.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { setView } from 'quodsi_studio/platforms/shared'

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, selection: {}, sendMessage: vi.fn() }),
}))

import { definition, mountModelEditor } from './modelEditorSeam'

const NURSE = 'r1'

describe('Model editor — Resources tab (host cleanup)', () => {
  beforeEach(() => setView('advanced'))
  afterEach(() => {
    cleanup()
    setView('basic')
  })

  it('counts steps and levers from the one accessor and sends the delete with the choice, never writing shapes', async () => {
    const { transport } = mountModelEditor(
      definition({
        resources: [{ id: NURSE, name: 'Nurse', capacity: 1 }],
        resourceRequirements: [
          { id: NURSE, name: 'Nurse', rootClause: { id: 'c', mode: 'require_all', requests: [{ resourceId: NURSE }] } },
        ],
        activities: [
          {
            id: 'a1',
            name: 'Intake',
            actions: [{ id: 's1', type: 'seize', resourceRequirementId: NURSE }],
            levers: [{ leverId: 'lv-1', propertyName: 'SEIZE_PRIORITY', actionId: 's1' }],
          },
        ],
      }),
      { props: { activeTab: 'Resources' } },
    )

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByText('1 Seize/Release step uses them:')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Remove the steps' }))
    expect(screen.getByText('Also removes 1 lever on them.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /delete resource/i }))

    await waitFor(() =>
      expect(transport.send).toHaveBeenCalledWith({ resources: [] }, 'page-1', { seizeRelease: 'remove' }, expect.any(String)),
    )
    expect(transport.saveShape).not.toHaveBeenCalled()
  })
})
