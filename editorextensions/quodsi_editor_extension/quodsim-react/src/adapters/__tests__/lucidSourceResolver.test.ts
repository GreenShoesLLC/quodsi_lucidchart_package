// The "go to source" rule itself (model-level, entity and element-less issues)
// is tested once, in quodsi_studio's embeddedSourceResolver.test.ts
// (createLocateResolver). This file pins the panel's wiring: locate sends
// LOCATE_ELEMENT through the model-ops sender, and nothing else (the panel has
// no modal to close).
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { EnvelopeMessageType } from '@quodsi/lucid-shared'
import { ValidationSeverity, type ValidationIssue } from '@quodsi/shared'
import { useLucidSourceResolver } from '../lucidSourceResolver'

const { send } = vi.hoisted(() => ({ send: vi.fn() }))
vi.mock('../../messaging/senders/useSender', () => ({ useSender: () => send }))

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

describe('useLucidSourceResolver (spec 2026-09-13 §1)', () => {
  beforeEach(() => send.mockClear())

  it('locate sends LOCATE_ELEMENT with the element id, and nothing else', () => {
    const { result } = renderHook(() => useLucidSourceResolver())

    expect(result.current.canLocate(issue())).toBe(true)
    result.current.locate(issue())

    expect(send).toHaveBeenCalledTimes(1)
    expect(send).toHaveBeenCalledWith(EnvelopeMessageType.LOCATE_ELEMENT, { elementId: 'act-1' })
  })

  it('applies the shared rule: a model-level issue is not locatable', () => {
    const { result } = renderHook(() => useLucidSourceResolver())
    expect(result.current.canLocate(issue({ code: 'missing_finish_datetime' }))).toBe(false)
  })

  it('keeps the same resolver across re-renders', () => {
    const { result, rerender } = renderHook(() => useLucidSourceResolver())
    const first = result.current
    rerender()
    expect(result.current).toBe(first)
  })
})
