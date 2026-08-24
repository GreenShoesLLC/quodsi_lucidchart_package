import { describe, it, expect } from 'vitest'
import {
  GeneratorPatternTab,
  summarizeArrivalPattern,
  ArrivalsEditor,
  findArrivalUsage,
  RequirementField, RequirementFieldContext, ResourceRequirementsEditor, useRequirementCommit,
  ConnectorRoutingView,
  ResourcesEditor,
  ResourceEditor,
  ResourceLinkPicker,
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
    // Plan 2b: the Resources tab body and BOTH halves of a Resource block's
    // editor (linked -> ResourceEditor, unlinked/dangling -> ResourceLinkPicker)
    // are shared, not reimplemented per host. Lucid deleted its own
    // features/editors/ResourceEditor.tsx in favour of these.
    expect(typeof ResourcesEditor).toBe('function')
    expect(typeof ResourceEditor).toBe('function')
    expect(typeof ResourceLinkPicker).toBe('function')
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
