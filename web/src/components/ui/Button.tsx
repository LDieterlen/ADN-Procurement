import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const STYLES: Record<Variant, string> = {
  primary: 'bg-neutral-900 text-white hover:bg-neutral-700 disabled:bg-neutral-400',
  secondary: 'border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-50 disabled:text-neutral-400',
  danger: 'border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:text-red-300',
  ghost: 'text-neutral-700 hover:bg-neutral-100 disabled:text-neutral-400',
}

export function Button({ variant = 'secondary', className = '', type = 'button', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`rounded-lg px-3.5 py-2 text-sm font-medium disabled:cursor-not-allowed ${STYLES[variant]} ${className}`} {...props} />
}
