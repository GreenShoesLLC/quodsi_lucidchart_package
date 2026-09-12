// Lucid's Resources tab mounts the shared ResourcesEditor in host mode on the
// Model editor's ONE model-root accessor (spec 2026-09-12). The dialog counts
// steps AND levers from that accessor's activity summaries -- no separate
// referenceData source -- and the delete goes to the host with the user's
// choice, with no shape writes from the panel.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

vi.mock('../../../messaging/MessageProvider', () => ({
  useMessaging: () => ({ app: { panelType: 'model' }, selection: {}, sendMessage: vi.fn() }),
}))

import { ResourcesTab } from '../ResourcesTab'
import { definition, modelRootSeam } from './modelEditorSeam'

const NURSE = 'r1'

describe('ResourcesTab (host cleanup)', () => {
  afterEach(() => cleanup())

  it('counts steps and levers from the one accessor and sends the delete with the choice, never writing shapes', async () => {
    const { accessor, transport } = modelRootSeam(
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
    )
    render(<ResourcesTab accessor={accessor} />)

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }))
    expect(screen.getByText('1 Seize/Release step uses them:')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Remove the steps' }))
    expect(screen.getByText('Also removes 1 lever on them.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /delete resource/i }))

    await waitFor(() =>
      expect(transport.send).toHaveBeenCalledWith({ resources: [] }, 'page-1', { seizeRelease: 'remove' }),
    )
    expect(transport.saveShape).not.toHaveBeenCalled()
  })
})
