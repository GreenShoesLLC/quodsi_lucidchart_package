import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { consumePendingModelEditorTab, setPendingModelEditorTab } from '../../../utils/pendingNavigation'
import { useModelEditorTab } from '../useModelEditorTab'

beforeEach(() => {
  consumePendingModelEditorTab()
})

describe('useModelEditorTab (spec 2026-09-13 §1)', () => {
  it('starts on Basic', () => {
    const { result } = renderHook(() => useModelEditorTab(vi.fn()))

    expect(result.current.activeTab).toBe('Basic')
  })

  it('asks for a fresh validation when Validation is selected, and not for other tabs', () => {
    const onValidate = vi.fn()
    const { result } = renderHook(() => useModelEditorTab(onValidate))

    act(() => result.current.onTabChange('States'))
    expect(result.current.activeTab).toBe('States')
    expect(onValidate).not.toHaveBeenCalled()

    act(() => result.current.onTabChange('Validation'))
    expect(result.current.activeTab).toBe('Validation')
    expect(onValidate).toHaveBeenCalledTimes(1)
  })

  it('applies a pending deep link once, and keeps the current tab when nothing is pending', () => {
    const { result } = renderHook(() => useModelEditorTab(vi.fn()))

    act(() => result.current.onTabChange('Levers'))
    act(() => result.current.applyPendingTab())
    expect(result.current.activeTab).toBe('Levers')

    setPendingModelEditorTab('States')
    act(() => result.current.applyPendingTab())
    expect(result.current.activeTab).toBe('States')

    act(() => result.current.onTabChange('Levers'))
    act(() => result.current.applyPendingTab())
    expect(result.current.activeTab).toBe('Levers')
  })

  // final-fix brief 2026-09-13, Fix 3: a "Go to Model Editor" link that stored
  // 'Validation' would apply the tab but never ask for a fresh result -- a
  // stale one (or none) would render.
  it('a pending Validation deep link also asks for a fresh validation result', () => {
    const onValidate = vi.fn()
    const { result } = renderHook(() => useModelEditorTab(onValidate))

    setPendingModelEditorTab('Validation')
    act(() => result.current.applyPendingTab())

    expect(result.current.activeTab).toBe('Validation')
    expect(onValidate).toHaveBeenCalledTimes(1)
  })

  it('a pending States deep link does not ask for a validation result', () => {
    const onValidate = vi.fn()
    const { result } = renderHook(() => useModelEditorTab(onValidate))

    setPendingModelEditorTab('States')
    act(() => result.current.applyPendingTab())

    expect(result.current.activeTab).toBe('States')
    expect(onValidate).not.toHaveBeenCalled()
  })

  it('keeps applyPendingTab referentially stable across a rerender with a new onValidate', () => {
    const { result, rerender } = renderHook(({ onValidate }) => useModelEditorTab(onValidate), {
      initialProps: { onValidate: vi.fn() },
    })
    const first = result.current.applyPendingTab

    rerender({ onValidate: vi.fn() })

    expect(result.current.applyPendingTab).toBe(first)
  })
})
