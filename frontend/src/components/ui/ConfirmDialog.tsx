export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full">
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-gray-600 mt-2">{description}</p>
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2">
            Cancelar
          </button>
          <button onClick={onConfirm} className="px-4 py-2 bg-primary text-white rounded-lg">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
