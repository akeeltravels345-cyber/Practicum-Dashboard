import type { ReactNode } from 'react'
import type { EvidenceKind } from '../data/types'
import { EvidenceBadge } from './EvidenceBadge'

export function SectionCard({
  title,
  evidence,
  evidenceSuffix,
  actions,
  children,
}: {
  title: string
  evidence?: EvidenceKind
  evidenceSuffix?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="card p-5 mb-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-serif-display text-base text-[var(--color-ink)]">{title}</h3>
          {evidence && <EvidenceBadge kind={evidence} suffix={evidenceSuffix} />}
        </div>
        {actions}
      </div>
      {children}
    </div>
  )
}
