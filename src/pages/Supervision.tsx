import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { useWorkspaceStore } from '../state/store'
import { Circle } from 'lucide-react'

export function Supervision() {
  const clients = useWorkspaceStore((s) => s.clients)

  return (
    <div>
      <PageHeader
        eyebrow="Clinical Thinking"
        title="Supervision"
        subtitle="Open questions across all cases — a space to think as a developing clinician, not just summarize each client."
      />

      <div className="space-y-6">
        {clients.map((c) => {
          const open = c.supervisionQuestions.filter((q) => !q.resolved)
          if (open.length === 0) return null
          return (
            <div key={c.id} className="card p-5">
              <div className="flex items-center justify-between mb-3">
                <Link to={`/clients/${c.id}?tab=supervision`} className="font-serif-display text-base text-[var(--color-ink)] hover:underline">
                  {c.label}
                </Link>
                <span className="text-xs text-[var(--color-ink)]/40">{open.length} open</span>
              </div>
              <ul className="space-y-2">
                {open.map((q) => (
                  <li key={q.id} className="flex items-start gap-2.5 text-sm text-[var(--color-ink)]/80">
                    <Circle size={14} className="mt-1 text-[var(--color-ink)]/25 shrink-0" />
                    {q.question}
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
        {clients.every((c) => c.supervisionQuestions.filter((q) => !q.resolved).length === 0) && (
          <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50">No open supervision questions.</div>
        )}
      </div>
    </div>
  )
}
