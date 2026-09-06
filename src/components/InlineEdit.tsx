import { useEffect, useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { classNames } from '../utils/format'

export function InlineEdit({
  value,
  onSave,
  multiline = true,
  placeholder = 'Click to add…',
  textClassName,
  label,
}: {
  value: string
  onSave: (next: string) => void
  multiline?: boolean
  placeholder?: string
  textClassName?: string
  label?: string
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null)

  useEffect(() => {
    if (editing) ref.current?.focus()
  }, [editing])

  useEffect(() => {
    setDraft(value)
  }, [value])

  function commit() {
    setEditing(false)
    if (draft !== value) onSave(draft)
  }

  if (editing) {
    const commonProps = {
      value: draft,
      onChange: (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => setDraft(e.target.value),
      onBlur: commit,
      className:
        'w-full rounded-lg border border-[var(--color-sage)] bg-[var(--color-paper)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)]',
      placeholder,
    }
    return multiline ? (
      <textarea {...commonProps} ref={ref as React.RefObject<HTMLTextAreaElement>} className={commonProps.className + ' min-h-[90px] resize-y'} />
    ) : (
      <input {...commonProps} ref={ref as React.RefObject<HTMLInputElement>} />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={classNames(
        'group block w-full text-left rounded-lg px-3 py-2 -mx-3 hover:bg-[var(--color-beige)]/70 transition-colors',
      )}
      aria-label={label ? `Edit ${label}` : 'Edit'}
    >
      {value ? (
        <span className={classNames('whitespace-pre-wrap', textClassName)}>{value}</span>
      ) : (
        <span className="text-[var(--color-ink)]/35 italic">{placeholder}</span>
      )}
      <Pencil size={12} className="inline-block ml-2 mb-0.5 opacity-0 group-hover:opacity-40 transition-opacity" />
    </button>
  )
}
