import { Link } from 'react-router-dom'
import { PageHeader } from '../components/PageHeader'
import { SecondaryButton } from '../components/Form'
import { useWorkspaceStore } from '../state/store'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export function DocumentationGaps() {
  const clients = useWorkspaceStore((s) => s.clients)
  const dismissDocumentationGap = useWorkspaceStore((s) => s.dismissDocumentationGap)
  const rescanDocumentationGaps = useWorkspaceStore((s) => s.rescanDocumentationGaps)

  const items = clients.flatMap((c) => c.documentationGaps.filter((g) => !g.dismissed).map((g) => ({ client: c, gap: g })))

  return (
    <div>
      <PageHeader
        eyebrow="Clinical Thinking"
        title="Documentation Gaps"
        subtitle="Automated prompts only — every item here must be manually verified before acting on it. Nothing here is a clinical fact."
        actions={
          <SecondaryButton onClick={() => clients.forEach((c) => rescanDocumentationGaps(c.id))}>
            <RefreshCw size={14} /> Rescan all
          </SecondaryButton>
        }
      />

      <div className="space-y-3">
        {items.length === 0 && <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50">No open documentation prompts.</div>}
        {items.map(({ client, gap }) => (
          <div key={gap.id} className="card p-4 flex items-start gap-3">
            <AlertTriangle size={16} className="text-[var(--color-amber-deep)] mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Link to={`/clients/${client.id}`} className="font-medium text-[var(--color-ink)] hover:underline">
                  {client.label}
                </Link>
                <span className="text-xs uppercase tracking-wide text-[var(--color-ink)]/40">{gap.category}</span>
              </div>
              <p className="text-sm text-[var(--color-ink)]/70">{gap.description}</p>
              <p className="text-[10px] uppercase tracking-wide text-[var(--color-ink)]/35 mt-1">Automated prompt only — manually verify.</p>
            </div>
            <button
              onClick={() => dismissDocumentationGap(client.id, gap.id)}
              className="text-xs font-medium text-[var(--color-ink)]/45 hover:text-[var(--color-ink)] shrink-0"
            >
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
