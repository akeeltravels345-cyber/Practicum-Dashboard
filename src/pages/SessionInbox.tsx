import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { PrimaryButton } from '../components/Form'
import { EvidenceBadge } from '../components/EvidenceBadge'
import { PasteSessionModal } from '../components/PasteSessionModal'
import { useWorkspaceStore } from '../state/store'
import { formatDate, timeAgo } from '../utils/format'

export function SessionInbox() {
  const clients = useWorkspaceStore((s) => s.clients)
  const [showPaste, setShowPaste] = useState(false)

  const allSessions = clients
    .flatMap((c) => c.sessions.map((s) => ({ client: c, session: s })))
    .sort((a, b) => (a.session.date < b.session.date ? 1 : -1))

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Session Inbox"
        subtitle="Paste session → preserve source → analyze → compare → update. Every session preserves its raw material permanently."
        actions={
          <PrimaryButton onClick={() => setShowPaste(true)}>
            <Plus size={16} /> Paste session
          </PrimaryButton>
        }
      />

      <div className="space-y-3">
        {allSessions.length === 0 && <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50">No sessions yet.</div>}
        {allSessions.map(({ client, session }) => (
          <Link key={session.id} to={`/clients/${client.id}?tab=timeline`} className="card p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:shadow-md transition-shadow">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="font-medium text-[var(--color-ink)]">{client.label}</span>
                <span className="text-xs text-[var(--color-ink)]/40">Session {session.sessionNumber}</span>
                <EvidenceBadge kind="source" />
              </div>
              <p className="text-sm text-[var(--color-ink)]/60 line-clamp-1">{session.rawText}</p>
            </div>
            <div className="text-xs text-[var(--color-ink)]/45 shrink-0 sm:text-right">
              <div>{formatDate(session.date)}</div>
              <div>{session.duration}h · {timeAgo(session.createdAt)}</div>
            </div>
          </Link>
        ))}
      </div>

      {showPaste && <PasteSessionModal onClose={() => setShowPaste(false)} />}
    </div>
  )
}
