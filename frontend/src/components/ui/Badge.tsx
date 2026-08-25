import type { ReactNode } from 'react'

export function Badge({
  children,
  active,
  className,
}: {
  children: ReactNode
  active?: boolean
  className?: string
}) {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium'
  const variant = active ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700'
  return <span className={`${base} ${variant} ${className ?? ''}`}>{children}</span>
}
