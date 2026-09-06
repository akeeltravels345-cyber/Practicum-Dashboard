import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/Chips'
import { useWorkspaceStore } from '../state/store'

export function TreatmentPlans() {
  const clients = useWorkspaceStore((s) => s.clients)

  return (
    <div>
      <PageHeader eyebrow="Clinical Thinking" title="Treatment Plan" subtitle="Adaptive treatment plans and their reviews, across every client." />

      <div className="grid sm:grid-cols-2 gap-4">
        {clients.map((c) => (
          <Link key={c.id} to={`/clients/${c.id}?tab=treatment`} className="card p-5 hover:shadow-md transition-shadow block">
            <div className="flex items-center justify-between mb-2">
              <span className="font-serif-display text-base text-[var(--color-ink)]">{c.label}</span>
              <StatusBadge status={c.status} />
            </div>
            <div className="text-xs text-[var(--color-ink)]/45 mb-2">
              {c.treatmentPlan.goals.length} goal{c.treatmentPlan.goals.length === 1 ? '' : 's'} · v{c.treatmentPlanHistory.length + 1}
            </div>
            <p className="text-sm text-[var(--color-ink)]/70 line-clamp-2">{c.treatmentPlan.presentingFocus || 'No treatment focus set yet.'}</p>
          </Link>
        ))}
        {clients.length === 0 && <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50 sm:col-span-2">No clients yet.</div>}
      </div>
    </div>
  )
}
