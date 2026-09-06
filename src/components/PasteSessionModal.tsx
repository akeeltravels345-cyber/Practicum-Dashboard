import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Sparkles, RefreshCw } from 'lucide-react'
import { Modal } from './Modal'
import { Field, TextInput, TextArea, Select, PrimaryButton, SecondaryButton } from './Form'
import { useWorkspaceStore } from '../state/store'
import { EvidenceBadge } from './EvidenceBadge'
import { scanForPossiblePii, summarizePhiMatches } from '../utils/phi'
import { splitSessionNote } from '../clinical/engine'

const DURATION_OPTIONS = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0]

export function PasteSessionModal({ fixedClientId, onClose }: { fixedClientId?: string; onClose: () => void }) {
  const clients = useWorkspaceStore((s) => s.clients)
  const addSession = useWorkspaceStore((s) => s.addSession)
  const navigate = useNavigate()

  const aiSettings = useWorkspaceStore((s) => s.aiSettings)
  const [clientId, setClientId] = useState(fixedClientId ?? clients[0]?.id ?? '')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [duration, setDuration] = useState(1.0)
  const [customDuration, setCustomDuration] = useState(false)
  const [rawText, setRawText] = useState('')
  const [interventions, setInterventions] = useState('')
  const [response, setResponse] = useState('')
  const [plan, setPlan] = useState('')
  const [confirmedDeidentified, setConfirmedDeidentified] = useState(false)

  // Tracks which of the three derived fields the clinician has hand-edited,
  // so re-running extraction as they keep pasting/typing never clobbers a
  // deliberate edit.
  const [touched, setTouched] = useState({ interventions: false, response: false, plan: false })
  const [showBreakdown, setShowBreakdown] = useState(false)

  const client = clients.find((c) => c.id === clientId)
  const aiActive = aiSettings.enabled && !!aiSettings.apiKey.trim()
  const piiMatches = scanForPossiblePii(`${rawText}\n${interventions}\n${response}\n${plan}`)
  const needsConfirmation = piiMatches.length > 0

  function applyExtraction(next: string, force = false) {
    const split = splitSessionNote(next)
    if (force || !touched.interventions) setInterventions(split.interventions)
    if (force || !touched.response) setResponse(split.response)
    if (force || !touched.plan) setPlan(split.plan)
  }

  function handleRawTextChange(next: string) {
    setRawText(next)
    applyExtraction(next)
  }

  function handleReExtract() {
    setTouched({ interventions: false, response: false, plan: false })
    applyExtraction(rawText, true)
    setShowBreakdown(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !rawText.trim()) return
    if (needsConfirmation && !confirmedDeidentified) return
    const { sessionId } = addSession(clientId, { date, duration, rawText, interventions, response, plan })
    onClose()
    if (sessionId) navigate(`/clients/${clientId}?tab=timeline`)
  }

  return (
    <Modal
      title="Paste Session"
      subtitle="Preserve source → analyze → compare → update. The raw note below is retained permanently."
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit}>
        <div className="grid sm:grid-cols-2 gap-x-4">
          <Field label="Client">
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={!!fixedClientId} required>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Session date">
            <TextInput type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </Field>
        </div>

        <Field label="Session duration (hours)" hint="Added directly to Direct Hours on save — not assumed to be 1.0.">
          {!customDuration ? (
            <div className="flex flex-wrap items-center gap-2">
              {DURATION_OPTIONS.map((d) => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDuration(d)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    duration === d
                      ? 'border-[var(--color-sage-deep)] bg-[var(--color-sage-tint)] text-[var(--color-sage-deep)] font-medium'
                      : 'border-[var(--color-beige-deep)] text-[var(--color-ink)]/70 hover:bg-[var(--color-beige)]'
                  }`}
                >
                  {d}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setCustomDuration(true)}
                className="rounded-lg border border-dashed border-[var(--color-beige-deep)] px-3 py-1.5 text-sm text-[var(--color-ink)]/60 hover:bg-[var(--color-beige)]"
              >
                Custom…
              </button>
            </div>
          ) : (
            <TextInput
              type="number"
              step="0.25"
              min="0"
              value={duration}
              onChange={(e) => setDuration(parseFloat(e.target.value) || 0)}
              autoFocus
            />
          )}
        </Field>

        <div className="mb-1.5 flex items-center gap-2">
          <EvidenceBadge kind="source" />
          <span className="text-xs text-[var(--color-ink)]/50">retained exactly as entered</span>
        </div>
        <Field
          label="Raw session note"
          hint="Paste your full note as one block — from Supanote or wherever you keep it. Interventions, client response, and plan/homework are pulled out automatically below; edit anything that needs a correction."
        >
          <TextArea
            value={rawText}
            onChange={(e) => handleRawTextChange(e.target.value)}
            placeholder="Paste or type the session note here…"
            className="min-h-[200px]"
            required
          />
        </Field>

        <div className="flex items-center justify-between mb-2">
          <button
            type="button"
            onClick={() => setShowBreakdown((v) => !v)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-sage-deep)] hover:underline"
          >
            {showBreakdown ? 'Hide' : 'Review'} auto-extracted breakdown
          </button>
          {rawText.trim() && (
            <button
              type="button"
              onClick={handleReExtract}
              className="inline-flex items-center gap-1 text-xs font-medium text-[var(--color-ink)]/50 hover:text-[var(--color-ink)]"
              title="Re-run extraction from the raw note, overwriting any manual edits below"
            >
              <RefreshCw size={12} /> Re-extract
            </button>
          )}
        </div>

        {showBreakdown && (
          <div className="rounded-xl border border-[var(--color-beige-deep)] bg-[var(--color-beige)]/40 p-3.5 mb-4">
            <div className="mb-2 flex items-center gap-2">
              <EvidenceBadge kind="hypothesis" suffix="pulled from the note above — verify and edit as needed" />
            </div>
            <div className="grid sm:grid-cols-3 gap-x-4">
              <Field label="Interventions used" hint={touched.interventions ? 'Manually edited.' : 'Auto-extracted.'}>
                <TextArea
                  value={interventions}
                  onChange={(e) => {
                    setInterventions(e.target.value)
                    setTouched((t) => ({ ...t, interventions: true }))
                  }}
                  className="min-h-[80px]"
                  placeholder="—"
                />
              </Field>
              <Field label="Client response / change" hint={touched.response ? 'Manually edited.' : 'Auto-extracted.'}>
                <TextArea
                  value={response}
                  onChange={(e) => {
                    setResponse(e.target.value)
                    setTouched((t) => ({ ...t, response: true }))
                  }}
                  className="min-h-[80px]"
                  placeholder="—"
                />
              </Field>
              <Field label="Plan / homework" hint={touched.plan ? 'Manually edited.' : 'Auto-extracted.'}>
                <TextArea
                  value={plan}
                  onChange={(e) => {
                    setPlan(e.target.value)
                    setTouched((t) => ({ ...t, plan: true }))
                  }}
                  className="min-h-[80px]"
                  placeholder="—"
                />
              </Field>
            </div>
          </div>
        )}

        {piiMatches.length > 0 && (
          <div className="rounded-lg border border-[var(--color-clay)]/30 bg-[var(--color-clay-tint)] px-3.5 py-3 mb-4">
            <div className="flex items-start gap-2 text-sm text-[var(--color-clay-deep)] mb-2">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <div>
                <p className="font-medium mb-0.5">This text may contain identifying information.</p>
                <p className="text-xs opacity-90">Flagged: {summarizePhiMatches(piiMatches)}. Review and remove any real names, contact details, or other identifiers before saving{aiActive ? ' — AI Assist is on, so this text will be sent to Anthropic\'s API' : ''}.</p>
              </div>
            </div>
            <label className="flex items-start gap-2 text-xs text-[var(--color-clay-deep)] cursor-pointer">
              <input
                type="checkbox"
                checked={confirmedDeidentified}
                onChange={(e) => setConfirmedDeidentified(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 accent-[var(--color-clay-deep)]"
              />
              <span>I've reviewed this note and confirm it's de-identified.</span>
            </label>
          </div>
        )}

        <div className="rounded-lg bg-[var(--color-beige)] px-3.5 py-3 text-xs text-[var(--color-ink)]/60 mb-4">
          <div className="flex items-start gap-2">
            <Sparkles size={14} className="mt-0.5 shrink-0 text-[var(--color-sage-deep)]" />
            <div>
              On save, this session will add <strong>{duration} direct hour{duration === 1 ? '' : 's'}</strong> to{' '}
              {client?.label ?? 'the selected client'}. Interventions, client response, and plan were pulled from your note
              automatically{aiActive ? ' — Claude will also refine this extraction and draft the clinical suggestions' : ' by a local, offline rule-based engine'}.
              Nothing is applied to the client's formulation, treatment plan, or case presentation until you review and
              approve each suggestion on the client's Case Hub.
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <SecondaryButton type="button" onClick={onClose}>
            Cancel
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={needsConfirmation && !confirmedDeidentified}>
            Save session
          </PrimaryButton>
        </div>
      </form>
    </Modal>
  )
}
