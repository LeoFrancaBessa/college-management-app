export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/40 flex items-start justify-center pt-20 p-4 z-50" onClick={onClose}>
      <div
        className="bg-white rounded-xl p-6 max-w-lg w-full shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm text-gray-600">IA — em breve (Task 8)</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-primary text-white rounded-lg text-sm">
          Fechar
        </button>
      </div>
    </div>
  )
}
