import type { Client } from '../../data/types'
import { LONGITUDINAL_BUCKETS, LONGITUDINAL_BUCKET_LABELS } from '../../data/types'
import { SectionCard } from '../../components/SectionCard'
import { ThemeChip } from '../../components/Chips'
import { InlineEdit } from '../../components/InlineEdit'
import { SuggestionReviewCard } from '../../components/SuggestionReviewCard'
import { useWorkspaceStore } from '../../state/store'
import { draftNextSessionBriefFor } from '../../state/store'
import { formatDate } from '../../utils/format'

export function CaseHubTab({ client }: { client: Client }) {
  const updateClient = useWorkspaceStore((s) => s.updateClient)
  const firstSession = client.sessions[0]
  const lastSession = client.sessions[client.sessions.length - 1]

  // Only the buckets that actually moved, so "most recent change" reports
  // the specific direction of change rather than just "something is new".
  const recentImpact = lastSession
    ? LONGITUDINAL_BUCKETS
        .filter((k) => k !== 'confirmed')
        .map((key) => ({ key, label: LONGITUDINAL_BUCKET_LABELS[key], items: lastSession.longitudinalImpact[key] ?? [] }))
        .filter((row) => row.items.length > 0)
    : []
  const brief = draftNextSessionBriefFor(client)

  return (
    <div>
      {client.pendingSuggestions.length > 0 && (
        <div className="mb-2">
          {client.pendingSuggestions.map((s) => (
            <SuggestionReviewCard key={s.id} client={client} suggestion={s} />
          ))}
        </div>
      )}
      <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SectionCard title="Presenting Concern">
          <InlineEdit
            value={client.presentingConcern}
            onSave={(v) => updateClient(client.id, { presentingConcern: v })}
            label="presenting concern"
          />
        </SectionCard>

        <SectionCard title="Current Clinical Synthesis" evidence="synthesis" evidenceSuffix="verify against source notes">
          <InlineEdit
            value={client.formulation.workingSynthesis}
            onSave={(v) => updateClient(client.id, { formulation: { ...client.formulation, workingSynthesis: v } })}
            label="working synthesis"
            placeholder="No synthesis established yet — add one, or paste a session to generate a draft."
          />
        </SectionCard>

        {lastSession && (
          <SectionCard title="Most Recent Change">
            <p className="text-sm text-[var(--color-ink)]/45 mb-2">
              Session {lastSession.sessionNumber} · {formatDate(lastSession.date)}
            </p>
            {recentImpact.length > 0 ? (
              <div className="text-sm text-[var(--color-ink)]/80 space-y-1">
                {recentImpact.map((row) => (
                  <div key={row.key}>
                    <span className="font-medium">{row.label}:</span> {row.items.join(', ')}
                  </div>
                ))}
                <p className="text-[var(--color-ink)]/60 pt-1">
                  The working synthesis above was drafted to reflect this — verify before relying on it.
                </p>
              </div>
            ) : (
              <p className="text-sm text-[var(--color-ink)]/80">
                This session appears consistent with previously identified themes
                {lastSession.longitudinalImpact.confirmed.length > 0 ? ` (${lastSession.longitudinalImpact.confirmed.join(', ')})` : ''}. No
                change to the formulation, treatment plan, or case presentation is warranted on this evidence.
              </p>
            )}
          </SectionCard>
        )}

        <SectionCard title="Next Session Brief" evidence="hypothesis" evidenceSuffix="clinical judgment should confirm priority">
          <p className="text-sm text-[var(--color-ink)]/80">{brief}</p>
        </SectionCard>
      </div>

      <div>
        <SectionCard title="At a Glance">
          <dl className="text-sm space-y-2.5">
            <div className="flex justify-between">
              <dt className="text-[var(--color-ink)]/50">First session</dt>
              <dd className="text-[var(--color-ink)]/85 font-medium">{firstSession ? formatDate(firstSession.date) : '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-ink)]/50">Number of sessions</dt>
              <dd className="text-[var(--color-ink)]/85 font-medium">{client.sessions.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--color-ink)]/50">Diagnosis</dt>
              <dd className="text-[var(--color-ink)]/85 font-medium">{client.diagnosis || '—'}</dd>
            </div>
          </dl>
        </SectionCard>

        <SectionCard title="Current Themes">
          {client.themes.length === 0 ? (
            <p className="text-sm text-[var(--color-ink)]/40 italic">No themes identified yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {client.themes.map((t) => (
                <ThemeChip key={t} label={t} />
              ))}
            </div>
          )}
        </SectionCard>
      </div>
      </div>
    </div>
  )
}
