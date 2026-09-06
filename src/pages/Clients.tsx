import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/Chips'
import { PrimaryButton } from '../components/Form'
import { NewClientModal } from '../components/NewClientModal'
import { useWorkspaceStore } from '../state/store'

export function Clients() {
  const clients = useWorkspaceStore((s) => s.clients)
  const [showNew, setShowNew] = useState(false)

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Clients"
        subtitle="Every client appears only by anonymous label. Click a client to open their longitudinal case hub."
        actions={
          <PrimaryButton onClick={() => setShowNew(true)}>
            <Plus size={16} /> New client
          </PrimaryButton>
        }
      />

      {/* Desktop table */}
      <div className="hidden sm:block card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-beige-deep)] text-left text-xs uppercase tracking-wide text-[var(--color-ink)]/45">
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Age</th>
              <th className="px-5 py-3 font-medium">Diagnosis</th>
              <th className="px-5 py-3 font-medium">Presenting Concern</th>
              <th className="px-5 py-3 font-medium">Sessions</th>
              <th className="px-5 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-[var(--color-beige-deep)] last:border-0 hover:bg-[var(--color-beige)]/40 transition-colors">
                <td className="px-5 py-3.5">
                  <Link to={`/clients/${c.id}`} className="font-medium text-[var(--color-ink)] hover:underline">
                    {c.label}
                  </Link>
                </td>
                <td className="px-5 py-3.5 text-[var(--color-ink)]/70">{c.age || '—'}</td>
                <td className="px-5 py-3.5 text-[var(--color-ink)]/70">{c.diagnosis || '—'}</td>
                <td className="px-5 py-3.5 text-[var(--color-ink)]/70 max-w-xs truncate">{c.presentingConcern || '—'}</td>
                <td className="px-5 py-3.5 text-[var(--color-ink)]/70">{c.sessions.length}</td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={c.status} />
                    {c.pendingSuggestions.length > 0 && (
                      <span className="inline-flex items-center rounded-full bg-[var(--color-amber-tint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-amber-deep)]">
                        {c.pendingSuggestions.length} to review
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 && <div className="px-5 py-8 text-sm text-[var(--color-ink)]/50">No clients yet.</div>}
      </div>

      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {clients.map((c) => (
          <Link key={c.id} to={`/clients/${c.id}`} className="card p-4 block">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-medium text-[var(--color-ink)]">{c.label}</span>
              <div className="flex items-center gap-1.5">
                <StatusBadge status={c.status} />
                {c.pendingSuggestions.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-[var(--color-amber-tint)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-amber-deep)]">
                    {c.pendingSuggestions.length} to review
                  </span>
                )}
              </div>
            </div>
            <div className="text-xs text-[var(--color-ink)]/50 mb-1.5">
              {c.age ? `Age ${c.age} · ` : ''}
              {c.diagnosis || 'No diagnosis recorded'}
            </div>
            <p className="text-sm text-[var(--color-ink)]/70 line-clamp-2 mb-1.5">{c.presentingConcern}</p>
            <div className="text-xs text-[var(--color-ink)]/45">{c.sessions.length} session{c.sessions.length === 1 ? '' : 's'}</div>
          </Link>
        ))}
        {clients.length === 0 && <div className="card p-6 text-sm text-[var(--color-ink)]/50">No clients yet.</div>}
      </div>

      {showNew && <NewClientModal onClose={() => setShowNew(false)} />}
    </div>
  )
}
