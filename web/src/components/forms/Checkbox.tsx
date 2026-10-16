// A checkbox and its label, one look everywhere: the box aligned on the first line, an optional hint below. Controlled
// (`checked`, `onChange`) or registered with react-hook-form (`{...form.register(name)}`), like a native input.
import { useId, type ComponentProps, type ReactNode } from 'react'

export function Checkbox({ label, hint, className = '', ...input }: Omit<ComponentProps<'input'>, 'type'> & { label: ReactNode; hint?: ReactNode }) {
  const hintId = useId()
  // The hint describes the box (aria-describedby) without lengthening its name.
  return (
    <div className={className}>
      <label className="flex items-start gap-2.5">
        <input type="checkbox" className="mt-[3px] shrink-0" aria-describedby={hint ? hintId : undefined} {...input} />
        <span>{label}</span>
      </label>
      {hint && (
        <p id={hintId} className="mt-0.5 pl-[23px] text-[12.5px] text-ink-3">
          {hint}
        </p>
      )}
    </div>
  )
}
