import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Pencil, Plus } from 'lucide-react'
import { useWorkspaceStore } from '../state/store'
import { StatusBadge } from '../components/Chips'
import { SecondaryButton, PrimaryButton, TextInput, TextArea, Select, Field } from '../components/Form'
import { Modal } from '../components/Modal'
import { PasteSessionModal } from '../components/PasteSessionModal'
import { timeAgo } from '../utils/format'
import type { ClientStatus } from '../data/types'

import { CaseHubTab } from './client/CaseHubTab'
import { SessionTimelineTab } from './client/SessionTimelineTab'
import { CaseConceptualizationTab } from './client/CaseConceptualizationTab'
import { CasePresentationTab } from './client/CasePresentationTab'
import { TreatmentPlanTab } from './client/TreatmentPlanTab'
import { SupervisionTab } from './client/SupervisionTab'
import { ClinicalLearningTab } from './client/ClinicalLearningTab'

// The redesign proposed four tabs. Conceptualization, Case Presentation and
// Clinical Learning were not in that set, but dropping them would make real work
// unreachable, so they are kept and grouped after a divider instead: the four
// everyday tabs lead, the deeper documents follow.
const PRIMARY_TABS = ['hub', 'timeline', 'treatment', 'supervision']

const TABS = [
  { key: 'hub', label: 'Overview' },
  { key: 'timeline', label: 'Sessions' },
  { key: 'treatment', label: 'Treatment Plan' },
  { key: 'supervision', label: 'Supervision' },
  { key: 'conceptualization', label: 'Conceptualization' },
  { key: 'presentation', label: 'Case Presentation' },
  { key: 'learning', label: 'Clinical Learning' },
] as const

export function ClientDetail() {
  const { id } = useParams<{ id: string }>()
  const client = useWorkspaceStore((s) => s.clients.find((c) => c.id === id))
  const [searchParams, setSearchParams] = useSearchParams()
  const [showEdit, setShowEdit] = useState(false)
  const [showPasteSession, setShowPasteSession] = useState(false)
  const navigate = useNavigate()

  const activeTab = (searchParams.get('tab') as (typeof TABS)[number]['key']) ?? 'hub'

  if (!client) {
    return (
      <div className="card p-8 text-center">
        <p className="text-[var(--color-ink)]/60 mb-3">Client not found.</p>
        <Link to="/clients" className="text-sm font-medium text-[var(--color-sage-deep)] hover:underline">
          ← All clients
        </Link>
      </div>
    )
  }

  return (
    <div>
      <button
        onClick={() => navigate('/clients')}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--color-ink)]/60 hover:text-[var(--color-ink)] mb-4"
      >
        <ArrowLeft size={14} /> All clients
      </button>

      <div className="card p-5 sm:p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap mb-1.5">
              <h1 className="font-serif-display text-2xl text-[var(--color-ink)]">{client.label}</h1>
              <StatusBadge status={client.status} />
            </div>
            <div className="text-sm text-[var(--color-ink)]/60">
              {client.age ? `Age ${client.age} · ` : ''}
              {client.diagnosis || 'No diagnosis recorded'} · {client.sessions.length} session
              {client.sessions.length === 1 ? '' : 's'} · updated {timeAgo(client.updatedAt)}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <SecondaryButton onClick={() => setShowEdit(true)}>
              <Pencil size={14} /> Edit profile
            </SecondaryButton>
            <PrimaryButton onClick={() => setShowPasteSession(true)}>
              <Plus size={14} /> Paste session
            </PrimaryButton>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-7 -mx-1 overflow-x-auto">
        <div className="flex items-center gap-1.5 px-1 min-w-max">
          {TABS.map((t, i) => (
            <div key={t.key} className="flex items-center gap-1.5">
              {/* everyday tabs, then the deeper case documents */}
              {i > 0 && PRIMARY_TABS.includes(TABS[i - 1].key) && !PRIMARY_TABS.includes(t.key) && (
                <span className="mx-1.5 h-5 w-px bg-[var(--color-beige-deep)]" aria-hidden="true" />
              )}
              <button
                onClick={() => setSearchParams({ tab: t.key })}
                className={`rounded-full px-3.5 py-[7px] text-[13.5px] font-medium whitespace-nowrap transition-colors ${
                  activeTab === t.key
                    ? 'bg-[var(--color-sage-deep)] text-[var(--color-cream)]'
                    : 'text-[var(--color-ink)]/55 hover:bg-[var(--color-beige)]/70 hover:text-[var(--color-ink)]'
                }`}
              >
                {t.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {activeTab === 'hub' && <CaseHubTab client={client} />}
      {activeTab === 'timeline' && <SessionTimelineTab client={client} />}
      {activeTab === 'conceptualization' && <CaseConceptualizationTab client={client} />}
      {activeTab === 'presentation' && <CasePresentationTab client={client} />}
      {activeTab === 'treatment' && <TreatmentPlanTab client={client} />}
      {activeTab === 'supervision' && <SupervisionTab client={client} />}
      {activeTab === 'learning' && <ClinicalLearningTab client={client} />}

      {showEdit && <EditProfileModal clientId={client.id} onClose={() => setShowEdit(false)} />}
      {showPasteSession && <PasteSessionModal fixedClientId={client.id} onClose={() => setShowPasteSession(false)} />}
    </div>
  )
}

function EditProfileModal({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const client = useWorkspaceStore((s) => s.clients.find((c) => c.id === clientId))!
  const updateClient = useWorkspaceStore((s) => s.updateClient)

  const [label, setLabel] = useState(client.label)
  const [age, setAge] = useState(client.age)
  const [diagnosis, setDiagnosis] = useState(client.diagnosis)
  const [status, setStatus] = useState<ClientStatus>(client.status)
  const [presentingConcern, setPresentingConcern] = useState(client.presentingConcern)
  const [demographics, setDemographics] = useState(client.demographics)
  const [background, setBackground] = useState(client.background)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateClient(clientId, { label, age, diagnosis, status, presentingConcern, demographics, background })
    onClose()
  }

  return (
    <Modal title="Edit client profile" onClose={onClose} wide>
      <form onSubmit={handleSubmit}>
        <div className="grid sm:grid-cols-3 gap-x-4">
          <Field label="Client label">
            <TextInput value={label} onChange={(e) => setLabel(e.target.value)} required />
          </Field>
          <Field label="Age">
            <TextInput type="number" min="0" value={age} onChange={(e) => setAge(Number(e.target.value))} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as ClientStatus)}>
              <option value="Intake">Intake</option>
              <option value="Active">Active</option>
              <option value="On Hold">On Hold</option>
              <option value="Closed">Closed</option>
            </Select>
          </Field>
        </div>
        <Field label="Diagnosis / working diagnosis">
          <TextInput value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} />
        </Field>
        <Field label="Presenting concern">
          <TextArea value={presentingConcern} onChange={(e) => setPresentingConcern(e.target.value)} className="min-h-[70px]" />
        </Field>
        <Field label="Demographics">
          <TextArea value={demographics} onChange={(e) => setDemographics(e.target.value)} className="min-h-[60px]" />
        </Field>
        <Field label="Background">
          <TextArea value={background} onChange={(e) => setBackground(e.target.value)} className="min-h-[70px]" />
        </Field>
        <div className="flex justify-end gap-2 pt-1">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit">Save changes</PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
