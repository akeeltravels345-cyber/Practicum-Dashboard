import { useState } from 'react'
import type { Client, Session } from '../../data/types'
import { EvidenceBadge } from '../../components/EvidenceBadge'
import { InlineEdit } from '../../components/InlineEdit'
import { useWorkspaceStore } from '../../state/store'
import { formatDate } from '../../utils/format'
import { ChevronDown, ChevronUp } from 'lucide-react'

export function SessionTimelineTab({ client }: { client: Client }) {
  const sessions = [...client.sessions].sort((a, b) => b.sessionNumber - a.sessionNumber)

  if (sessions.length === 0) {
    return <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50">No sessions recorded yet. Paste a session to begin the timeline.</div>
  }

  return (
    <div className="space-y-4">
      {sessions.map((s) => (
        <SessionCard key={s.id} client={client} session={s} />
      ))}
    </div>
  )
}

function SessionCard({ client, session }: { client: Client; session: Session }) {
  const [expanded, setExpanded] = useState(false)
  const updateClient = useWorkspaceStore((s) => s.updateClient)

  function patchSession(patch: Partial<Session>) {
    updateClient(client.id, {
      sessions: client.sessions.map((s) => (s.id === session.id ? { ...s, ...patch } : s)),
    })
  }

  const hasImpact =
    session.longitudinalImpact.confirmed.length ||
    session.longitudinalImpact.expanded.length ||
    session.longitudinalImpact.complicated.length ||
    session.longitudinalImpact.contradicted.length

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="font-serif-display text-base text-[var(--color-ink)]">
            Session {session.sessionNumber} · {formatDate(session.date)}
          </div>
          <div className="text-xs text-[var(--color-ink)]/45 mt-0.5">
            {session.duration} hour{session.duration === 1 ? '' : 's'}
            {session.isSeed ? ' · reconstructed summary — verify against original documentation' : ''}
          </div>
        </div>
        <EvidenceBadge kind="source" suffix="raw material retained" />
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]/45 mb-1">Interventions</div>
          <InlineEdit value={session.interventions} onSave={(v) => patchSession({ interventions: v })} placeholder="—" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]/45 mb-1">Client Response</div>
          <InlineEdit value={session.response} onSave={(v) => patchSession({ response: v })} placeholder="—" />
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-ink)]/45 mb-1">Plan</div>
          <InlineEdit value={session.plan} onSave={(v) => patchSession({ plan: v })} placeholder="—" />
        </div>
      </div>

      {hasImpact ? (
        <div className="rounded-lg bg-[var(--color-synthesis-tint)] px-3.5 py-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <EvidenceBadge kind="synthesis" suffix="compare with prior sessions before drawing conclusions" />
          </div>
          <div className="text-sm text-[var(--color-ink)]/75 space-y-0.5">
            {session.longitudinalImpact.confirmed.length > 0 && <div>Confirmed: {session.longitudinalImpact.confirmed.join(', ')}</div>}
            {session.longitudinalImpact.expanded.length > 0 && <div>Expanded / new: {session.longitudinalImpact.expanded.join(', ')}</div>}
          </div>
        </div>
      ) : null}

      <button
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink)]/55 hover:text-[var(--color-ink)]"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide raw session note' : 'Show raw session note'}
      </button>

      {expanded && (
        <div className="mt-3 rounded-lg border border-[var(--color-beige-deep)] bg-[var(--color-cream)] p-3.5">
          <InlineEdit value={session.rawText} onSave={(v) => patchSession({ rawText: v })} textClassName="text-sm leading-relaxed" />
        </div>
      )}
    </div>
  )
}
