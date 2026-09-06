import type { InputHTMLAttributes, LabelHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { classNames } from '../utils/format'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-[var(--color-ink)]/80 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-[var(--color-ink)]/45 mt-1">{hint}</span>}
    </label>
  )
}

const baseInputClass =
  'w-full rounded-lg border border-[var(--color-beige-deep)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-ink)]/35 focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)] focus:border-transparent transition-shadow'

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={classNames(baseInputClass, props.className)} />
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={classNames(baseInputClass, 'min-h-[90px] resize-y', props.className)} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={classNames(baseInputClass, props.className)} />
}

export function FieldLabel(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={classNames('block text-sm font-medium text-[var(--color-ink)]/80 mb-1.5', props.className)} />
}

export function PrimaryButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={classNames(
        'inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-charcoal)] px-4 py-2.5 text-sm font-medium text-[var(--color-cream)] hover:bg-[var(--color-charcoal-2)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({ children, className, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      className={classNames(
        'inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-beige-deep)] bg-transparent px-4 py-2.5 text-sm font-medium text-[var(--color-ink)]/80 hover:bg-[var(--color-beige)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  )
}
