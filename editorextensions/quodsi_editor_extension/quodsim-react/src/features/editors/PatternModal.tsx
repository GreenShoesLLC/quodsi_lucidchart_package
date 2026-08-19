// Full-width host for GeneratorPatternTab's Season/Week/Day cascade.
//
// Lucid's RightDockPanel is 300px (RightDockPanel.ts). quodsi_drawio built the
// same modal because its own 340px panel could not host this: in 52-week
// Season mode that is roughly 5px per bar, and the cascade's whole design
// (take in a layer at a glance, click a bar, watch the layer below react) does
// not survive that width. At 300px the argument is stronger.
//
// No iframe and no token: GeneratorPatternTab is compiled into this bundle
// from quodsi_studio source and runs in-process against the same accessor the
// panel holds, so an edit here is visible there immediately and vice versa.
//
// `shapeId` is a snapshot of the selection when the trigger was clicked, not a
// live read -- clicking elsewhere on the canvas must not swap the generator
// out from under the user. GeneratorPatternTab renders its own "not found"
// message if the generator is later deleted.
//
// Backdrop click deliberately does NOT dismiss; Esc does.

import { useEffect } from 'react'
import { GeneratorPatternTab } from 'quodsi_studio/platforms/shared'
import type { ModelStateAccessor } from 'quodsi_studio/platforms/shared'

type Props = {
  open: boolean
  onClose: () => void
  shapeId: string
  accessor: ModelStateAccessor
}

export function PatternModal({ open, onClose, shapeId, accessor }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      data-testid="pattern-modal-backdrop"
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center"
    >
      <div
        className="bg-surface rounded-lg shadow-xl border border-border-strong flex flex-col w-full h-full max-w-[95vw] max-h-[95vh]"
        role="dialog"
        aria-modal="true"
        aria-label="Arrival Pattern"
      >
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-raised border-b border-border rounded-t-lg">
          <span className="text-sm font-medium text-secondary">Arrival Pattern</span>
          <button
            type="button"
            aria-label="Close"
            title="Close and return to the panel view"
            className="ml-auto text-muted hover:text-secondary text-lg leading-none px-1"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 min-h-0 overflow-auto p-4">
          <GeneratorPatternTab shapeId={shapeId} accessor={accessor} showLevers={false} />
        </div>
      </div>
    </div>
  )
}
