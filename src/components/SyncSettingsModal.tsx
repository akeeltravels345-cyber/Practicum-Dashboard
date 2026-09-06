import { useState } from 'react'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Modal } from './Modal'
import { Field, TextInput, PrimaryButton, SecondaryButton } from './Form'
import { useWorkspaceStore } from '../state/store'
import { fetchRoster, SyncError } from '../services/practicumSync'
import { formatDate } from '../utils/format'
import { DEFAULT_SYNC_ENDPOINT, DEFAULT_TOKEN_PAGE } from '../data/types'

export function SyncSettingsModal({ onClose }: { onClose: () => void }) {
  const syncSettings = useWorkspaceStore((s) => s.syncSettings)
  const updateSyncSettings = useWorkspaceStore((s) => s.updateSyncSettings)
  const applyRosterFeed = useWorkspaceStore((s) => s.applyRosterFeed)

  const [enabled, setEnabled] = useState(syncSettings.enabled)
  const [endpoint, setEndpoint] = useState(() => {
    const saved = syncSettings.endpoint.trim()
    return !saved || saved.startsWith('http://localhost') ? DEFAULT_SYNC_ENDPOINT : saved
  })
  const [token, setToken] = useState(syncSettings.token)
  const [busy, setBusy] = useState<'test' | 'sync' | null>(null)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleTest() {
    setBusy('test')
    setResult(null)
    try {
      const feed = await fetchRoster(endpoint, token)
      setResult({
        ok: true,
        message: `Connected. ${feed.clients.length} client${feed.clients.length === 1 ? '' : 's'} on the roster for ${feed.clinicianId || 'this clinician'}.`,
      })
    } catch (e) {
      setResult({ ok: false, message: e instanceof SyncError ? e.message : 'Unknown error.' })
    }
    setBusy(null)
  }

  async function handleSyncNow() {
    setBusy('sync')
    setResult(null)
    try {
      const feed = await fetchRoster(endpoint, token)
      const applied = applyRosterFeed(feed)
      updateSyncSettings({ ...syncSettings, enabled, endpoint: endpoint.trim(), token: token.trim() })
      const parts = [`${applied.added} added`, `${applied.updated} updated`, `${applied.unchanged} unchanged`]
      const cleaned = applied.staleHourRowsRemoved > 0
        ? ` Removed ${applied.staleHourRowsRemoved} stale hour row${applied.staleHourRowsRemoved === 1 ? '' : 's'} from an earlier version.`
        : ''
      setResult({
        ok: true,
        message: `Synced: ${parts.join(', ')}.${applied.addedLabels.length > 0 ? ` New: ${applied.addedLabels.join(', ')}.` : ''}${cleaned}`,
      })
    } catch (e) {
      setResult({ ok: false, message: e instanceof SyncError ? e.message : 'Unknown error.' })
    }
    setBusy(null)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateSyncSettings({ ...syncSettings, enabled, endpoint: endpoint.trim(), token: token.trim() })
    onClose()
  }

  return (
    <Modal
      title="Intake Sync settings"
      subtitle="Pulls your practicum caseload from the TIFEC billing app so you don't retype it."
      onClose={onClose}
      wide
    >
      <form onSubmit={handleSubmit}>
        <div className="rounded-lg bg-[var(--color-beige)] px-3.5 py-3 text-xs text-[var(--color-ink)]/65 mb-4 space-y-1.5">
          <p>
            The feed is de-identified by contract. It carries an opaque reference, age, sex, ICD-10 diagnosis, and session dates and
            durations. It never carries a name, date of birth, address, phone number, or insurance identifier, and this app refuses a
            feed that contains them.
          </p>
          <p>
            Because session dates are included so your hour log works, the feed is a <em>limited data set</em> rather than a fully
            de-identified one. Keep it on a machine you control.
          </p>
          <p>
            Syncing only adds new clients and fills blank fields. It never overwrites your formulation, case presentation, or any other
            writing, so it is always safe to re-run.
          </p>
          <p>
            It does <strong>not</strong> bring across practicum hours. Your clients are not billed, so the billing system has no session
            times for them — your hours come from the duration you enter on each session you paste, which is the right source anyway.
          </p>
        </div>

        <label className="flex items-center gap-2.5 mb-4 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="w-4 h-4" />
          <span className="text-sm text-[var(--color-ink)]/80">Enable intake sync</span>
        </label>

        <Field
          label="Feed URL"
          hint="The deployed billing app's roster endpoint. Only change this if you are running the billing app locally."
        >
          <TextInput
            value={endpoint}
            onChange={(e) => setEndpoint(e.target.value)}
            placeholder={DEFAULT_SYNC_ENDPOINT}
            autoComplete="off"
          />
        </Field>

        <Field
          label="Sync token"
          hint={`Sign in to the billing app, then open ${DEFAULT_TOKEN_PAGE} and copy the token. A token only works against the app it came from, so a local token will not work here.`}
        >
          <TextInput type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Paste token…" autoComplete="off" />
        </Field>

        {syncSettings.lastSyncedAt && (
          <p className="text-xs text-[var(--color-ink)]/45 mb-3">Last synced {formatDate(syncSettings.lastSyncedAt)}.</p>
        )}

        {result && (
          <div className={`flex items-start gap-2 text-sm mb-4 ${result.ok ? 'text-[var(--color-sage-deep)]' : 'text-red-700'}`}>
            {result.ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
            <span>{result.message}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          <PrimaryButton type="submit">Save</PrimaryButton>
          <SecondaryButton type="button" onClick={handleTest} disabled={busy !== null}>
            {busy === 'test' ? <Loader2 size={14} className="animate-spin" /> : null} Test connection
          </SecondaryButton>
          <SecondaryButton type="button" onClick={handleSyncNow} disabled={busy !== null}>
            {busy === 'sync' ? <Loader2 size={14} className="animate-spin" /> : null} Sync now
          </SecondaryButton>
        </div>
      </form>
    </Modal>
  )
}
