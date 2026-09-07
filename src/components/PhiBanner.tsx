import { ShieldAlert } from 'lucide-react'

export function PhiBanner() {
  return (
    // Condensed to one line. The full wording is still the title, so the detail
    // is a hover away rather than occupying the top of every visit.
    <div
      className="flex items-center gap-2.5 rounded-xl border border-[var(--color-clay)]/25 bg-[var(--color-clay-tint)]/60 px-4 py-2.5 text-[13px] text-[var(--color-clay-deep)]"
      title="Real PHI (names, contact details, identifying specifics) should only be entered into an appropriately secured and program-approved system."
    >
      <ShieldAlert size={15} className="shrink-0" />
      <p>Practicum thinking tool, not a secured record. Keep entries de-identified.</p>
    </div>
  )
}
