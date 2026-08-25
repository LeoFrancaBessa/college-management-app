import type { ButtonHTMLAttributes } from 'react'

export function Button({
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const base =
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition min-h-[44px]'
  const v =
    variant === 'primary'
      ? 'bg-primary text-white hover:brightness-95'
      : variant === 'danger'
        ? 'bg-red-600 text-white'
        : 'bg-gray-100 text-gray-900'
  return <button className={`${base} ${v} focus-visible:ring-2 focus-visible:ring-primary`} {...props} />
}
