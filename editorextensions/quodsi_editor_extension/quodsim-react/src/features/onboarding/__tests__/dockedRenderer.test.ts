import type { TourFrame } from 'quodsi_studio/platforms/shared'
import { createDockedRenderer } from '../dockedRenderer'

function frame(over: Partial<TourFrame> = {}): TourFrame {
  return {
    target: null,
    type: 'tooltip',
    side: 'left',
    title: 'Turn the diagram into a model',
    body: 'Click Convert.',
    progress: { index: 3, total: 20 },
    primary: { label: 'Next' },
    secondary: { label: 'Skip tour' },
    onPrimary: vi.fn(),
    onSecondary: vi.fn(),
    onDismiss: vi.fn(),
    ...over,
  }
}

describe('dockedRenderer', () => {
  let container: HTMLElement
  let target: HTMLElement
  let other: HTMLElement
  beforeEach(() => {
    document.body.innerHTML = ''
    container = document.createElement('div')
    target = document.createElement('button')
    other = document.createElement('button')
    document.body.append(container, target, other)
  })

  it('dockedRenderer shows the card in the container and outlines the target; clear removes both', () => {
    const r = createDockedRenderer(container)
    const f = frame({ target: () => target })
    r.show(f)

    expect(container.textContent).toContain('Turn the diagram into a model')
    expect(container.textContent).toContain('Click Convert.')
    expect(container.querySelector('[data-tour-progress]')!.textContent).toBe('Step 3 of 20')
    expect(target.getAttribute('data-quodsi-tour-target')).toBe('true')
    expect(target.style.outline).toContain('2px solid')
    expect(target.style.outlineOffset).toBe('2px')
    // No backdrop, nothing outside the container.
    expect(document.querySelector('[data-tour-backdrop]')).toBeNull()

    ;(container.querySelector('[data-tour-primary]') as HTMLElement).click()
    ;(container.querySelector('[data-tour-secondary]') as HTMLElement).click()
    ;(container.querySelector('[data-tour-dismiss]') as HTMLElement).click()
    expect(f.onPrimary).toHaveBeenCalledTimes(1)
    expect(f.onSecondary).toHaveBeenCalledTimes(1)
    expect(f.onDismiss).toHaveBeenCalledTimes(1)

    // A new step moves the outline.
    r.show(frame({ target: () => other }))
    expect(target.hasAttribute('data-quodsi-tour-target')).toBe(false)
    expect(target.style.outline).toBe('')
    expect(other.getAttribute('data-quodsi-tour-target')).toBe('true')

    r.clear()
    expect(container.innerHTML).toBe('')
    expect(other.hasAttribute('data-quodsi-tour-target')).toBe(false)
    expect(other.style.outline).toBe('')
  })

  it('omits the progress for an off-path frame and shows a waiting cue without a primary', () => {
    const r = createDockedRenderer(container)
    r.show(frame({ progress: undefined, primary: undefined }))
    expect(container.querySelector('[data-tour-progress]')).toBeNull()
    expect(container.querySelector('[data-tour-primary]')).toBeNull()
    expect(container.querySelector('[data-tour-waiting]')).not.toBeNull()
    r.destroy()
    expect(container.innerHTML).toBe('')
  })
})
