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
    <div role="tablist" className="flex gap-1 border-b border-gray-200 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onValueChange(t.value)}
          className={`px-4 py-3 min-h-[44px] text-sm border-b-2 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 rounded-t-lg transition ${value === t.value ? 'border-primary text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
