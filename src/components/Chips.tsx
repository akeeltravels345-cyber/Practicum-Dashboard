import type { ClientStatus } from '../data/types'
import { classNames } from '../utils/format'

export function ThemeChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[var(--color-sage-tint)] px-3 py-1 text-xs font-medium text-[var(--color-sage-deep)]">
      {label}
    </span>
  )
}

const STATUS_STYLES: Record<ClientStatus, string> = {
  Active: 'bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)]',
  'On Hold': 'bg-[var(--color-amber-tint)] text-[var(--color-amber-deep)]',
  Closed: 'bg-[var(--color-beige-deep)] text-[var(--color-ink)]/60',
  Intake: 'bg-[var(--color-source-tint)] text-[var(--color-source)]',
}

export function StatusBadge({ status, className }: { status: ClientStatus; className?: string }) {
  return (
    <span className={classNames('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', STATUS_STYLES[status], className)}>
      {status}
    </span>
  )
}
