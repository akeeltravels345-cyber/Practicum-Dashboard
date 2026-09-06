import { useState } from 'react'
import type { Client, ClinicalLearningEntry } from '../../data/types'
import { SectionCard } from '../../components/SectionCard'
import { InlineEdit } from '../../components/InlineEdit'
import { PrimaryButton, TextInput } from '../../components/Form'
import { useWorkspaceStore } from '../../state/store'
import { formatDate } from '../../utils/format'
import { Plus, GraduationCap } from 'lucide-react'

const FIELDS: Array<{ key: keyof Omit<ClinicalLearningEntry, 'id' | 'date' | 'fromSessionId'>; label: string; placeholder: string }> = [
  { key: 'skillPracticed', label: 'What clinical skill is this case helping me practice?', placeholder: 'e.g. Socratic questioning, pacing exploration…' },
  { key: 'facilitatedWell', label: 'Where did I facilitate well?', placeholder: '—' },
  { key: 'movedTooQuickly', label: 'Where might I have moved too quickly into advice, reassurance, or problem-solving?', placeholder: '—' },
  { key: 'genuinelyUnsure', label: 'What am I genuinely unsure about?', placeholder: '—' },
  { key: 'selfNoticing', label: 'What am I noticing in myself that may be clinically relevant?', placeholder: '—' },
  { key: 'bringToSupervision', label: 'What do I want to bring to supervision?', placeholder: '—' },
]

export function ClinicalLearningTab({ client }: { client: Client }) {
  const addClinicalLearning = useWorkspaceStore((s) => s.addClinicalLearning)
  const updateClinicalLearning = useWorkspaceStore((s) => s.updateClinicalLearning)
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))

  function handleAdd() {
    addClinicalLearning(client.id, {
      date,
      skillPracticed: '',
      facilitatedWell: '',
      movedTooQuickly: '',
      genuinelyUnsure: '',
      selfNoticing: '',
      bringToSupervision: '',
    })
  }

  const entries = [...client.clinicalLearning].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-1 flex-wrap">
        <div>
          <h2 className="font-serif-display text-lg text-[var(--color-ink)] flex items-center gap-2">
            <GraduationCap size={18} className="text-[var(--color-sage-deep)]" /> Clinical Learning
          </h2>
          <p className="text-sm text-[var(--color-ink)]/50 mt-1 max-w-xl">
            For you as a developing clinician — kept separate from the client's clinical record.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
          <PrimaryButton onClick={handleAdd}>
            <Plus size={14} /> New reflection
          </PrimaryButton>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {entries.length === 0 && <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50">No reflections logged yet.</div>}
        {entries.map((entry) => (
          <SectionCard key={entry.id} title={formatDate(entry.date)}>
            <div className="grid sm:grid-cols-2 gap-4">
              {FIELDS.map(({ key, label, placeholder }) => (
                <div key={key}>
                  <p className="text-xs text-[var(--color-ink)]/55 italic mb-1">{label}</p>
                  <InlineEdit
                    value={entry[key]}
                    onSave={(v) => updateClinicalLearning(client.id, entry.id, { [key]: v })}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
          </SectionCard>
        ))}
      </div>
    </div>
  )
}
