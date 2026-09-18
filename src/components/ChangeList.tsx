import { useState } from 'react'
import type { ChangeKind, EvidenceSource, ProposedChange } from '../data/types'
import { CHANGE_KIND_LABEL, EVIDENCE_SOURCE_LABEL } from '../data/types'
import { classNames } from '../utils/format'

// Direction of change, colour-coded so a scan down the list reads at a glance:
// green for evidence building up, amber for it pulling apart, neutral for edits.
const KIND_STYLE: Record<ChangeKind, string> = {
  confirms: 'bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)]',
  strengthens: 'bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)]',
  adds: 'bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)]',
  weakens: 'bg-[var(--color-amber-tint)] text-[var(--color-amber-deep)]',
  contradicts: 'bg-[var(--color-clay-tint)] text-[var(--color-clay-deep)]',
  uncertain: 'bg-[var(--color-amber-tint)] text-[var(--color-amber-deep)]',
  revises: 'bg-[var(--color-beige)] text-[var(--color-ink)]/70',
  removes: 'bg-[var(--color-beige)] text-[var(--color-ink)]/70',
}

// Evidence tiers. "Client said" and "You documented" are real text from the
// session; "Inferred" is the engine or AI and is styled to look different, so
// a hypothesis can never be mistaken for a quote.
const SOURCE_STYLE: Record<EvidenceSource, string> = {
  transcript: 'bg-[var(--color-source-tint)] text-[var(--color-source)]',
  note: 'bg-[var(--color-beige)] text-[var(--color-ink)]/70',
  intake: 'bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)]',
  inference: 'bg-[var(--color-hypothesis-tint)] text-[var(--color-hypothesis)]',
}

function Clamp({ text, className }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 220
  return (
    <div className={className}>
      <span className="whitespace-pre-wrap">{open || !long ? text : `${text.slice(0, 220).trimEnd()}…`}</span>
      {long && (
        <button onClick={() => setOpen((v) => !v)} className="ml-1 text-[11px] font-medium text-[var(--color-sage-deep)] hover:underline">
          {open ? 'less' : 'more'}
        </button>
      )}
    </div>
  )
}

/**
 * When two versions share a long opening (a kept paragraph with a new section
 * after it), start both excerpts just before they diverge. Otherwise the
 * truncated Before and Proposed boxes look identical and the change is hidden.
 */
function fromDivergence(before: string, after: string): [string, string] {
  let i = 0
  const max = Math.min(before.length, after.length)
  while (i < max && before[i] === after[i]) i++
  if (i < 120) return [before, after]
  const cut = before.lastIndexOf(' ', i - 40) + 1 || i - 40
  return [`…${before.slice(cut)}`, `…${after.slice(cut)}`]
}

/**
 * One row per proposed change: what changed → why → the evidence → which session.
 * This is the trail that lets a supervisor (or you, in a month) see why the
 * record says what it says.
 */
export function ChangeList({ changes }: { changes: ProposedChange[] }) {
  if (changes.length === 0) {
    return <p className="text-xs text-[var(--color-ink)]/45 italic">No individual changes itemised for this section.</p>
  }
  return (
    <ol className="space-y-3">
      {changes.map((c) => {
        const [before, after] = fromDivergence(c.before, c.after)
        return (
        <li key={c.id} className="rounded-lg bg-[var(--color-paper)] border border-[var(--color-beige-deep)] px-3.5 py-3">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={classNames('rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide', KIND_STYLE[c.kind])}>
              {CHANGE_KIND_LABEL[c.kind]}
            </span>
            <span className="text-sm font-medium text-[var(--color-ink)]/85">{c.label}</span>
            <span className="ml-auto text-[11px] text-[var(--color-ink)]/40">Session {c.sessionNumber}</span>
          </div>

          {(c.before || c.after) && (
            <div className="grid sm:grid-cols-2 gap-2 mb-2">
              <div className="rounded bg-[var(--color-beige)]/40 px-2.5 py-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40">Before</div>
                <Clamp text={before || 'Nothing recorded'} className="text-[13px] text-[var(--color-ink)]/60" />
              </div>
              <div className="rounded bg-[var(--color-sage-tint)]/50 px-2.5 py-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-sage-deep)]/80">Proposed</div>
                <Clamp text={after || 'Removed'} className="text-[13px] text-[var(--color-ink)]/80" />
              </div>
            </div>
          )}

          {c.why && (
            <p className="text-[13px] text-[var(--color-ink)]/70 mb-2">
              <span className="font-semibold text-[var(--color-ink)]/80">Why: </span>
              {c.why}
            </p>
          )}

          {c.evidence.length > 0 && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40 mb-1">Evidence</div>
              <ul className="space-y-1">
                {c.evidence.map((e, i) => (
                  <li key={i} className="flex items-start gap-2 text-[13px]">
                    <span className={classNames('mt-px shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold', SOURCE_STYLE[e.source])}>
                      {EVIDENCE_SOURCE_LABEL[e.source]}
                    </span>
                    <span className={e.source === 'inference' ? 'italic text-[var(--color-ink)]/55' : 'text-[var(--color-ink)]/75'}>
                      {e.source === 'inference' ? e.text : `"${e.text}"`}
                      {e.sessionNumber ? <span className="ml-1 not-italic text-[var(--color-ink)]/35">(session {e.sessionNumber})</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </li>
        )
      })}
    </ol>
  )
}
