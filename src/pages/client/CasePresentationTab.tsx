import { useState } from 'react'
import type { CasePresentation, Client } from '../../data/types'
import { SectionCard } from '../../components/SectionCard'
import { InlineEdit } from '../../components/InlineEdit'
import { Modal } from '../../components/Modal'
import { PrimaryButton, SecondaryButton, TextArea, Field } from '../../components/Form'
import { useWorkspaceStore } from '../../state/store'
import { formatDate } from '../../utils/format'
import { History, CheckSquare, Square, RefreshCw } from 'lucide-react'

const CHECKLIST_LABELS: Record<keyof CasePresentation['checklist'], string> = {
  demographicsComplete: 'Demographics complete',
  keyFindingsIdentified: 'Key findings identified',
  backgroundEstablished: 'Relevant background established',
  formulationSupported: 'Formulation supported',
  interventionsDocumented: 'Interventions documented',
  clientResponseDocumented: 'Client response documented',
  progressDocumented: 'Progress documented',
  reasonSpecific: 'Reason for presentation specific',
  supervisionQuestionIdentified: 'Supervision question identified',
}

export function CasePresentationTab({ client }: { client: Client }) {
  const updateClient = useWorkspaceStore((s) => s.updateClient)
  const recomputeComputedFields = useWorkspaceStore((s) => s.recomputeComputedFields)
  const [showHistory, setShowHistory] = useState(false)

  function patch(p: Partial<CasePresentation>) {
    updateClient(client.id, { casePresentation: { ...client.casePresentation, ...p } })
  }

  function toggleCheck(key: keyof CasePresentation['checklist']) {
    updateClient(client.id, {
      casePresentation: {
        ...client.casePresentation,
        checklist: { ...client.casePresentation.checklist, [key]: !client.casePresentation.checklist[key] },
      },
    })
  }

  const checklistDone = Object.values(client.casePresentation.checklist).filter(Boolean).length
  const checklistTotal = Object.keys(client.casePresentation.checklist).length

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-serif-display text-lg text-[var(--color-ink)]">Case Presentation</h2>
          <div className="flex items-center gap-2">
            <SecondaryButton onClick={() => recomputeComputedFields(client.id)}>
              <RefreshCw size={14} /> Recompute
            </SecondaryButton>
            <SecondaryButton onClick={() => setShowHistory(true)}>
              <History size={14} /> History ({client.casePresentationHistory.length})
            </SecondaryButton>
          </div>
        </div>
        <p className="text-sm text-[var(--color-ink)]/50 mb-4">
          Represents the current best understanding of the client, not simply the information from the first session — stays connected to the living case.
        </p>

        <SectionCard title="Demographics">
          <p className="text-xs text-[var(--color-ink)]/40 mb-1.5">Only what has actually been documented.</p>
          <InlineEdit value={client.casePresentation.demographics} onSave={(v) => patch({ demographics: v })} />
        </SectionCard>

        <SectionCard title="Presenting Concerns" evidence="synthesis" evidenceSuffix="ranked by frequency and recency across sessions">
          {client.casePresentation.presentingConcerns.length === 0 ? (
            <p className="text-sm text-[var(--color-ink)]/40 italic">No presenting concerns identified from session notes yet.</p>
          ) : (
            <ol className="space-y-1.5">
              {client.casePresentation.presentingConcerns.map((pc) => (
                <li key={pc.concern} className="flex items-center gap-2.5 text-sm">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)] text-[11px] font-semibold shrink-0">
                    {pc.priority}
                  </span>
                  <span className="text-[var(--color-ink)]/80">{pc.concern}</span>
                </li>
              ))}
            </ol>
          )}
        </SectionCard>

        <SectionCard title="Key Findings" evidence="synthesis" evidenceSuffix="verify against source notes">
          <InlineEdit value={client.casePresentation.keyFindings} onSave={(v) => patch({ keyFindings: v })} />
        </SectionCard>

        <SectionCard title="Background">
          <InlineEdit value={client.casePresentation.background} onSave={(v) => patch({ background: v })} />
        </SectionCard>

        <SectionCard title="Current Clinical Picture" evidence="synthesis" evidenceSuffix="verify against source notes">
          <p className="text-xs text-[var(--color-ink)]/40 mb-1.5">Where the client currently is in treatment — updates only when a session introduces clinically significant new evidence.</p>
          <InlineEdit
            value={client.casePresentation.currentClinicalPicture}
            onSave={(v) => patch({ currentClinicalPicture: v })}
            placeholder="Not yet established — will populate once a session introduces significant new evidence."
          />
        </SectionCard>

        <SectionCard title="Formulation" evidence="synthesis" evidenceSuffix="verify against source notes">
          <InlineEdit value={client.casePresentation.formulationSummary} onSave={(v) => patch({ formulationSummary: v })} />
        </SectionCard>

        <SectionCard title="Emotional Presentation" evidence="hypothesis" evidenceSuffix="verify against source notes">
          <InlineEdit value={client.casePresentation.emotionalPresentation} onSave={(v) => patch({ emotionalPresentation: v })} />
        </SectionCard>

        <SectionCard title="Interventions & Plans">
          <InlineEdit value={client.casePresentation.interventionsAndPlans} onSave={(v) => patch({ interventionsAndPlans: v })} />
        </SectionCard>

        <SectionCard title="Reason for Presentation">
          <p className="text-xs text-[var(--color-ink)]/40 mb-1.5">Updates if the emerging case becomes clinically different from the original presentation.</p>
          <InlineEdit value={client.casePresentation.reasonForPresentation} onSave={(v) => patch({ reasonForPresentation: v })} />
        </SectionCard>
      </div>

      <div>
        <SectionCard title={`Readiness Checklist (${checklistDone}/${checklistTotal})`}>
          <ul className="space-y-2">
            {(Object.keys(CHECKLIST_LABELS) as Array<keyof CasePresentation['checklist']>).map((key) => (
              <li key={key}>
                <button onClick={() => toggleCheck(key)} className="flex items-center gap-2 text-sm text-left w-full py-1 group">
                  {client.casePresentation.checklist[key] ? (
                    <CheckSquare size={16} className="text-[var(--color-sage-deep)] shrink-0" />
                  ) : (
                    <Square size={16} className="text-[var(--color-ink)]/30 shrink-0" />
                  )}
                  <span className={client.casePresentation.checklist[key] ? 'text-[var(--color-ink)]/60 line-through decoration-[var(--color-ink)]/20' : 'text-[var(--color-ink)]/80'}>
                    {CHECKLIST_LABELS[key]}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {showHistory && <CasePresentationHistoryModal client={client} onClose={() => setShowHistory(false)} />}
    </div>
  )
}

function CasePresentationHistoryModal({ client, onClose }: { client: Client; onClose: () => void }) {
  const applyCasePresentationDraft = useWorkspaceStore((s) => s.applyCasePresentationDraft)
  const [reason, setReason] = useState('')

  function logCheckpoint(e: React.FormEvent) {
    e.preventDefault()
    if (!reason.trim()) return
    applyCasePresentationDraft(client.id, client.casePresentation, reason)
    setReason('')
  }

  return (
    <Modal title="Case Presentation History" onClose={onClose} wide>
      <form onSubmit={logCheckpoint} className="mb-5 rounded-xl border border-[var(--color-beige-deep)] p-4">
        <Field label="Log current state as a version" hint="Captures the current presentation content as a dated checkpoint.">
          <TextArea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for logging this checkpoint…" className="min-h-[60px]" />
        </Field>
        <PrimaryButton type="submit">Save checkpoint</PrimaryButton>
      </form>
      {client.casePresentationHistory.length === 0 ? (
        <p className="text-sm text-[var(--color-ink)]/50">No checkpoints logged yet.</p>
      ) : (
        <div className="space-y-3">
          {[...client.casePresentationHistory].reverse().map((v) => (
            <div key={v.version} className="rounded-xl border border-[var(--color-beige-deep)] p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-serif-display text-base">Version {v.version}</span>
                <span className="text-xs text-[var(--color-ink)]/45">{formatDate(v.date)}</span>
              </div>
              <div className="text-sm text-[var(--color-ink)]/70">{v.reasonForChange}</div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
