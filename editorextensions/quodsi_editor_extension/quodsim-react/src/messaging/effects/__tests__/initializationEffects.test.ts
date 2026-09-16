import { renderHook } from '@testing-library/react'
import { usePanelTypeDetectionEffect } from '../initializationEffects'

function detect(search: string, initialPanelType?: Parameters<typeof usePanelTypeDetectionEffect>[2]) {
  window.history.replaceState({}, '', `/${search}`)
  const dispatch = vi.fn()
  renderHook(() => usePanelTypeDetectionEffect({ app: { initialized: false } }, dispatch, initialPanelType))
  expect(dispatch).toHaveBeenCalledTimes(1)
  return dispatch.mock.calls[0][0].panelType
}

describe('usePanelTypeDetectionEffect', () => {
  afterEach(() => window.history.replaceState({}, '', '/'))

  it.each(['studies', 'advisor'])('maps ?view=%s to the studio-embed channel, even without the prop', (view) => {
    expect(detect(`?view=${view}`)).toBe('studio-embed')
  })

  it('agrees with the studio-embed prop App passes for those views', () => {
    expect(detect('?view=studies', 'studio-embed')).toBe('studio-embed')
  })

  it('no longer treats ?view=studio-embed as a view (nothing opens one)', () => {
    expect(detect('?view=studio-embed')).toBe('model')
  })

  it('keeps the other explicit views and the model default', () => {
    expect(detect('?view=work-schedule')).toBe('work-schedule')
    expect(detect('?view=results')).toBe('results')
    expect(detect('')).toBe('model')
  })
})
