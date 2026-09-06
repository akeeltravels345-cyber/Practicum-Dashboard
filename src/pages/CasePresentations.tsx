import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useWorkspaceStore } from '../state/store'

export function CasePresentations() {
  const clients = useWorkspaceStore((s) => s.clients)

  return (
    <div>
      <PageHeader eyebrow="Clinical Thinking" title="Case Presentations" subtitle="Presentation material that stays connected to each living case." />

      <div className="grid sm:grid-cols-2 gap-4">
        {clients.map((c) => {
          const done = Object.values(c.casePresentation.checklist).filter(Boolean).length
          const total = Object.keys(c.casePresentation.checklist).length
          return (
            <Link key={c.id} to={`/clients/${c.id}?tab=presentation`} className="card p-5 hover:shadow-md transition-shadow block">
              <div className="flex items-center justify-between mb-2">
                <span className="font-serif-display text-base text-[var(--color-ink)]">{c.label}</span>
                <span className="text-xs font-medium text-[var(--color-ink)]/50">
                  {done}/{total} ready
                </span>
              </div>
              <p className="text-sm text-[var(--color-ink)]/70 line-clamp-2">{c.casePresentation.reasonForPresentation || 'No reason for presentation set yet.'}</p>
            </Link>
          )
        })}
        {clients.length === 0 && <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50 sm:col-span-2">No clients yet.</div>}
      </div>
    </div>
  )
}
