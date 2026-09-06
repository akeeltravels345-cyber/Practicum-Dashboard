import type { EvidenceKind } from '../data/types'
import { classNames } from '../utils/format'

const LABELS: Record<EvidenceKind, string> = {
  source: 'SOURCE',
  synthesis: 'SYNTHESIS',
  hypothesis: 'HYPOTHESIS',
}

const STYLES: Record<EvidenceKind, string> = {
  source: 'tag-source',
  synthesis: 'tag-synthesis',
  hypothesis: 'tag-hypothesis',
}

export function EvidenceBadge({ kind, suffix, className }: { kind: EvidenceKind; suffix?: string; className?: string }) {
  return (
    <span
      className={classNames(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide uppercase',
        STYLES[kind],
        className,
      )}
    >
      {LABELS[kind]}
      {suffix ? <span className="font-normal normal-case opacity-80">— {suffix}</span> : null}
    </span>
  )
}
