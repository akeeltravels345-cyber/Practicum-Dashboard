import { useState } from 'react'
import { Plus, Settings, Trash2, RefreshCw } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { ProgressBar } from '../components/ProgressBar'
import { PrimaryButton, SecondaryButton } from '../components/Form'
import { AddHoursModal } from '../components/AddHoursModal'
import { PracticumSettingsModal } from '../components/PracticumSettingsModal'
import { useWorkspaceStore } from '../state/store'
import { totalHours, totalAllHours, totalTarget } from '../utils/practicum'
import { formatDate } from '../utils/format'

export function Practicum() {
  const practicum = useWorkspaceStore((s) => s.practicum)
  const removeHourEntry = useWorkspaceStore((s) => s.removeHourEntry)
  const clients = useWorkspaceStore((s) => s.clients)

  const [addKind, setAddKind] = useState<'direct' | 'indirect' | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const direct = totalHours(practicum, 'direct')
  const indirect = totalHours(practicum, 'indirect')
  const total = totalAllHours(practicum)
  const target = totalTarget(practicum)
  const remaining = Math.max(0, target - total)

  const clientLabel = (id?: string) => clients.find((c) => c.id === id)?.label

  const entries = [...practicum.entries].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div>
      <PageHeader
        eyebrow="ZNKSTR"
        title="Practicum Progress"
        subtitle="Track direct and indirect hours toward your program's requirement. Session durations feed Direct Hours automatically."
        actions={
          <SecondaryButton onClick={() => setShowSettings(true)}>
            <Settings size={14} /> Settings
          </SecondaryButton>
        }
      />

      <section className="card p-5 sm:p-6 mb-6">
        <div className="font-serif-display text-2xl text-[var(--color-ink)] mb-0.5">
          {total} / {target} hours completed
        </div>
        <div className="text-sm text-[var(--color-ink)]/55 mb-4">
          {remaining} hours remaining · {practicum.settings.directTarget} direct + {practicum.settings.indirectTarget} indirect target
        </div>
        <ProgressBar value={total} max={target} height="h-3" />
      </section>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-medium text-[var(--color-ink)]/75">Direct Hours</span>
            <span className="font-serif-display text-xl text-[var(--color-ink)]">
              {direct} / {practicum.settings.directTarget}
            </span>
          </div>
          <ProgressBar value={direct} max={practicum.settings.directTarget} colorClass="bg-[var(--color-sage-deep)]" height="h-2.5" />
          <PrimaryButton className="mt-4 w-full" onClick={() => setAddKind('direct')}>
            <Plus size={15} /> Add direct
          </PrimaryButton>
        </div>
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="font-medium text-[var(--color-ink)]/75">Indirect Hours</span>
            <span className="font-serif-display text-xl text-[var(--color-ink)]">
              {indirect} / {practicum.settings.indirectTarget}
            </span>
          </div>
          <ProgressBar value={indirect} max={practicum.settings.indirectTarget} colorClass="bg-[var(--color-amber)]" height="h-2.5" />
          <PrimaryButton className="mt-4 w-full" onClick={() => setAddKind('indirect')}>
            <Plus size={15} /> Add indirect
          </PrimaryButton>
        </div>
      </div>

      <h2 className="font-serif-display text-lg text-[var(--color-ink)] mb-3">Hour Log</h2>
      <div className="card overflow-hidden">
        {entries.length === 0 ? (
          <div className="p-6 text-sm text-[var(--color-ink)]/50">No hours logged yet.</div>
        ) : (
          <div className="divide-y divide-[var(--color-beige-deep)]">
            {entries.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-[var(--color-ink)] truncate">
                    {e.label} {clientLabel(e.clientId) && e.kind === 'direct' ? '' : ''}
                  </div>
                  <div className="text-xs text-[var(--color-ink)]/45 flex items-center gap-1.5 flex-wrap">
                    <span>{formatDate(e.date)} · {e.kind === 'direct' ? 'Direct' : `Indirect${e.category ? ` · ${e.category}` : ''}`}</span>
                    {e.syncedFromRef ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-[var(--color-beige)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-ink)]/55"
                        title="Calculated from billed session durations. Refreshed on each sync — edits here are replaced."
                      >
                        <RefreshCw size={9} /> From billing
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-medium text-[var(--color-ink)]/80">{e.amount}h</span>
                  <button
                    onClick={() => removeHourEntry(e.id)}
                    className="p-1.5 text-[var(--color-ink)]/30 hover:text-[var(--color-clay)]"
                    title={e.syncedFromRef
                      ? 'Remove for now. This row is calculated from billing, so the next sync will restore it.'
                      : 'Remove this entry'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {addKind && <AddHoursModal kind={addKind} onClose={() => setAddKind(null)} />}
      {showSettings && <PracticumSettingsModal onClose={() => setShowSettings(false)} />}
    </div>
  )
}
