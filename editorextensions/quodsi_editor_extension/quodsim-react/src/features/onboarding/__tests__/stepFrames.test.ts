import { capacityTradeoff, lucidCapacityTradeoff } from 'quodsi_studio/platforms/shared'
import { PANEL_STEPS, ownsModal, ownsPanel } from '../stepFrames'

describe('stepFrames', () => {
  it('stepFrames partition covers every step exactly once', () => {
    for (const tour of [capacityTradeoff, lucidCapacityTradeoff]) {
      for (const s of tour.steps) {
        expect(Number(ownsPanel(s.id)) + Number(ownsModal(s.id))).toBe(1)
      }
    }
    // Every panel step is a real step of the tour (no stale ids).
    const ids = new Set(capacityTradeoff.steps.map((s) => s.id))
    for (const id of PANEL_STEPS) expect(ids.has(id)).toBe(true)
  })

  it('the panel owns welcome through open-studies plus the off-path asks; the modal owns the rest', () => {
    for (const id of ['welcome', 'confirm-replace', 'confirm-replace-unsaved', 'load-example',
      'example-unavailable', 'panel', 'convert', 'model', 'cost-detail', 'open-studies']) {
      expect(ownsPanel(id)).toBe(true)
    }
    for (const id of ['run-baseline', 'wait-baseline', 'view-results', 'aha', 'run-failed']) {
      expect(ownsModal(id)).toBe(true)
    }
  })
})
