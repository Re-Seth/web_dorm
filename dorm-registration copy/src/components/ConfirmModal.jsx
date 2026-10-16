export default function ConfirmModal({ open, title, description, confirmLabel = 'ยืนยัน', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="card max-w-sm w-full">
        <h3 id="confirm-modal-title" className="font-display text-lg font-semibold mb-2">
          {title}
        </h3>
        <p className="text-sm text-bone/70 mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button className="btn-ghost" onClick={onCancel}>
            ยกเลิก
          </button>
          <button className="btn-primary" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
