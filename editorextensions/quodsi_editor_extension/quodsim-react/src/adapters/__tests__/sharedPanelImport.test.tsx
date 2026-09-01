import { describe, it, expect } from 'vitest'
import {
  GeneratorPatternTab,
  summarizeArrivalPattern,
  ArrivalsEditor,
  findArrivalUsage,
  RequirementField, RequirementFieldContext, ResourceRequirementsEditor, useRequirementCommit,
  ConnectorRoutingView,
  ConnectorMoveTimeSection,
  ResourcesEditor,
  ResourceEditor,
  ResourceLinkPicker,
  WorkSchedulesEditor,
  WorkScheduleModal,
  CapacitySourcePicker,
  workScheduleUsage,
  // Complexity views (Task 11a). Lucid mounts these directly in its own
  // editors (ActivityEditor, GeneratorEditor, ModelEditor) rather than
  // reimplementing the hook or the tell -- guard the barrel export they
  // travel on like every other shared panel.
  useView,
  ViewTell,
  SettingsPanel,
} from 'quodsi_studio/platforms/shared'

describe('shared panel import', () => {
  it('resolves the Studio panel barrel from quodsim-react', () => {
    expect(typeof GeneratorPatternTab).toBe('function')
    expect(typeof summarizeArrivalPattern).toBe('function')
    // The Arrivals tab body is shared, not reimplemented per host -- only tab
    // registration differs. This guards the import path Lucid's ArrivalsTab
    // wrapper depends on.
    expect(typeof ArrivalsEditor).toBe('function')
    expect(typeof findArrivalUsage).toBe('function')
    expect(typeof RequirementField).toBe('function')
    expect(typeof ResourceRequirementsEditor).toBe('function')
    expect(typeof useRequirementCommit).toBe('function')
    expect(RequirementFieldContext).toBeDefined()
    expect(typeof ConnectorRoutingView).toBe('function')
    expect(typeof ConnectorMoveTimeSection).toBe('function')
    // Plan 2b: the Resources tab body and BOTH halves of a Resource block's
    // editor (linked -> ResourceEditor, unlinked/dangling -> ResourceLinkPicker)
    // are shared, not reimplemented per host. Lucid deleted its own
    // features/editors/ResourceEditor.tsx in favour of these.
    expect(typeof ResourcesEditor).toBe('function')
    expect(typeof ResourceEditor).toBe('function')
    expect(typeof ResourceLinkPicker).toBe('function')
    // Work schedules (spec 2026-08-27 §6). Lucid mounts the Schedules tab
    // body (WorkSchedulesEditor) and the editor (WorkScheduleModal) itself;
    // CapacitySourcePicker reaches Lucid INDIRECTLY, compiled inside
    // ResourceEditor's own basic tab, and is named here so the barrel export
    // it travels on is guarded like every other shared panel.
    expect(typeof WorkSchedulesEditor).toBe('function')
    expect(typeof WorkScheduleModal).toBe('function')
    expect(typeof CapacitySourcePicker).toBe('function')
    expect(typeof workScheduleUsage).toBe('function')
    // Complexity views (Task 11a): useView/ViewTell are mounted directly in
    // Lucid's own editors; SettingsPanel reaches Lucid indirectly today (no
    // host modal in this half -- ViewTell falls back to switching the view
    // directly) but is named here so its export is guarded the same way.
    expect(typeof useView).toBe('function')
    expect(typeof ViewTell).toBe('function')
    expect(typeof SettingsPanel).toBe('function')
  })

  it('summarizes a pattern without a host', () => {
    const lines = summarizeArrivalPattern(
      { cycle: 'year', seasonMode: 'month', countMode: 'poisson' },
      8500,
    )
    expect(Array.isArray(lines)).toBe(true)
    expect(lines.length).toBeGreaterThan(0)
  })
})
