import { describe, it, expect } from 'vitest'
import { GeneratorPatternTab, summarizeArrivalPattern } from 'quodsi_studio/platforms/shared'

describe('shared panel import', () => {
  it('resolves the Studio panel barrel from quodsim-react', () => {
    expect(typeof GeneratorPatternTab).toBe('function')
    expect(typeof summarizeArrivalPattern).toBe('function')
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
