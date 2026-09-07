import { useState } from 'react'
import { v4 as uuid } from 'uuid'
import type { Client, GoalStatus, ProgressTrend, TreatmentGoal, TreatmentPlan } from '../../data/types'
import { SectionCard } from '../../components/SectionCard'
import { InlineEdit } from '../../components/InlineEdit'
import { Modal } from '../../components/Modal'
import { Field, TextArea, Select, PrimaryButton, SecondaryButton } from '../../components/Form'
import { useWorkspaceStore } from '../../state/store'
import { formatDate } from '../../utils/format'
import { History, Sparkles, Plus, X, RefreshCw, AlertTriangle } from 'lucide-react'

// The redesign showed a 10-point percentage stepper. Goals have no numeric
// progress field, and adding one would create a second source of truth beside
// `status`, so the stepper walks this ladder instead and the bar is derived.
const GOAL_LADDER: GoalStatus[] = ['not_started', 'active', 'improving', 'partially_met', 'met']

function goalProgress(status: GoalStatus): number {
  const i = GOAL_LADDER.indexOf(status)
  if (i >= 0) return Math.round((i / (GOAL_LADDER.length - 1)) * 100)
  return status === 'needs_revision' ? 35 : 20 // off-ladder states: indicative only
}

function stepGoal(status: GoalStatus, dir: 1 | -1): GoalStatus {
  const i = GOAL_LADDER.indexOf(status)
  if (i < 0) return dir === 1 ? 'active' : 'not_started'
  return GOAL_LADDER[Math.min(GOAL_LADDER.length - 1, Math.max(0, i + dir))]
}

const GOAL_STATUS_LABEL: Record<GoalStatus, string> = {
  not_started: 'Not Started',
  active: 'Active',
  improving: 'Improving',
  partially_met: 'Partially Met',
  met: 'Met',
  needs_revision: 'Needs Revision',
  on_hold: 'On Hold',
}

const GOAL_STATUS_STYLE: Record<GoalStatus, string> = {
  not_started: 'bg-[var(--color-beige-deep)] text-[var(--color-ink)]/60',
  active: 'bg-[var(--color-source-tint)] text-[var(--color-source)]',
  improving: 'bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)]',
  partially_met: 'bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)]',
  met: 'bg-[var(--color-sage-deep)]/20 text-[var(--color-sage-deep)]',
  needs_revision: 'bg-[var(--color-amber-tint)] text-[var(--color-amber-deep)]',
  on_hold: 'bg-[var(--color-beige-deep)] text-[var(--color-ink)]/60',
}

const TREND_LABEL: Record<ProgressTrend, string> = {
  improving: 'Improving',
  stable: 'Stable',
  worsening: 'Worsening',
  fluctuating: 'Fluctuating',
  insufficient_evidence: 'Insufficient Evidence',
}

const TREND_STYLE: Record<ProgressTrend, string> = {
  improving: 'bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)]',
  stable: 'bg-[var(--color-source-tint)] text-[var(--color-source)]',
  worsening: 'bg-[var(--color-clay-tint)] text-[var(--color-clay-deep)]',
  fluctuating: 'bg-[var(--color-amber-tint)] text-[var(--color-amber-deep)]',
  insufficient_evidence: 'bg-[var(--color-beige-deep)] text-[var(--color-ink)]/50',
}

function newGoal(): TreatmentGoal {
  return {
    id: uuid(),
    text: 'New goal',
    objectives: '',
    interventions: '',
    evidence: '',
    status: 'not_started',
    flaggedForReview: false,
    flagReason: '',
  }
}

export function TreatmentPlanTab({ client }: { client: Client }) {
  const updateClient = useWorkspaceStore((s) => s.updateClient)
  const updateTreatmentReview = useWorkspaceStore((s) => s.updateTreatmentReview)
  const recomputeComputedFields = useWorkspaceStore((s) => s.recomputeComputedFields)
  const [showHistory, setShowHistory] = useState(false)
  const [showRevise, setShowRevise] = useState(false)

  function patchPlan(patch: Partial<TreatmentPlan>) {
    updateClient(client.id, { treatmentPlan: { ...client.treatmentPlan, ...patch } })
  }

  function addGoal() {
    patchPlan({ goals: [...client.treatmentPlan.goals, newGoal()] })
  }

  function updateGoal(id: string, patch: Partial<TreatmentGoal>) {
    patchPlan({ goals: client.treatmentPlan.goals.map((g) => (g.id === id ? { ...g, ...patch } : g)) })
  }

  function removeGoal(id: string) {
    patchPlan({ goals: client.treatmentPlan.goals.filter((g) => g.id !== id) })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-serif-display text-lg text-[var(--color-ink)]">Adaptive Treatment Plan</h2>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={() => setShowHistory(true)}>
            <History size={14} /> Version history ({client.treatmentPlanHistory.length})
          </SecondaryButton>
          <SecondaryButton onClick={() => setShowRevise(true)}>
            <Sparkles size={14} /> Revise plan
          </SecondaryButton>
        </div>
      </div>
      <p className="text-sm text-[var(--color-ink)]/50 mb-4">
        The plan should reconsider focus as new information emerges, not simply append to it.
      </p>

      <SectionCard title="Presenting / Treatment Focus">
        <InlineEdit value={client.treatmentPlan.presentingFocus} onSave={(v) => patchPlan({ presentingFocus: v })} />
      </SectionCard>

      <SectionCard title="Working Clinical Rationale" evidence="hypothesis">
        <InlineEdit value={client.treatmentPlan.rationale} onSave={(v) => patchPlan({ rationale: v })} />
      </SectionCard>

      <SectionCard
        title="Treatment Goals"
        actions={
          <button onClick={addGoal} className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-sage-deep)] hover:underline">
            <Plus size={13} /> Add goal
          </button>
        }
      >
        {client.treatmentPlan.goals.length === 0 ? (
          <p className="text-sm text-[var(--color-ink)]/40 italic">No goals defined yet.</p>
        ) : (
          <div className="space-y-4">
            {client.treatmentPlan.goals.map((g) => (
              <div key={g.id} className={`rounded-xl border p-3.5 ${g.flaggedForReview ? 'border-[var(--color-amber-deep)]/40 bg-[var(--color-amber-tint)]/30' : 'border-[var(--color-beige-deep)]'}`}>
                <div className="flex items-start gap-2 mb-2">
                  <Select
                    value={g.status}
                    onChange={(e) => updateGoal(g.id, { status: e.target.value as GoalStatus })}
                    className="w-36 shrink-0 py-1.5 text-xs"
                  >
                    {(Object.keys(GOAL_STATUS_LABEL) as GoalStatus[]).map((s) => (
                      <option key={s} value={s}>
                        {GOAL_STATUS_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                  <div className="flex-1">
                    <InlineEdit value={g.text} onSave={(v) => updateGoal(g.id, { text: v })} multiline={false} textClassName="font-medium" />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      aria-label="Step goal back"
                      onClick={() => updateGoal(g.id, { status: stepGoal(g.status, -1) })}
                      className="grid h-6 w-6 place-items-center rounded-full border border-[var(--color-beige-deep)] text-[var(--color-ink)]/55 hover:text-[var(--color-ink)] hover:bg-[var(--color-beige)]/60"
                    >
                      &minus;
                    </button>
                    <span className="w-9 text-right text-xs tabular-nums text-[var(--color-ink)]/55">{goalProgress(g.status)}%</span>
                    <button
                      type="button"
                      aria-label="Step goal forward"
                      onClick={() => updateGoal(g.id, { status: stepGoal(g.status, 1) })}
                      className="grid h-6 w-6 place-items-center rounded-full border border-[var(--color-beige-deep)] text-[var(--color-ink)]/55 hover:text-[var(--color-ink)] hover:bg-[var(--color-beige)]/60"
                    >
                      +
                    </button>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold shrink-0 ${GOAL_STATUS_STYLE[g.status]}`}>
                    {GOAL_STATUS_LABEL[g.status]}
                  </span>
                  <button onClick={() => removeGoal(g.id)} className="p-1.5 text-[var(--color-ink)]/30 hover:text-[var(--color-clay)] shrink-0">
                    <X size={14} />
                  </button>
                </div>

                {g.flaggedForReview && (
                  <div className="flex items-start gap-2 mb-2.5 rounded-lg bg-[var(--color-amber-tint)] px-3 py-2 text-xs text-[var(--color-amber-deep)]">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <span>Flagged for review — {g.flagReason}</span>
                  </div>
                )}

                <div className="grid sm:grid-cols-3 gap-3">
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40 mb-0.5">Objectives</div>
                    <InlineEdit value={g.objectives} onSave={(v) => updateGoal(g.id, { objectives: v })} placeholder="—" textClassName="text-sm" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40 mb-0.5">Interventions</div>
                    <InlineEdit value={g.interventions} onSave={(v) => updateGoal(g.id, { interventions: v })} placeholder="—" textClassName="text-sm" />
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40 mb-0.5">Evidence</div>
                    <InlineEdit value={g.evidence} onSave={(v) => updateGoal(g.id, { evidence: v })} placeholder="—" textClassName="text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Intervention Strategy">
        <InlineEdit value={client.treatmentPlan.interventionStrategy} onSave={(v) => patchPlan({ interventionStrategy: v })} />
      </SectionCard>

      <SectionCard title="Current Plan / Next Steps">
        <InlineEdit value={client.treatmentPlan.currentPlan} onSave={(v) => patchPlan({ currentPlan: v })} />
      </SectionCard>

      <SectionCard title="Next Clinical Focus" evidence="hypothesis">
        <InlineEdit value={client.treatmentPlan.nextClinicalFocus} onSave={(v) => patchPlan({ nextClinicalFocus: v })} placeholder="Not yet determined." />
      </SectionCard>

      <div className="h-px bg-[var(--color-beige-deep)] my-8" />

      <div className="flex items-center justify-between mb-1">
        <h2 className="font-serif-display text-lg text-[var(--color-ink)]">Treatment Progress</h2>
        <SecondaryButton onClick={() => recomputeComputedFields(client.id)}>
          <RefreshCw size={14} /> Recompute from session notes
        </SecondaryButton>
      </div>
      <p className="text-sm text-[var(--color-ink)]/50 mb-4">What is changing over time? Tracked across domains and compared against earlier sessions — not a per-session summary.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
        {client.treatmentReview.domains.map((d) => (
          <div key={d.domain} className="card p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1.5">
              <span className="text-sm font-medium text-[var(--color-ink)]/80">{d.domain}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold shrink-0 ${TREND_STYLE[d.trend]}`}>{TREND_LABEL[d.trend]}</span>
            </div>
            <p className="text-xs text-[var(--color-ink)]/55">{d.narrative}</p>
          </div>
        ))}
      </div>

      <h3 className="font-serif-display text-base text-[var(--color-ink)] mb-1">Overall Summary</h3>
      <p className="text-sm text-[var(--color-ink)]/50 mb-3">Does the current treatment plan still fit the current formulation? If not, what should change and why?</p>

      <div className="grid sm:grid-cols-2 gap-4">
        <SectionCard title="What is changing?">
          <InlineEdit value={client.treatmentReview.whatIsChanging} onSave={(v) => updateTreatmentReview(client.id, { whatIsChanging: v })} />
        </SectionCard>
        <SectionCard title="Response to Intervention">
          <InlineEdit value={client.treatmentReview.responseToIntervention} onSave={(v) => updateTreatmentReview(client.id, { responseToIntervention: v })} />
        </SectionCard>
        <SectionCard title="Progress Toward Goals">
          <InlineEdit value={client.treatmentReview.progressToward} onSave={(v) => updateTreatmentReview(client.id, { progressToward: v })} />
        </SectionCard>
        <SectionCard title="Plan Fit">
          <InlineEdit value={client.treatmentReview.planFit} onSave={(v) => updateTreatmentReview(client.id, { planFit: v })} />
        </SectionCard>
      </div>
      <SectionCard title="Emerging Clinical Priorities" evidence="hypothesis">
        <InlineEdit value={client.treatmentReview.emergingPriorities} onSave={(v) => updateTreatmentReview(client.id, { emergingPriorities: v })} />
      </SectionCard>
      <p className="text-xs text-[var(--color-ink)]/40 mb-2">Last updated {formatDate(client.treatmentReview.lastUpdated)}</p>

      {showHistory && <TreatmentPlanHistoryModal client={client} onClose={() => setShowHistory(false)} />}
      {showRevise && <ReviseTreatmentPlanModal client={client} onClose={() => setShowRevise(false)} />}
    </div>
  )
}

function TreatmentPlanHistoryModal({ client, onClose }: { client: Client; onClose: () => void }) {
  return (
    <Modal title="Treatment Plan Version History" subtitle="Prior plans are preserved, never overwritten." onClose={onClose} wide>
      {client.treatmentPlanHistory.length === 0 ? (
        <p className="text-sm text-[var(--color-ink)]/50">No versioned revisions yet.</p>
      ) : (
        <div className="space-y-4">
          {[...client.treatmentPlanHistory].reverse().map((v) => (
            <div key={v.version} className="rounded-xl border border-[var(--color-beige-deep)] p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif-display text-base">Version {v.version}</span>
                <span className="text-xs text-[var(--color-ink)]/45">{formatDate(v.date)}</span>
              </div>
              <div className="text-sm mb-2">
                <span className="font-medium text-[var(--color-ink)]/70">Reason for change: </span>
                {v.reasonForChange}
              </div>
              <div className="text-sm mb-2">
                <span className="font-medium text-[var(--color-ink)]/70">New evidence: </span>
                {v.newEvidence}
              </div>
              <div className="rounded-lg bg-[var(--color-beige)] p-3 text-sm text-[var(--color-ink)]/70">
                <span className="font-medium">Previous focus: </span>
                {v.previous.presentingFocus || '(none)'}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function ReviseTreatmentPlanModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const applyTreatmentPlanDraft = useWorkspaceStore((s) => s.applyTreatmentPlanDraft)
  const [draft, setDraft] = useState<TreatmentPlan>(client.treatmentPlan)
  const [newEvidence, setNewEvidence] = useState('')
  const [reasonForChange, setReasonForChange] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reasonForChange.trim()) return
    applyTreatmentPlanDraft(client.id, draft, reasonForChange, newEvidence)
    onClose()
  }

  return (
    <Modal title="Revise treatment plan" subtitle="Reconsider the plan rather than simply appending to it. The prior plan is preserved." onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <Field label="Presenting / Treatment Focus">
          <TextArea value={draft.presentingFocus} onChange={(e) => setDraft({ ...draft, presentingFocus: e.target.value })} className="min-h-[60px]" />
        </Field>
        <Field label="Working Clinical Rationale">
          <TextArea value={draft.rationale} onChange={(e) => setDraft({ ...draft, rationale: e.target.value })} className="min-h-[70px]" />
        </Field>
        <Field label="Intervention Strategy">
          <TextArea value={draft.interventionStrategy} onChange={(e) => setDraft({ ...draft, interventionStrategy: e.target.value })} className="min-h-[60px]" />
        </Field>
        <Field label="Current Plan / Next Steps">
          <TextArea value={draft.currentPlan} onChange={(e) => setDraft({ ...draft, currentPlan: e.target.value })} className="min-h-[60px]" />
        </Field>
        <Field label="Next Clinical Focus">
          <TextArea value={draft.nextClinicalFocus} onChange={(e) => setDraft({ ...draft, nextClinicalFocus: e.target.value })} className="min-h-[50px]" />
        </Field>
        <Field label="New evidence prompting this revision" hint="Required">
          <TextArea value={newEvidence} onChange={(e) => setNewEvidence(e.target.value)} className="min-h-[60px]" required />
        </Field>
        <Field label="Reason for change">
          <TextArea value={reasonForChange} onChange={(e) => setReasonForChange(e.target.value)} className="min-h-[60px]" required />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Save as new version</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
