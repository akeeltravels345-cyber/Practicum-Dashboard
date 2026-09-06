import { useState } from 'react'
import type { Client, Formulation, FrameworkRole } from '../../data/types'
import { SectionCard } from '../../components/SectionCard'
import { InlineEdit } from '../../components/InlineEdit'
import { EvidenceBadge } from '../../components/EvidenceBadge'
import { Modal } from '../../components/Modal'
import { Field, TextArea, PrimaryButton, SecondaryButton } from '../../components/Form'
import { useWorkspaceStore } from '../../state/store'
import { formatDate } from '../../utils/format'
import { History, RefreshCw, Sparkles } from 'lucide-react'

const FIVE_P: Array<{ key: keyof Pick<Formulation, 'presenting' | 'predisposing' | 'precipitating' | 'perpetuating' | 'protective'>; label: string; hint: string }> = [
  { key: 'presenting', label: 'Presenting', hint: 'Current symptoms and difficulties.' },
  { key: 'predisposing', label: 'Predisposing', hint: 'Vulnerability factors.' },
  { key: 'precipitating', label: 'Precipitating', hint: 'What triggered the current episode.' },
  { key: 'perpetuating', label: 'Perpetuating', hint: 'What maintains the difficulty.' },
  { key: 'protective', label: 'Protective', hint: 'Strengths and resources.' },
]

const FRAMEWORK_ROLE_LABEL: Record<FrameworkRole, string> = { primary: 'Primary', supporting: 'Supporting' }
const FRAMEWORK_ROLE_STYLE: Record<FrameworkRole, string> = {
  primary: 'bg-[var(--color-sage-deep)]/20 text-[var(--color-sage-deep)]',
  supporting: 'bg-[var(--color-beige-deep)] text-[var(--color-ink)]/60',
}

export function CaseConceptualizationTab({ client }: { client: Client }) {
  const updateClient = useWorkspaceStore((s) => s.updateClient)
  const recomputeComputedFields = useWorkspaceStore((s) => s.recomputeComputedFields)
  const [showHistory, setShowHistory] = useState(false)
  const [showRevise, setShowRevise] = useState(false)

  function patchFormulation(patch: Partial<Formulation>) {
    updateClient(client.id, { formulation: { ...client.formulation, ...patch } })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-serif-display text-lg text-[var(--color-ink)]">5-P Formulation</h2>
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={() => setShowHistory(true)}>
            <History size={14} /> Clinical Evolution ({client.formulationHistory.length})
          </SecondaryButton>
          <SecondaryButton onClick={() => setShowRevise(true)}>
            <Sparkles size={14} /> Revise formulation
          </SecondaryButton>
        </div>
      </div>
      <p className="text-sm text-[var(--color-ink)]/50 mb-4">
        This is a working hypothesis that evolves with evidence — it is not locked after the first few sessions.
        Small edits below update the working record directly; use "Revise formulation" to log an intentional, versioned reformulation.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-2">
        {FIVE_P.map(({ key, label, hint }) => (
          <SectionCard key={key} title={label}>
            <p className="text-xs text-[var(--color-ink)]/40 mb-1.5">{hint}</p>
            <InlineEdit value={client.formulation[key]} onSave={(v) => patchFormulation({ [key]: v } as Partial<Formulation>)} />
          </SectionCard>
        ))}
      </div>

      <SectionCard title="Formulation Gaps / Contradictions">
        <InlineEdit
          value={client.formulation.gaps}
          onSave={(v) => patchFormulation({ gaps: v })}
          placeholder="No gaps or contradictions noted yet."
        />
      </SectionCard>

      <div className="flex items-center justify-between mb-1 mt-6">
        <h2 className="font-serif-display text-lg text-[var(--color-ink)]">Recurring Patterns</h2>
        <SecondaryButton onClick={() => recomputeComputedFields(client.id)}>
          <RefreshCw size={14} /> Recompute from session notes
        </SecondaryButton>
      </div>
      <p className="text-sm text-[var(--color-ink)]/50 mb-4">
        Keyword-level observations aggregated across all sessions — verify against the client's own language before treating any of these as established.
      </p>

      <div className="grid sm:grid-cols-2 gap-4 mb-2">
        <SectionCard title="Cognitive Patterns" evidence="hypothesis">
          <p className="text-xs text-[var(--color-ink)]/40 mb-1.5">Automatic thoughts, cognitive distortions, core beliefs, assumptions, meaning-making.</p>
          <InlineEdit value={client.formulation.cognitivePatterns} onSave={(v) => patchFormulation({ cognitivePatterns: v })} />
        </SectionCard>
        <SectionCard title="Emotional Patterns" evidence="hypothesis">
          <p className="text-xs text-[var(--color-ink)]/40 mb-1.5">Common emotional states, triggers, regulation difficulties, avoidance, processing patterns.</p>
          <InlineEdit value={client.formulation.emotionalPatterns} onSave={(v) => patchFormulation({ emotionalPatterns: v })} />
        </SectionCard>
        <SectionCard title="Behavioral Patterns" evidence="hypothesis">
          <p className="text-xs text-[var(--color-ink)]/40 mb-1.5">Avoidance, reassurance-seeking, people-pleasing, withdrawal, overworking, and other cycles.</p>
          <InlineEdit value={client.formulation.behavioralPatterns} onSave={(v) => patchFormulation({ behavioralPatterns: v })} />
        </SectionCard>
        <SectionCard title="Relational Patterns" evidence="hypothesis">
          <p className="text-xs text-[var(--color-ink)]/40 mb-1.5">Interpersonal dynamics, attachment-related patterns, boundaries, communication, expectations.</p>
          <InlineEdit value={client.formulation.relationalPatterns} onSave={(v) => patchFormulation({ relationalPatterns: v })} />
        </SectionCard>
      </div>

      <SectionCard
        title="Maintaining Cycle"
        evidence="hypothesis"
        evidenceSuffix="revise as sessions confirm, complicate or contradict this"
        actions={
          <button
            onClick={() => recomputeComputedFields(client.id)}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-sage-deep)] hover:underline"
            title="Recompute from session notes"
          >
            <RefreshCw size={12} /> Recompute
          </button>
        }
      >
        <p className="text-xs text-[var(--color-ink)]/40 mb-2">Trigger → Thought/Interpretation → Emotion → Behavior → Consequence → Reinforcement</p>
        <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {(
            [
              ['Trigger', client.formulation.maintainingCycle.trigger, (v: string) => patchFormulation({ maintainingCycle: { ...client.formulation.maintainingCycle, trigger: v } })],
              ['Thought', client.formulation.maintainingCycle.thought, (v: string) => patchFormulation({ maintainingCycle: { ...client.formulation.maintainingCycle, thought: v } })],
              ['Emotion', client.formulation.maintainingCycle.emotion, (v: string) => patchFormulation({ maintainingCycle: { ...client.formulation.maintainingCycle, emotion: v } })],
              ['Behavior', client.formulation.maintainingCycle.behavior, (v: string) => patchFormulation({ maintainingCycle: { ...client.formulation.maintainingCycle, behavior: v } })],
              ['Consequence', client.formulation.maintainingCycle.consequence, (v: string) => patchFormulation({ maintainingCycle: { ...client.formulation.maintainingCycle, consequence: v } })],
              ['Reinforcement', client.formulation.maintainingCycle.reinforcement, (v: string) => patchFormulation({ maintainingCycle: { ...client.formulation.maintainingCycle, reinforcement: v } })],
            ] as const
          ).map(([label, value, onSave]) => (
            <div key={label} className="rounded-lg bg-[var(--color-beige)] p-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/45 mb-1">{label}</div>
              <InlineEdit value={value} onSave={onSave} textClassName="text-xs leading-snug" placeholder="—" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Alternative Formulation">
        <div className="space-y-4">
          <div>
            <p className="text-sm text-[var(--color-ink)]/60 mb-1.5 italic">What alternative explanation could account for the same behavior or symptom?</p>
            <InlineEdit
              value={client.formulation.alternativeFormulation.alternative}
              onSave={(v) => patchFormulation({ alternativeFormulation: { ...client.formulation.alternativeFormulation, alternative: v } })}
              placeholder="Not yet explored."
            />
          </div>
          <div>
            <p className="text-sm text-[var(--color-ink)]/60 mb-1.5 italic">What evidence would distinguish the alternatives?</p>
            <InlineEdit
              value={client.formulation.alternativeFormulation.distinguishingEvidence}
              onSave={(v) => patchFormulation({ alternativeFormulation: { ...client.formulation.alternativeFormulation, distinguishingEvidence: v } })}
              placeholder="Not yet identified."
            />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Theoretical Integration" evidence="hypothesis" evidenceSuffix="only frameworks supported by accumulated material appear here">
        {client.formulation.theoreticalFrameworks.length === 0 ? (
          <p className="text-sm text-[var(--color-ink)]/40 italic">No framework evidence identified from session notes yet.</p>
        ) : (
          <div className="space-y-3">
            {client.formulation.theoreticalFrameworks.map((fw) => (
              <div key={fw.framework} className="flex items-start gap-3">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold shrink-0 mt-0.5 ${FRAMEWORK_ROLE_STYLE[fw.role]}`}>
                  {FRAMEWORK_ROLE_LABEL[fw.role]}
                </span>
                <div>
                  <div className="text-sm font-medium text-[var(--color-ink)]/85">{fw.framework}</div>
                  <div className="text-xs text-[var(--color-ink)]/55">{fw.evidence}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {showHistory && <ClinicalEvolutionModal client={client} onClose={() => setShowHistory(false)} />}
      {showRevise && <ReviseFormulationModal client={client} onClose={() => setShowRevise(false)} />}
    </div>
  )
}

// "Clinical Evolution" — a visible, plain-language record of how the
// formulation has changed over time (spec §7). Reuses the same version
// history that already backs "Revise formulation," so nothing is duplicated.
function ClinicalEvolutionModal({ client, onClose }: { client: Client; onClose: () => void }) {
  return (
    <Modal title="Clinical Evolution" subtitle="How the working formulation has changed as sessions accumulated. Nothing here is overwritten — only added to." onClose={onClose} wide>
      {client.formulationHistory.length === 0 ? (
        <p className="text-sm text-[var(--color-ink)]/50">
          No significant formulation changes logged yet. The current formulation is still Version 1 — it will be preserved
          here the first time a session introduces genuinely new evidence.
        </p>
      ) : (
        <div className="space-y-5">
          {[...client.formulationHistory].reverse().map((v) => (
            <div key={v.version} className="rounded-xl border border-[var(--color-beige-deep)] p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-serif-display text-base">Version {v.version}</span>
                <span className="text-xs text-[var(--color-ink)]/45">{formatDate(v.date)}</span>
              </div>
              <div className="space-y-2.5 text-sm">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40">What We Previously Thought</div>
                  <div className="text-[var(--color-ink)]/70">{v.previous.workingSynthesis || '(no prior synthesis)'}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40">What New Information Emerged</div>
                  <div className="text-[var(--color-ink)]/70">{v.newEvidence}</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40">What This Changes</div>
                  <div className="text-[var(--color-ink)]/70">{v.reasonForChange}</div>
                </div>
                <div className="rounded-lg bg-[var(--color-synthesis-tint)] p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/40">Current Understanding</div>
                  <div className="text-[var(--color-ink)]/75">{v.currentUnderstanding}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}

function ReviseFormulationModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const applyFormulationDraft = useWorkspaceStore((s) => s.applyFormulationDraft)
  const [draft, setDraft] = useState<Formulation>(client.formulation)
  const [newEvidence, setNewEvidence] = useState('')
  const [reasonForChange, setReasonForChange] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reasonForChange.trim()) return
    applyFormulationDraft(client.id, draft, reasonForChange, newEvidence)
    onClose()
  }

  return (
    <Modal title="Revise formulation" subtitle="This logs a new, permanent version in Clinical Evolution. The prior formulation is preserved." onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="mb-2">
          <EvidenceBadge kind="hypothesis" suffix="edit the working synthesis to reflect the revised understanding" />
        </div>
        <Field label="Updated working synthesis">
          <TextArea
            value={draft.workingSynthesis}
            onChange={(e) => setDraft({ ...draft, workingSynthesis: e.target.value })}
            className="min-h-[110px]"
          />
        </Field>
        <Field label="New evidence prompting this revision" hint="Required — what did you observe that led to this change?">
          <TextArea value={newEvidence} onChange={(e) => setNewEvidence(e.target.value)} className="min-h-[70px]" required />
        </Field>
        <Field label="Reason for change">
          <TextArea value={reasonForChange} onChange={(e) => setReasonForChange(e.target.value)} className="min-h-[70px]" required />
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
