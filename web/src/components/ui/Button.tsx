import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'
type Size = 'md' | 'sm' | 'xs'

const STYLES: Record<Variant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover hover:text-white disabled:bg-line-strong',
  secondary: 'border border-line-strong bg-surface text-ink hover:bg-sunken hover:text-ink disabled:text-ink-3',
  danger: 'text-danger hover:bg-sunken disabled:text-ink-3',
  ghost: 'text-ink-2 hover:bg-sunken hover:text-ink disabled:text-ink-3',
}
const SIZES: Record<Size, string> = { md: 'h-9 px-3.5', sm: 'h-[34px] px-3', xs: 'h-8 px-2.5 text-[13px]' }

/** The classes of a button, also for links that look like one (download, navigation). */
export function buttonClass(variant: Variant = 'secondary', size: Size = 'md', className = ''): string {
  return `inline-flex items-center justify-center gap-1.5 rounded-[6px] text-sm font-medium whitespace-nowrap transition-colors duration-[120ms] disabled:cursor-not-allowed ${SIZES[size]} ${STYLES[variant]} ${className}`
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button type={type} className={buttonClass(variant, size, className)} {...props} />
}

/** The « secondary » look for links that download or navigate (same box as a button). */
export const linkButtonClass = buttonClass('secondary')
