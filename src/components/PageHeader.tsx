import type { ReactNode } from 'react'

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-sage-deep)] mb-1.5">
            {eyebrow}
          </div>
        )}
        <h1 className="font-serif-display text-2xl sm:text-3xl text-[var(--color-ink)]">{title}</h1>
        {subtitle && <p className="text-sm sm:text-[15px] text-[var(--color-ink)]/60 mt-1.5 max-w-2xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  )
}
