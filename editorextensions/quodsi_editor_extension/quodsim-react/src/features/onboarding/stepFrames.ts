// quodsim-react/src/features/onboarding/stepFrames.ts
//
// Which Lucid frame hosts which tour step (spec 2026-10-16 §9 amendment 1).
// The side panel owns everything from `welcome` through `open-studies` — the
// example, Convert and the editor walk, plus the off-path asks positioned in
// that stretch (confirm-replace, confirm-replace-unsaved, example-unavailable)
// — and the Studies modal owns the rest. Derived from the tour's own step
// order rather than listed, so a step added inside the panel stretch lands in
// the panel without a second edit here.
import { capacityTradeoff } from 'quodsi_studio/platforms/shared'

const FIRST = 'welcome'
const LAST = 'open-studies'

function panelSteps(): ReadonlySet<string> {
  const ids = capacityTradeoff.steps.map((s) => s.id)
  const from = ids.indexOf(FIRST)
  const to = ids.indexOf(LAST)
  if (from < 0 || to < from) throw new Error(`stepFrames: tour no longer runs ${FIRST}..${LAST}`)
  return new Set(ids.slice(from, to + 1))
}

export const PANEL_STEPS: ReadonlySet<string> = panelSteps()

export const ownsPanel = (id: string): boolean => PANEL_STEPS.has(id)
export const ownsModal = (id: string): boolean => !PANEL_STEPS.has(id)
