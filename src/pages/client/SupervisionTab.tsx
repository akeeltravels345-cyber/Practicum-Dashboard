import { useState } from 'react'
import type { Client } from '../../data/types'
import { SectionCard } from '../../components/SectionCard'
import { InlineEdit } from '../../components/InlineEdit'
import { TextInput, PrimaryButton } from '../../components/Form'
import { useWorkspaceStore } from '../../state/store'
import { CheckCircle2, Circle, Plus } from 'lucide-react'

export function SupervisionTab({ client }: { client: Client }) {
  const updateClient = useWorkspaceStore((s) => s.updateClient)
  const addSupervisionQuestion = useWorkspaceStore((s) => s.addSupervisionQuestion)
  const toggleSupervisionResolved = useWorkspaceStore((s) => s.toggleSupervisionResolved)
  const updateSupervisionNotes = useWorkspaceStore((s) => s.updateSupervisionNotes)
  const [newQuestion, setNewQuestion] = useState('')

  const open = client.supervisionQuestions.filter((q) => !q.resolved)
  const resolved = client.supervisionQuestions.filter((q) => q.resolved)

  function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!newQuestion.trim()) return
    addSupervisionQuestion(client.id, newQuestion.trim())
    setNewQuestion('')
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h2 className="font-serif-display text-lg text-[var(--color-ink)] mb-1">Supervision Thinking</h2>
        <p className="text-sm text-[var(--color-ink)]/50 mb-4">A space to think as a developing clinician — not just a client summary.</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-2">
          <SectionCard title="What I Understand">
            <InlineEdit
              value={client.formulation.workingSynthesis}
              onSave={(v) => updateClient(client.id, { formulation: { ...client.formulation, workingSynthesis: v } })}
              placeholder="Not yet articulated."
            />
          </SectionCard>
          <SectionCard title="What I May Be Missing">
            <InlineEdit
              value={client.formulation.gaps}
              onSave={(v) => updateClient(client.id, { formulation: { ...client.formulation, gaps: v } })}
              placeholder="Not yet identified."
            />
          </SectionCard>
        </div>

        <SectionCard title="Questions for Supervision">
          <form onSubmit={handleAdd} className="flex gap-2 mb-4">
            <TextInput value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} placeholder="Add a question for supervision…" className="flex-1" />
            <PrimaryButton type="submit">
              <Plus size={14} /> Add
            </PrimaryButton>
          </form>

          {open.length === 0 && resolved.length === 0 && <p className="text-sm text-[var(--color-ink)]/40 italic">No questions yet.</p>}

          {open.length > 0 && (
            <div className="space-y-3 mb-4">
              {open.map((q) => (
                <div key={q.id} className="flex items-start gap-2.5">
                  <button onClick={() => toggleSupervisionResolved(client.id, q.id)} className="mt-0.5 text-[var(--color-ink)]/30 hover:text-[var(--color-sage-deep)] shrink-0">
                    <Circle size={16} />
                  </button>
                  <div className="flex-1">
                    <p className="text-sm text-[var(--color-ink)]/85">{q.question}</p>
                    <InlineEdit
                      value={q.notes ?? ''}
                      onSave={(v) => updateSupervisionNotes(client.id, q.id, v)}
                      placeholder="Add supervision notes…"
                      textClassName="text-xs text-[var(--color-ink)]/60"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {resolved.length > 0 && (
            <details>
              <summary className="text-xs font-medium text-[var(--color-ink)]/45 cursor-pointer mb-2">Resolved ({resolved.length})</summary>
              <div className="space-y-2">
                {resolved.map((q) => (
                  <div key={q.id} className="flex items-start gap-2.5">
                    <button onClick={() => toggleSupervisionResolved(client.id, q.id)} className="mt-0.5 text-[var(--color-sage-deep)] shrink-0">
                      <CheckCircle2 size={16} />
                    </button>
                    <p className="text-sm text-[var(--color-ink)]/45 line-through decoration-[var(--color-ink)]/20">{q.question}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </SectionCard>
      </div>

      <div>
        <SectionCard title="Current Themes">
          <div className="flex flex-wrap gap-1.5">
            {client.themes.length === 0 ? (
              <p className="text-sm text-[var(--color-ink)]/40 italic">None yet.</p>
            ) : (
              client.themes.map((t) => (
                <span key={t} className="inline-flex items-center rounded-full bg-[var(--color-sage-tint)] px-3 py-1 text-xs font-medium text-[var(--color-sage-deep)]">
                  {t}
                </span>
              ))
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}
