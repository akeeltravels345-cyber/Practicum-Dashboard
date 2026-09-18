import { useState } from 'react'
import type { Client, Session } from '../../data/types'
import { EvidenceBadge } from '../../components/EvidenceBadge'
import { InlineEdit } from '../../components/InlineEdit'
import { useWorkspaceStore } from '../../state/store'
import { formatDate } from '../../utils/format'
import { ChevronDown, ChevronUp, AlertTriangle, Check, FileText, Pencil, Trash2, FilePlus } from 'lucide-react'
import { PasteSessionModal } from '../../components/PasteSessionModal'
import { LONGITUDINAL_BUCKETS, LONGITUDINAL_BUCKET_LABELS } from '../../data/types'

export function SessionTimelineTab({ client }: { client: Client }) {
  const sessions = [...client.sessions].sort((a, b) => b.sessionNumber - a.sessionNumber)

  if (sessions.length === 0) {
    return <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50">No sessions recorded yet. Paste a session to begin the timeline.</div>
  }

  return (
    <div className="relative space-y-4 pl-7">
      {/* the spine, stopping at the last dot rather than running past it */}
      {sessions.length > 1 && (
        <span
          aria-hidden="true"
          className="absolute left-[7px] top-3 bottom-10 w-px bg-[var(--color-beige-deep)]"
        />
      )}
      {sessions.map((s) => (
        <div key={s.id} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-7 top-6 h-[13px] w-[13px] rounded-full border-2 border-[var(--color-paper)] bg-[var(--color-sage)]"
          />
          <SessionCard client={client} session={s} />
        </div>
      ))}
    </div>
  )
}

function SessionCard({ client, session }: { client: Client; session: Session }) {
  const [expanded, setExpanded] = useState(false)
  const [editor, setEditor] = useState<null | 'edit' | 'transcript'>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const updateClient = useWorkspaceStore((s) => s.updateClient)
  const updateSession = useWorkspaceStore((s) => s.updateSession)
  const deleteSession = useWorkspaceStore((s) => s.deleteSession)

  // For the interventions / response / plan breakdown only: small corrections
  // that should not rerun the whole analysis.
  function patchSession(patch: Partial<Session>) {
    updateClient(client.id, {
      sessions: client.sessions.map((s) => (s.id === session.id ? { ...s, ...patch } : s)),
    })
  }

  // The note and the transcript ARE the evidence, so changing either goes
  // through the full edit path and is re-analysed like a new session.
  function reviseEvidence(patch: { rawText?: string; transcript?: string }) {
    updateSession(client.id, session.id, {
      date: session.date,
      duration: session.duration,
      rawText: patch.rawText ?? session.rawText,
      transcript: patch.transcript ?? session.transcript ?? '',
      interventions: session.interventions,
      response: session.response,
      plan: session.plan,
    })
  }

  const hasNote = !!session.rawText.trim()
  const hasTranscript = !!session.transcript?.trim()

  const markDiscrepancyReviewed = useWorkspaceStore((s) => s.markDiscrepancyReviewed)

  // Every populated bucket, in the fixed order the buckets are declared, so the
  // reading stays consistent from session to session.
  const impactRows = LONGITUDINAL_BUCKETS
    .map((key) => ({ key, label: LONGITUDINAL_BUCKET_LABELS[key], items: session.longitudinalImpact[key] ?? [] }))
    .filter((row) => row.items.length > 0)

  const discrepancies = session.sourceDiscrepancies ?? []
  const openDiscrepancies = discrepancies.filter((d) => !d.reviewed)
  const transcriptOnly = session.transcriptOnlyEvidence ?? []

  return (
    <div className="card p-5 sm:p-6">
      {editor && (
        <PasteSessionModal
          fixedClientId={client.id}
          editSessionId={session.id}
          focusTranscript={editor === 'transcript'}
          onClose={() => setEditor(null)}
        />
      )}
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <div className="font-serif-display text-base text-[var(--color-ink)]">
            Session {session.sessionNumber} · {formatDate(session.date)}
          </div>
          <div className="text-xs text-[var(--color-ink)]/45 mt-0.5">
            {session.duration} hour{session.duration === 1 ? '' : 's'}
            {session.isSeed ? ' · reconstructed summary, verify against original documentation' : ''}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setEditor('edit')}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--color-ink)]/55 hover:bg-[var(--color-beige)]/70 hover:text-[var(--color-ink)]"
          >
            <Pencil size={12} /> Edit
          </button>
          {!hasTranscript && (
            <button
              onClick={() => setEditor('transcript')}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium text-[var(--color-sage-deep)] hover:bg-[var(--color-sage-tint)]"
            >
              <FilePlus size={12} /> Add transcript
            </button>
          )}
          {confirmDelete ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-clay-tint)] px-2.5 py-1 text-xs text-[var(--color-clay-deep)]">
              Delete session {session.sessionNumber}?
              <button onClick={() => deleteSession(client.id, session.id)} className="font-semibold underline">
                Delete
              </button>
              <button onClick={() => setConfirmDelete(false)} className="opacity-70 hover:opacity-100">
                Keep
              </button>
            </span>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              aria-label={`Delete session ${session.sessionNumber}`}
              className="inline-flex items-center rounded-full p-1.5 text-[var(--color-ink)]/35 hover:bg-[var(--color-clay-tint)] hover:text-[var(--color-clay-deep)]"
            >
              <Trash2 size={13} />
            </button>
          )}
          <EvidenceBadge kind="source" suffix={hasNote && hasTranscript ? 'notes + transcript' : hasTranscript ? 'transcript only' : 'notes'} />
          {session.transcript ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-beige)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/60">
              <FileText size={11} /> Transcript attached
            </span>
          ) : null}
        </div>
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

      {openDiscrepancies.length > 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-3 mb-3">
          <div className="flex items-center gap-2 mb-2 text-amber-900">
            <AlertTriangle size={14} className="shrink-0" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              Note / transcript discrepancy · review recommended
            </span>
          </div>
          <div className="space-y-3">
            {openDiscrepancies.map((d) => (
              <div key={d.id} className="text-sm">
                <div className="font-medium text-[var(--color-ink)]/85">{d.topic}</div>
                <div className="mt-1 grid sm:grid-cols-2 gap-2">
                  <div className="rounded bg-white/70 px-2.5 py-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/45">Session note</div>
                    <div className="text-[13px] text-[var(--color-ink)]/75">{d.inNotes}</div>
                  </div>
                  <div className="rounded bg-white/70 px-2.5 py-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/45">Transcript</div>
                    <div className="text-[13px] text-[var(--color-ink)]/75">{d.inTranscript}</div>
                  </div>
                </div>
                <div className="mt-1 text-[13px] text-[var(--color-ink)]/60 italic">{d.note}</div>
                <button
                  onClick={() => markDiscrepancyReviewed(client.id, session.id, d.id)}
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-sage-deep)] hover:underline"
                >
                  <Check size={12} /> Mark reviewed
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {impactRows.length > 0 ? (
        <div className="rounded-lg bg-[var(--color-synthesis-tint)] px-3.5 py-3 mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <EvidenceBadge kind="synthesis" suffix="what this session does to the existing picture — verify before acting" />
          </div>
          <div className="text-sm text-[var(--color-ink)]/75 space-y-0.5">
            {impactRows.map((row) => (
              <div key={row.key}>
                <span className="font-medium">{row.label}:</span> {row.items.join(', ')}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {transcriptOnly.length > 0 ? (
        <div className="rounded-lg border border-[var(--color-beige-deep)] bg-[var(--color-beige)]/50 px-3.5 py-3 mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <EvidenceBadge kind="extracted" suffix="found in the transcript but not in the session note" />
          </div>
          <ul className="text-sm text-[var(--color-ink)]/75 space-y-0.5 list-disc pl-4">
            {transcriptOnly.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <button
        onClick={() => setExpanded((e) => !e)}
        className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink)]/55 hover:text-[var(--color-ink)]"
      >
        {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expanded ? 'Hide source material' : session.transcript ? 'Show note and transcript' : 'Show raw session note'}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="rounded-lg border border-[var(--color-beige-deep)] bg-[var(--color-cream)] p-3.5">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/45 mb-1.5">
              Session note · the clinician's documented summary
            </div>
            <InlineEdit
              value={session.rawText}
              onSave={(v) => reviseEvidence({ rawText: v })}
              placeholder="No SuperNotes for this session. Click to add them."
              textClassName="text-sm leading-relaxed"
            />
          </div>
          {session.transcript ? (
            <div className="rounded-lg border border-[var(--color-beige-deep)] bg-[var(--color-cream)] p-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/45 mb-1.5">
                Raw transcript · verbatim, what was actually said
              </div>
              <InlineEdit
                value={session.transcript}
                onSave={(v) => reviseEvidence({ transcript: v })}
                textClassName="text-sm leading-relaxed whitespace-pre-wrap"
              />
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
