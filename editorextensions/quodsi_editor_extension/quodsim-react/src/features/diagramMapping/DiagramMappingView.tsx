// React view rendered inside DiagramMappingModal's real Lucid modal
// (?view=diagram-mapping), the host-side modal spec 2026-09-15 ("Diagram
// Mapping opens inline") introduced.
//
// THE STRUCTURAL DIFFERENCE FROM ScheduleEditorView/PatternEditorView. Those
// two wrap a model-root accessor (with buffering, flush-on-close) because
// their editors read/write MODEL data. DiagramMappingPanel has none of
// that: it talks only through its own LucidDiagramMappingAccessor (analyze
// the page, apply shape changes), so this view is closer in shape to
// SettingsEditorView -- build the accessor once and render the shared
// panel, nothing else -- except the accessor here owns a window 'message'
// listener that must be connected/disconnected with the component's
// lifecycle (see LucidDiagramMappingAccessor's own header for why
// connect()/disconnect() are split from the constructor).
import { useEffect, useMemo } from 'react'
import { DiagramMappingPanel } from 'quodsi_studio/platforms/shared'
import { LucidDiagramMappingAccessor } from '../../adapters/LucidDiagramMappingAccessor'

export function DiagramMappingView() {
  // Built once per mount -- DiagramMappingPanel re-analyzes whenever the
  // accessor identity changes, so a fresh instance every render would loop.
  const accessor = useMemo(() => new LucidDiagramMappingAccessor(), [])

  useEffect(() => {
    accessor.connect()
    return () => accessor.disconnect()
  }, [accessor])

  return (
    <div className="h-full w-full bg-surface">
      <DiagramMappingPanel accessor={accessor} />
    </div>
  )
}
