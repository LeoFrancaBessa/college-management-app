export function Tabs({
  value,
  onValueChange,
  tabs,
}: {
  value: string
  onValueChange: (v: string) => void
  tabs: { value: string; label: string }[]
}) {
  return (
    <div className="flex gap-1 border-b border-gray-200">
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onValueChange(t.value)}
          className={`px-4 py-2 text-sm border-b-2 ${value === t.value ? 'border-primary text-gray-900' : 'border-transparent text-gray-500'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
