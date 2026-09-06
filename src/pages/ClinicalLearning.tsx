import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useWorkspaceStore } from '../state/store'
import { formatDate } from '../utils/format'

export function ClinicalLearning() {
  const clients = useWorkspaceStore((s) => s.clients)
  const entries = clients
    .flatMap((c) => c.clinicalLearning.map((e) => ({ client: c, entry: e })))
    .sort((a, b) => (a.entry.date < b.entry.date ? 1 : -1))

  return (
    <div>
      <PageHeader
        eyebrow="Clinical Thinking"
        title="Clinical Learning"
        subtitle="Your reflections as a developing clinician, across all cases — kept separate from client clinical records."
      />

      <div className="space-y-3">
        {entries.length === 0 && <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50">No reflections logged yet.</div>}
        {entries.map(({ client, entry }) => (
          <Link key={entry.id} to={`/clients/${client.id}?tab=learning`} className="card p-4 block hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-[var(--color-ink)]">{client.label}</span>
              <span className="text-xs text-[var(--color-ink)]/40">{formatDate(entry.date)}</span>
            </div>
            <p className="text-sm text-[var(--color-ink)]/70 line-clamp-1">{entry.skillPracticed || 'Skill not yet specified.'}</p>
            {entry.bringToSupervision && <p className="text-xs text-[var(--color-ink)]/45 mt-1 line-clamp-1">To supervision: {entry.bringToSupervision}</p>}
          </Link>
        ))}
      </div>
    </div>
  )
}
