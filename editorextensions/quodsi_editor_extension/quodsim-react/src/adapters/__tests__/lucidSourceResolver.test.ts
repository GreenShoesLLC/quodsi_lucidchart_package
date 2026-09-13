import { describe, it, expect, vi } from 'vitest'
import { ValidationSeverity, type ValidationIssue } from '@quodsi/shared'
import { createLucidSourceResolver } from '../lucidSourceResolver'

function issue(overrides: Partial<ValidationIssue> = {}): ValidationIssue {
  return {
    id: 'i1',
    severity: ValidationSeverity.ERROR,
    code: 'no_outgoing_connectors',
    message: 'Triage has no outgoing connectors',
    elementId: 'act-1',
    ...overrides,
  }
}

describe('createLucidSourceResolver (spec 2026-09-13 §1)', () => {
  it('locates a shape issue by sending its element id', () => {
    const locateElement = vi.fn()
    const resolver = createLucidSourceResolver(locateElement)

    expect(resolver.canLocate(issue())).toBe(true)
    resolver.locate(issue())

    expect(locateElement).toHaveBeenCalledWith('act-1')
  })

  it('does not locate model-level, entity or element-less issues', () => {
    const resolver = createLucidSourceResolver(vi.fn())

    expect(resolver.canLocate(issue({ code: 'missing_finish_datetime' }))).toBe(false)
    expect(resolver.canLocate(issue({ context: { objectType: 'Entity' } }))).toBe(false)
    expect(resolver.canLocate(issue({ elementId: undefined }))).toBe(false)
  })

  it('never offers a fix', () => {
    expect(createLucidSourceResolver(vi.fn()).canFix(issue())).toBe(false)
  })
})
