import { ShieldAlert } from 'lucide-react'

export function PhiBanner() {
  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-[var(--color-clay)]/25 bg-[var(--color-clay-tint)]/60 px-4 py-3 text-sm text-[var(--color-clay-deep)]">
      <ShieldAlert size={16} className="mt-0.5 shrink-0" />
      <p>
        <strong className="font-semibold">This is a practicum thinking tool, not a secured clinical record.</strong>{' '}
        Real PHI (names, contact details, identifying specifics) should only be entered into an appropriately secured
        and program-approved system. Client entries here should remain de-identified.
      </p>
    </div>
  )
}
