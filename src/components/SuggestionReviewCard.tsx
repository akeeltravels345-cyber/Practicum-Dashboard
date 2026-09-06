import { AlertTriangle, Check, Loader2, RotateCcw, ShieldAlert, Sparkles, Wrench, X } from 'lucide-react'
import type { Client, PendingSuggestion, SuggestionFieldKey } from '../data/types'
import { useWorkspaceStore } from '../state/store'
import { SecondaryButton } from './Form'
import { formatDate } from '../utils/format'

const TREND_LABEL: Record<string, string> = {
  improving: 'Improving',
  stable: 'Stable',
  worsening: 'Worsening',
  fluctuating: 'Fluctuating',
  insufficient_evidence: 'Insufficient Evidence',
}

function FieldCompare({ label, current, proposed }: { label: string; current: string; proposed: string }) {
  const changed = (current || '').trim() !== (proposed || '').trim()
  if (!changed) {
    return (
      <div className="mb-2.5">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40 mb-1">{label}</div>
        <div className="text-sm text-[var(--color-ink)]/45 italic">(unchanged)</div>
      </div>
    )
  }
  return (
    <div className="mb-3">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40 mb-1">{label}</div>
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="rounded-lg bg-[var(--color-beige)] p-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/35 mb-1">Current</div>
          <p className="text-sm text-[var(--color-ink)]/65 whitespace-pre-wrap">{current || '(empty)'}</p>
        </div>
        <div className="rounded-lg bg-[var(--color-sage-tint)] p-2.5">
          <div className="text-[9px] font-semibold uppercase tracking-wide text-[var(--color-sage-deep)]/70 mb-1">Proposed</div>
          <p className="text-sm text-[var(--color-ink)]/80 whitespace-pre-wrap">{proposed || '(empty)'}</p>
        </div>
      </div>
    </div>
  )
}

function FieldActions({
  status,
  onApprove,
  onReject,
}: {
  status: 'pending' | 'approved' | 'rejected'
  onApprove: () => void
  onReject: () => void
}) {
  if (status === 'approved') {
    return (
      <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-sage-deep)]">
        <Check size={13} /> Approved — now part of the client record
      </div>
    )
  }
  if (status === 'rejected') {
    return <div className="text-xs text-[var(--color-ink)]/45">Rejected — no change made.</div>
  }
  return (
    <div className="flex items-center gap-2">
      <SecondaryButton onClick={onApprove} className="!py-1.5 !px-3 text-xs">
        <Check size={13} /> Approve
      </SecondaryButton>
      <SecondaryButton onClick={onReject} className="!py-1.5 !px-3 text-xs">
        <X size={13} /> Reject
      </SecondaryButton>
    </div>
  )
}

function FormulationSection({ client, suggestion }: { client: Client; suggestion: PendingSuggestion }) {
  const approve = useWorkspaceStore((s) => s.approveSuggestionField)
  const reject = useWorkspaceStore((s) => s.rejectSuggestionField)
  const field = suggestion.formulation
  if (!field) return null
  return (
    <div className="rounded-xl border border-[var(--color-beige-deep)] p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-serif-display text-sm text-[var(--color-ink)]">Case Conceptualization / Formulation</h4>
        <FieldActions
          status={field.status}
          onApprove={() => approve(client.id, suggestion.id, 'formulation')}
          onReject={() => reject(client.id, suggestion.id, 'formulation')}
        />
      </div>
      <FieldCompare label="Working synthesis" current={client.formulation.workingSynthesis} proposed={field.draft.workingSynthesis} />
      <p className="text-xs text-[var(--color-ink)]/50 italic">
        Also updates the 5-P summary, pattern narratives, maintaining cycle, and theoretical frameworks to match the reasoning above — reviewable in
        full on the Case Conceptualization tab once approved.
      </p>
      {field.reasonForChange && <p className="text-xs text-[var(--color-ink)]/55 mt-2"><strong>Why:</strong> {field.reasonForChange}</p>}
    </div>
  )
}

function TreatmentPlanSection({ client, suggestion }: { client: Client; suggestion: PendingSuggestion }) {
  const approve = useWorkspaceStore((s) => s.approveSuggestionField)
  const reject = useWorkspaceStore((s) => s.rejectSuggestionField)
  const field = suggestion.treatmentPlan
  if (!field) return null
  const goalCountChanged = field.draft.goals.length !== client.treatmentPlan.goals.length
  return (
    <div className="rounded-xl border border-[var(--color-beige-deep)] p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-serif-display text-sm text-[var(--color-ink)]">Treatment Plan</h4>
        <FieldActions
          status={field.status}
          onApprove={() => approve(client.id, suggestion.id, 'treatmentPlan')}
          onReject={() => reject(client.id, suggestion.id, 'treatmentPlan')}
        />
      </div>
      <FieldCompare label="Presenting / treatment focus" current={client.treatmentPlan.presentingFocus} proposed={field.draft.presentingFocus} />
      <FieldCompare label="Working clinical rationale" current={client.treatmentPlan.rationale} proposed={field.draft.rationale} />
      <FieldCompare label="Next clinical focus" current={client.treatmentPlan.nextClinicalFocus} proposed={field.draft.nextClinicalFocus} />
      <p className="text-xs text-[var(--color-ink)]/50 italic">
        {goalCountChanged
          ? `Goal list would change (${client.treatmentPlan.goals.length} → ${field.draft.goals.length} goals) — review on the Treatment Plan tab after approving.`
          : 'Individual goal statuses/evidence may also be refreshed — review on the Treatment Plan tab after approving.'}
      </p>
      {field.reasonForChange && <p className="text-xs text-[var(--color-ink)]/55 mt-2"><strong>Why:</strong> {field.reasonForChange}</p>}
    </div>
  )
}

function CasePresentationSection({ client, suggestion }: { client: Client; suggestion: PendingSuggestion }) {
  const approve = useWorkspaceStore((s) => s.approveSuggestionField)
  const reject = useWorkspaceStore((s) => s.rejectSuggestionField)
  const field = suggestion.casePresentation
  if (!field) return null
  return (
    <div className="rounded-xl border border-[var(--color-beige-deep)] p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-serif-display text-sm text-[var(--color-ink)]">Case Presentation</h4>
        <FieldActions
          status={field.status}
          onApprove={() => approve(client.id, suggestion.id, 'casePresentation')}
          onReject={() => reject(client.id, suggestion.id, 'casePresentation')}
        />
      </div>
      <FieldCompare label="Current clinical picture" current={client.casePresentation.currentClinicalPicture} proposed={field.draft.currentClinicalPicture} />
      <FieldCompare label="Formulation summary" current={client.casePresentation.formulationSummary} proposed={field.draft.formulationSummary} />
      {field.reasonForChange && <p className="text-xs text-[var(--color-ink)]/55 mt-2"><strong>Why:</strong> {field.reasonForChange}</p>}
    </div>
  )
}

function TreatmentReviewSection({ client, suggestion }: { client: Client; suggestion: PendingSuggestion }) {
  const approve = useWorkspaceStore((s) => s.approveSuggestionField)
  const reject = useWorkspaceStore((s) => s.rejectSuggestionField)
  const field = suggestion.treatmentReview
  if (!field) return null
  const classificationChanged = client.treatmentReview.progressClassification !== field.draft.progressClassification
  return (
    <div className="rounded-xl border border-[var(--color-beige-deep)] p-4 mb-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-serif-display text-sm text-[var(--color-ink)]">Progress Review</h4>
        <FieldActions
          status={field.status}
          onApprove={() => approve(client.id, suggestion.id, 'treatmentReview')}
          onReject={() => reject(client.id, suggestion.id, 'treatmentReview')}
        />
      </div>
      {classificationChanged && (
        <p className="text-sm text-[var(--color-ink)]/70 mb-2">
          Overall classification: <span className="font-medium">{client.treatmentReview.progressClassification.replace('_', ' ')}</span> →{' '}
          <span className="font-medium text-[var(--color-sage-deep)]">{field.draft.progressClassification.replace('_', ' ')}</span>
        </p>
      )}
      <FieldCompare label="What is changing" current={client.treatmentReview.whatIsChanging} proposed={field.draft.whatIsChanging} />
      <div className="flex flex-wrap gap-1.5 mt-1">
        {field.draft.domains
          .filter((d, i) => d.trend !== client.treatmentReview.domains[i]?.trend || d.narrative !== client.treatmentReview.domains[i]?.narrative)
          .map((d) => (
            <span key={d.domain} className="rounded-full bg-[var(--color-source-tint)] px-2.5 py-1 text-[11px] text-[var(--color-source)]">
              {d.domain}: {TREND_LABEL[d.trend]}
            </span>
          ))}
      </div>
      {field.reasonForChange && <p className="text-xs text-[var(--color-ink)]/55 mt-2"><strong>Why:</strong> {field.reasonForChange}</p>}
    </div>
  )
}

export function SuggestionReviewCard({ client, suggestion }: { client: Client; suggestion: PendingSuggestion }) {
  const dismissSuggestion = useWorkspaceStore((s) => s.dismissSuggestion)
  const retrySuggestion = useWorkspaceStore((s) => s.retrySuggestion)
  const session = client.sessions.find((s) => s.id === suggestion.sessionId)

  const fieldKeys: SuggestionFieldKey[] = ['formulation', 'treatmentPlan', 'casePresentation', 'treatmentReview']
  const presentFields = fieldKeys.filter((k) => !!suggestion[k])
  const allDecided = presentFields.length > 0 && presentFields.every((k) => suggestion[k]?.status !== 'pending')

  return (
    <div className="card p-5 mb-5 border-2 border-[var(--color-sage-deep)]/25">
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Sparkles size={16} className="text-[var(--color-sage-deep)]" />
          <h3 className="font-serif-display text-base text-[var(--color-ink)]">
            Suggested updates — Session {suggestion.sessionNumber}
            {session ? ` · ${formatDate(session.date)}` : ''}
          </h3>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              suggestion.source === 'ai' ? 'bg-[var(--color-sage-deep)]/15 text-[var(--color-sage-deep)]' : 'bg-[var(--color-beige-deep)] text-[var(--color-ink)]/55'
            }`}
          >
            {suggestion.source === 'ai' ? <Sparkles size={10} /> : <Wrench size={10} />}
            {suggestion.source === 'ai' ? 'Claude analysis' : 'Rule-based (offline)'}
          </span>
        </div>
        <SecondaryButton onClick={() => dismissSuggestion(client.id, suggestion.id)} className="!py-1.5 !px-3 text-xs">
          Dismiss
        </SecondaryButton>
      </div>

      {suggestion.status === 'analyzing' && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-ink)]/60 py-3">
          <Loader2 size={14} className="animate-spin" /> Analyzing this session against the client's history…
        </div>
      )}

      {suggestion.status === 'error' && (
        <div className="rounded-lg bg-[var(--color-clay-tint)] px-3.5 py-3 text-sm text-[var(--color-clay-deep)]">
          <div className="flex items-start gap-2 mb-2">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>Analysis failed: {suggestion.error || 'Unknown error.'}</span>
          </div>
          <SecondaryButton onClick={() => retrySuggestion(client.id, suggestion.id)} className="!py-1.5 !px-3 text-xs">
            <RotateCcw size={13} /> Retry
          </SecondaryButton>
        </div>
      )}

      {suggestion.status === 'ready' && (
        <div>
          {suggestion.riskFlagged && (
            <div className="flex items-start gap-2.5 rounded-lg border border-[var(--color-clay)]/25 bg-[var(--color-clay-tint)]/60 px-3.5 py-3 text-sm text-[var(--color-clay-deep)] mb-3">
              <ShieldAlert size={15} className="mt-0.5 shrink-0" />
              <p>{suggestion.riskNote || 'Risk-related language was flagged in this session — verify and follow standard protocol.'}</p>
            </div>
          )}

          {suggestion.summary && <p className="text-sm text-[var(--color-ink)]/70 mb-2">{suggestion.summary}</p>}

          {(suggestion.changeHighlights ?? []).length > 0 && (
            <ul className="list-disc pl-5 text-sm text-[var(--color-ink)]/65 mb-3 space-y-0.5">
              {suggestion.changeHighlights!.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}

          {presentFields.length === 0 ? (
            <p className="text-xs text-[var(--color-ink)]/40 italic">No proposed changes to the formulation, treatment plan, case presentation, or progress review.</p>
          ) : (
            <div className="mt-2">
              <FormulationSection client={client} suggestion={suggestion} />
              <TreatmentPlanSection client={client} suggestion={suggestion} />
              <CasePresentationSection client={client} suggestion={suggestion} />
              <TreatmentReviewSection client={client} suggestion={suggestion} />
            </div>
          )}

          {allDecided && (
            <p className="text-xs text-[var(--color-ink)]/40 mt-1">All sections reviewed — you can dismiss this card.</p>
          )}
        </div>
      )}
    </div>
  )
}
