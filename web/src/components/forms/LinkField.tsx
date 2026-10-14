// An address field shown as a clickable link (opens in a new tab) while it holds the saved address,
// with « Modifier » to get the input back; empty, being typed or not http(s) = the plain input.
import { useEffect, useState } from 'react'
import { useFormContext, useWatch } from 'react-hook-form'
import { buttonClass } from '../ui/Button'
import { Field, controlClass } from './Field'
import { TextInput } from './TextInput'

export function LinkField({ name, label, placeholder }: { name: string; label: string; placeholder?: string }) {
  const { control, getFieldState, formState } = useFormContext()
  const value = useWatch({ control, name }) as string | undefined
  const saved: unknown = (formState.defaultValues as Record<string, unknown> | undefined)?.[name]
  const [editing, setEditing] = useState(false)
  useEffect(() => setEditing(false), [saved]) // loaded or saved again: back to the link
  const href = value?.trim() ?? ''
  if (editing || getFieldState(name, formState).isDirty || !/^https?:\/\//i.test(href)) {
    return <TextInput name={name} label={label} placeholder={placeholder} autoFocus={editing} />
  }
  return (
    <Field name={name} label={label}>
      <div className={`${controlClass} flex items-center gap-2`}>
        <a href={href} target="_blank" rel="noreferrer" title={href} className="min-w-0 flex-1 truncate text-accent underline">
          {href.replace(/^https?:\/\/(www\.)?/i, '')}
        </a>
        <button type="button" className={buttonClass('ghost', 'xs', '-mr-2 h-7')} onClick={() => setEditing(true)}>
          Modifier
        </button>
      </div>
    </Field>
  )
}
