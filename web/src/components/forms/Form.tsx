// Form shell: react-hook-form provider, optional error banner, native validation disabled (the API validates).
import { useId, type ReactNode } from 'react'
import { FormProvider, type FieldValues, type UseFormReturn } from 'react-hook-form'
import { FieldIdContext } from './Field'

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  banner,
  children,
}: {
  form: UseFormReturn<T>
  onSubmit: (values: T) => void | Promise<void>
  banner?: string | null
  children: ReactNode
}) {
  const prefix = useId()
  return (
    <FormProvider {...form}>
      <FieldIdContext.Provider value={prefix}>
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
          {banner && (
            <div role="alert" className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
              {banner}
            </div>
          )}
          {children}
        </form>
      </FieldIdContext.Provider>
    </FormProvider>
  )
}
