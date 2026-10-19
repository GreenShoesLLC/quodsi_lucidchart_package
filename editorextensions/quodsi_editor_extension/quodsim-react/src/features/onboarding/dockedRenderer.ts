// quodsim-react/src/features/onboarding/dockedRenderer.ts
//
// The side panel's TourRenderer (spec 2026-10-16 L5, mockup option A): the
// card is docked at the top of the 300px panel, the editor shifts down below
// it, and the step's target gets an outline. No backdrop and no positioning —
// `side`/`align` are a floating card's concerns, and there is no room to float
// in the panel. The Studies modal keeps the shared overlay renderer.
//
// Plain DOM like the overlay renderer: the session calls show/clear from inside
// the machine, outside React's render cycle.
import type { TourFrame, TourRenderer } from 'quodsi_studio/platforms/shared'

const TARGET_ATTR = 'data-quodsi-tour-target'

type Outlined = { el: HTMLElement; outline: string; outlineOffset: string }

export function createDockedRenderer(container: HTMLElement): TourRenderer {
  let outlined: Outlined | null = null

  function unoutline(): void {
    if (!outlined) return
    const { el, outline, outlineOffset } = outlined
    el.removeAttribute(TARGET_ATTR)
    el.style.outline = outline
    el.style.outlineOffset = outlineOffset
    outlined = null
  }

  function outline(target: Element | null): void {
    if (outlined?.el === target) return
    unoutline()
    if (!(target instanceof HTMLElement)) return
    outlined = { el: target, outline: target.style.outline, outlineOffset: target.style.outlineOffset }
    target.setAttribute(TARGET_ATTR, 'true')
    target.style.outline = '2px solid rgb(var(--accent))'
    target.style.outlineOffset = '2px'
    // The editor sits below the card and may be scrolled: bring the control
    // the card names into view. jsdom has no scrollIntoView.
    target.scrollIntoView?.({ block: 'nearest' })
  }

  function button(label: string, kind: 'primary' | 'secondary', onClick: () => void): HTMLButtonElement {
    const b = document.createElement('button')
    b.type = 'button'
    b.setAttribute(`data-tour-${kind}`, '')
    b.textContent = label
    b.className = kind === 'primary'
      ? 'px-3 py-1 rounded bg-accent text-surface font-medium'
      : 'px-1 py-1 text-secondary underline'
    b.addEventListener('click', onClick)
    return b
  }

  function clear(): void {
    container.innerHTML = ''
    unoutline()
  }

  return {
    show(frame: TourFrame) {
      container.innerHTML = ''

      const card = document.createElement('div')
      card.setAttribute('data-tour-card', '')
      card.setAttribute('role', 'dialog')
      card.setAttribute('aria-label', frame.title || 'Quodsi tour')
      card.className = 'p-3 border-b border-border bg-surface text-sm space-y-2 shadow-sm'

      const header = document.createElement('div')
      header.className = 'flex items-start gap-2'
      const h = document.createElement('h2')
      h.className = 'flex-1 m-0 font-semibold text-sm leading-snug'
      h.textContent = frame.title
      const close = document.createElement('button')
      close.type = 'button'
      close.setAttribute('data-tour-dismiss', '')
      // × exits without ending the tour (the cursor stays resumable).
      close.setAttribute('aria-label', 'Exit tour (you can resume later)')
      close.className = 'px-1 leading-none text-muted'
      close.textContent = '×'
      close.addEventListener('click', () => frame.onDismiss())
      header.append(h, close)

      const body = document.createElement('p')
      body.className = 'm-0 text-secondary'
      body.textContent = frame.body

      const footer = document.createElement('div')
      footer.className = 'flex items-center gap-3'
      const lead = document.createElement('span')
      lead.className = 'flex-1 text-xs text-muted'
      // Off-path frames carry no progress: no number rather than a misleading one.
      if (frame.progress) {
        lead.setAttribute('data-tour-progress', '')
        lead.textContent = `Step ${frame.progress.index} of ${frame.progress.total}`
      }
      footer.append(lead)
      if (frame.secondary) footer.append(button(frame.secondary.label, 'secondary', () => frame.onSecondary()))
      if (frame.primary) {
        footer.append(button(frame.primary.label, 'primary', () => frame.onPrimary()))
      } else {
        // An action step advances on the user's own action; say it is waiting.
        const waiting = document.createElement('span')
        waiting.setAttribute('data-tour-waiting', '')
        waiting.className = 'text-xs italic text-muted'
        waiting.textContent = 'Waiting for you…'
        footer.append(waiting)
      }

      card.append(header, body, footer)
      container.append(card)

      outline(frame.target?.() ?? null)
    },
    clear,
    destroy: clear,
  }
}
