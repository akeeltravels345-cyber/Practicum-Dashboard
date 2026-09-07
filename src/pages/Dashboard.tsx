import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, FileUp, FileDown, Settings, ArrowRight, AlertTriangle, Sparkles, RefreshCw, UserPlus } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PhiBanner } from '../components/PhiBanner'
import { ProgressBar } from '../components/ProgressBar'
import { StatusBadge } from '../components/Chips'
import { PrimaryButton, SecondaryButton } from '../components/Form'
import { NewClientModal } from '../components/NewClientModal'
import { PasteSessionModal } from '../components/PasteSessionModal'
import { PracticumSettingsModal } from '../components/PracticumSettingsModal'
import { AiSettingsModal } from '../components/AiSettingsModal'
import { SyncSettingsModal } from '../components/SyncSettingsModal'
import { BackupBanner } from '../components/BackupBanner'
import { MoreMenu } from '../components/MoreMenu'
import { ThisWeek } from '../components/ThisWeek'
import { recordExport } from '../services/backup'
import { useWorkspaceStore } from '../state/store'
import { totalHours, totalTarget, totalAllHours } from '../utils/practicum'
import { downloadExport, parseImportFile } from '../services/portability'
import { timeAgo } from '../utils/format'

export function Dashboard() {
  const clients = useWorkspaceStore((s) => s.clients)
  const practicum = useWorkspaceStore((s) => s.practicum)
  const exportWorkspace = useWorkspaceStore((s) => s.exportWorkspace)
  const importWorkspace = useWorkspaceStore((s) => s.importWorkspace)

  const [showNewClient, setShowNewClient] = useState(false)
  const [showPasteSession, setShowPasteSession] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showAiSettings, setShowAiSettings] = useState(false)
  const [showSyncSettings, setShowSyncSettings] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const aiSettings = useWorkspaceStore((s) => s.aiSettings)
  const syncSettings = useWorkspaceStore((s) => s.syncSettings)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const direct = totalHours(practicum, 'direct')
  const indirect = totalHours(practicum, 'indirect')
  const total = totalAllHours(practicum)
  const target = totalTarget(practicum)
  const remaining = Math.max(0, target - total)

  const openGaps = clients.flatMap((c) => c.documentationGaps.filter((g) => !g.dismissed).map((g) => ({ ...g, client: c })))
  const activeCount = clients.filter((c) => c.status === 'Active').length
  const toReviewTotal = clients.reduce((n, c) => n + c.pendingSuggestions.length, 0)
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  function handleExport() {
    downloadExport(exportWorkspace())
    // Counts as a real off-machine backup, which is what silences the nag.
    recordExport()
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      const payload = parseImportFile(text)
      importWorkspace(payload)
      setImportError(null)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import file.')
    } finally {
      e.target.value = ''
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Case Hub"
        title={greeting}
        subtitle={`${activeCount} active client${activeCount === 1 ? '' : 's'} · ${toReviewTotal} item${toReviewTotal === 1 ? '' : 's'} to review`}
        actions={
          <>
            <PrimaryButton onClick={() => setShowPasteSession(true)}>
              <Plus size={16} /> Paste session
            </PrimaryButton>
            <SecondaryButton onClick={() => setShowNewClient(true)}>
              <UserPlus size={16} /> New client
            </SecondaryButton>
            {/* Everything that used to be its own header button still lives here. */}
            <MoreMenu
              items={[
                { label: 'Practicum settings', icon: <Settings size={15} />, onSelect: () => setShowSettings(true) },
                {
                  label: `AI Assist ${aiSettings.enabled && aiSettings.apiKey ? '(on)' : '(off)'}`,
                  icon: <Sparkles size={15} />,
                  onSelect: () => setShowAiSettings(true),
                },
                {
                  label: `Intake Sync ${syncSettings.enabled && syncSettings.token ? '(on)' : '(off)'}`,
                  icon: <RefreshCw size={15} />,
                  onSelect: () => setShowSyncSettings(true),
                },
                { label: 'Export workspace', icon: <FileDown size={15} />, onSelect: handleExport, separated: true },
                { label: 'Import workspace', icon: <FileUp size={15} />, onSelect: handleImportClick },
              ]}
            />
            <input ref={fileInputRef} type="file" accept="application/json" onChange={handleFileChange} className="hidden" />
          </>
        }
      />

      {importError && (
        <div className="mb-6 rounded-lg border border-[var(--color-clay)]/30 bg-[var(--color-clay-tint)] px-4 py-2.5 text-sm text-[var(--color-clay-deep)]">
          {importError}
        </div>
      )}

      <div className="mb-7 flex flex-col gap-2.5">
        <PhiBanner />
        <BackupBanner />
      </div>

      {/* Practicum Progress */}
      <section className="card p-5 sm:p-6 mb-7">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-sage-deep)] mb-1">
              ZNKSTR · Practicum Progress
            </div>
            {/* nowrap: this heading wrapped mid-figure at narrow widths */}
            <div className="font-serif-display text-2xl text-[var(--color-ink)] whitespace-nowrap">
              {total} / {target} hours
            </div>
            <div className="text-sm text-[var(--color-ink)]/55 mt-0.5">
              {remaining} hours remaining · {practicum.settings.directTarget} direct + {practicum.settings.indirectTarget} indirect target
            </div>
          </div>
          <Link to="/practicum" className="inline-flex items-center gap-1 text-sm font-medium text-[var(--color-sage-deep)] hover:underline shrink-0">
            View full tracker <ArrowRight size={14} />
          </Link>
        </div>
        <ProgressBar value={total} max={target} height="h-3" />

        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          <div className="card-soft p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-ink)]/70">Direct Hours</span>
              <span className="font-serif-display text-lg text-[var(--color-ink)]">
                {direct} / {practicum.settings.directTarget}
              </span>
            </div>
            <ProgressBar value={direct} max={practicum.settings.directTarget} colorClass="bg-[var(--color-sage-deep)]" />
          </div>
          <div className="card-soft p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-[var(--color-ink)]/70">Indirect Hours</span>
              <span className="font-serif-display text-lg text-[var(--color-ink)]">
                {indirect} / {practicum.settings.indirectTarget}
              </span>
            </div>
            <ProgressBar value={indirect} max={practicum.settings.indirectTarget} colorClass="bg-[var(--color-amber)]" />
          </div>
        </div>
      </section>

      <ThisWeek clients={clients} />

      <div className="grid lg:grid-cols-3 gap-7">
        <section className="lg:col-span-2">
          <h2 className="font-serif-display text-lg text-[var(--color-ink)] mb-3.5">Clients</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {clients.map((c) => (
              <Link key={c.id} to={`/clients/${c.id}`} className="card p-5 hover:shadow-md transition-shadow block">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-serif-display text-base text-[var(--color-ink)]">{c.label}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={c.status} />
                    {c.pendingSuggestions.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-amber-tint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-amber-deep)]">
                        {c.pendingSuggestions.length} to review
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-xs text-[var(--color-ink)]/50 mb-2">{c.diagnosis || 'No diagnosis recorded'}</div>
                <p className="text-sm text-[var(--color-ink)]/70 line-clamp-2 mb-3">{c.presentingConcern}</p>
                <div className="flex items-center justify-between text-xs text-[var(--color-ink)]/45">
                  <span>{c.sessions.length} session{c.sessions.length === 1 ? '' : 's'}</span>
                  <span>Updated {timeAgo(c.updatedAt)}</span>
                </div>
              </Link>
            ))}
            {clients.length === 0 && (
              <div className="card p-6 text-sm text-[var(--color-ink)]/50 sm:col-span-2">No clients yet. Add your first client to begin.</div>
            )}
          </div>
        </section>

        <section>
          <h2 className="font-serif-display text-lg text-[var(--color-ink)] mb-3.5">Needs attention</h2>
          <div className="card p-5">
            {openGaps.length === 0 ? (
              <p className="text-sm text-[var(--color-ink)]/50">No open documentation prompts.</p>
            ) : (
              <div className="space-y-3">
                {openGaps.slice(0, 5).map((g) => (
                  <Link key={g.id} to={`/clients/${g.client.id}?tab=hub`} className="flex items-start gap-2.5 group">
                    <AlertTriangle size={14} className="text-[var(--color-amber-deep)] mt-0.5 shrink-0" />
                    <div>
                      <div className="text-sm text-[var(--color-ink)]/80 group-hover:underline">
                        {g.client.label} · {g.category}
                      </div>
                      <div className="text-xs text-[var(--color-ink)]/45">{g.description}</div>
                    </div>
                  </Link>
                ))}
                <div className="text-[10px] uppercase tracking-wide text-[var(--color-ink)]/35 pt-1">Automated prompt only — manually verify.</div>
              </div>
            )}
          </div>
        </section>
      </div>

      {showNewClient && <NewClientModal onClose={() => setShowNewClient(false)} />}
      {showPasteSession && <PasteSessionModal onClose={() => setShowPasteSession(false)} />}
      {showSettings && <PracticumSettingsModal onClose={() => setShowSettings(false)} />}
      {showAiSettings && <AiSettingsModal onClose={() => setShowAiSettings(false)} />}
      {showSyncSettings && <SyncSettingsModal onClose={() => setShowSyncSettings(false)} />}
    </div>
  )
}
