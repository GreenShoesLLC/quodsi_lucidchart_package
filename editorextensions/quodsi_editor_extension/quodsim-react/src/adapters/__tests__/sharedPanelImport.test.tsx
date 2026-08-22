import { describe, it, expect } from 'vitest'
import {
  GeneratorPatternTab,
  summarizeArrivalPattern,
  ArrivalsEditor,
  findArrivalUsage,
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
