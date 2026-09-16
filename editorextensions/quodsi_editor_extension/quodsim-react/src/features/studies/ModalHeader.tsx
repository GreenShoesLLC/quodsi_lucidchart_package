/** Header for a chromeless Lucid modal: title on the left, an unambiguous
 *  "✕ Close" on the right (the modal has no native Lucid title bar or X). */
export function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-border bg-surface">
      <span className="text-[13px] font-semibold text-primary truncate">{title}</span>
      <button
        type="button"
        onClick={onClose}
        className="shrink-0 text-xs text-secondary bg-transparent border border-border rounded px-2.5 py-0.5 cursor-pointer hover:bg-surface-hover"
        title="Close and return to your diagram"
      >
        ✕ Close
      </button>
    </div>
  )
}
