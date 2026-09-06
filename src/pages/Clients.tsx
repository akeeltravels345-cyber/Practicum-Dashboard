import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Search, AlertTriangle, X } from 'lucide-react'
import { PageHeader } from '../components/PageHeader'
import { StatusBadge } from '../components/Chips'
import { PrimaryButton, TextInput } from '../components/Form'
import { NewClientModal } from '../components/NewClientModal'
import { useWorkspaceStore } from '../state/store'
import { formatDate } from '../utils/format'
import type { Client, ClientStatus } from '../data/types'

const STATUSES: ClientStatus[] = ['Active', 'Intake', 'On Hold', 'Closed']
const STALE_DAYS = 21

type SortKey = 'attention' | 'recent' | 'label' | 'sessions'

/** Everything about a client that might need the clinician to do something. */
interface Attention {
  suggestions: number
  discrepancies: number
  supervision: number
  gaps: number
  staleDays: number | null
  total: number
}

function attentionFor(c: Client): Attention {
  const suggestions = c.pendingSuggestions.length
  const discrepancies = c.sessions.reduce(
    (n, s) => n + (s.sourceDiscrepancies ?? []).filter((d) => !d.reviewed).length,
    0,
  )
  const supervision = c.supervisionQuestions.filter((q) => !q.resolved).length
  const gaps = c.documentationGaps.filter((g) => !g.dismissed).length

  const last = c.sessions.reduce<string | null>((latest, s) => (!latest || s.date > latest ? s.date : latest), null)
  const staleDays =
    c.status === 'Active' && last ? Math.floor((Date.now() - Date.parse(last)) / (1000 * 60 * 60 * 24)) : null

  return {
    suggestions,
    discrepancies,
    supervision,
    gaps,
    staleDays,
    // Weighted, not a raw sum: an unreviewed note/transcript discrepancy or a
    // suggestion waiting on review is a decision the clinician owes the record.
    // Documentation gaps are prompts, so they nudge rather than shout.
    total: suggestions * 3 + discrepancies * 3 + supervision + gaps * 0.5,
  }
}

/** Does this client match a free-text query, including inside session notes? */
function matches(c: Client, q: string): boolean {
  if (!q) return true
  const needle = q.toLowerCase()
  const haystack = [
    c.label,
    c.diagnosis,
    c.presentingConcern,
    c.demographics,
    c.background,
    ...c.themes,
    ...c.sessions.map((s) => `${s.rawText} ${s.transcript ?? ''}`),
    ...c.supervisionQuestions.map((s) => s.question),
    c.formulation.workingSynthesis,
    c.casePresentation.formulationSummary,
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(needle)
}

export function Clients() {
  const clients = useWorkspaceStore((s) => s.clients)
  const [showNew, setShowNew] = useState(false)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<ClientStatus | 'All'>('All')
  const [sort, setSort] = useState<SortKey>('attention')

  const rows = useMemo(() => {
    const withAttention = clients.map((c) => ({ client: c, attention: attentionFor(c) }))
    const filtered = withAttention.filter(
      ({ client }) => (status === 'All' || client.status === status) && matches(client, query.trim()),
    )
    const sorted = [...filtered]
    if (sort === 'attention') sorted.sort((a, b) => b.attention.total - a.attention.total || a.client.label.localeCompare(b.client.label))
    if (sort === 'label') sorted.sort((a, b) => a.client.label.localeCompare(b.client.label))
    if (sort === 'sessions') sorted.sort((a, b) => b.client.sessions.length - a.client.sessions.length)
    if (sort === 'recent') sorted.sort((a, b) => (b.client.updatedAt ?? '').localeCompare(a.client.updatedAt ?? ''))
    return sorted
  }, [clients, query, status, sort])

  const totals = useMemo(() => {
    const all = clients.map(attentionFor)
    return {
      suggestions: all.reduce((n, a) => n + a.suggestions, 0),
      discrepancies: all.reduce((n, a) => n + a.discrepancies, 0),
      supervision: all.reduce((n, a) => n + a.supervision, 0),
      stale: all.filter((a) => a.staleDays !== null && a.staleDays >= STALE_DAYS).length,
      active: clients.filter((c) => c.status === 'Active').length,
    }
  }, [clients])

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Caseload"
        subtitle="Every client appears only by anonymous label. Sorted by what needs your attention first."
        actions={
          <PrimaryButton onClick={() => setShowNew(true)}>
            <Plus size={16} /> New client
          </PrimaryButton>
        }
      />

      {clients.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          <Stat label="Active" value={totals.active} />
          <Stat label="To review" value={totals.suggestions} tone={totals.suggestions > 0 ? 'amber' : undefined} />
          <Stat label="Discrepancies" value={totals.discrepancies} tone={totals.discrepancies > 0 ? 'amber' : undefined} />
          <Stat label="Supervision Qs" value={totals.supervision} />
          <Stat label={`No session ${STALE_DAYS}d+`} value={totals.stale} tone={totals.stale > 0 ? 'amber' : undefined} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 mb-4">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/35 pointer-events-none" />
          <TextInput
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search themes, diagnoses, formulations, session notes…"
            className="pl-9"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/35 hover:text-[var(--color-ink)]"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as ClientStatus | 'All')}
          className="rounded-lg border border-[var(--color-beige-deep)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)]/80"
        >
          <option value="All">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-[var(--color-beige-deep)] bg-[var(--color-cream)] px-3 py-2 text-sm text-[var(--color-ink)]/80"
        >
          <option value="attention">Needs attention</option>
          <option value="recent">Recently updated</option>
          <option value="sessions">Most sessions</option>
          <option value="label">Label</option>
        </select>
      </div>

      {query && (
        <p className="text-xs text-[var(--color-ink)]/45 mb-3">
          {rows.length} of {clients.length} client{clients.length === 1 ? '' : 's'} match “{query}”. Search covers session notes and
          transcripts as well as the case documents.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="card p-8 text-center text-sm text-[var(--color-ink)]/50">
          {clients.length === 0 ? 'No clients yet.' : 'No clients match those filters.'}
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(({ client: c, attention }) => (
            <Link key={c.id} to={`/clients/${c.id}`} className="card p-4 sm:p-5 block hover:border-[var(--color-ink)]/15 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-1.5 flex-wrap">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="font-serif-display text-base text-[var(--color-ink)]">{c.label}</span>
                  <StatusBadge status={c.status} />
                  {attention.staleDays !== null && attention.staleDays >= STALE_DAYS && (
                    <Flag tone="amber">No session in {attention.staleDays} days</Flag>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {attention.suggestions > 0 && <Flag tone="amber">{attention.suggestions} to review</Flag>}
                  {attention.discrepancies > 0 && (
                    <Flag tone="amber">
                      <AlertTriangle size={10} /> {attention.discrepancies} discrepanc{attention.discrepancies === 1 ? 'y' : 'ies'}
                    </Flag>
                  )}
                  {attention.supervision > 0 && <Flag>{attention.supervision} supervision</Flag>}
                  {attention.gaps > 0 && <Flag>{attention.gaps} gap{attention.gaps === 1 ? '' : 's'}</Flag>}
                </div>
              </div>

              <div className="text-xs text-[var(--color-ink)]/50 mb-1.5">
                {c.age ? `Age ${c.age} · ` : ''}
                {c.diagnosis || 'No diagnosis recorded'}
              </div>
              <p className="text-sm text-[var(--color-ink)]/70 line-clamp-2 mb-2">{c.presentingConcern || '—'}</p>

              <div className="flex items-center gap-2 flex-wrap text-xs text-[var(--color-ink)]/40">
                <span>
                  {c.sessions.length} session{c.sessions.length === 1 ? '' : 's'}
                </span>
                {c.updatedAt && <span>· updated {formatDate(c.updatedAt)}</span>}
                {c.themes.slice(0, 4).map((t) => (
                  <span key={t} className="rounded-full bg-[var(--color-beige)] px-2 py-0.5 text-[var(--color-ink)]/55">
                    {t}
                  </span>
                ))}
                {c.themes.length > 4 && <span>+{c.themes.length - 4}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}

      {showNew && <NewClientModal onClose={() => setShowNew(false)} />}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'amber' }) {
  return (
    <div className={`card px-4 py-3 ${tone === 'amber' && value > 0 ? 'border-amber-300 bg-amber-50' : ''}`}>
      <div className={`font-serif-display text-xl ${tone === 'amber' && value > 0 ? 'text-amber-900' : 'text-[var(--color-ink)]'}`}>
        {value}
      </div>
      <div className={`text-[11px] uppercase tracking-wide ${tone === 'amber' && value > 0 ? 'text-amber-900/70' : 'text-[var(--color-ink)]/45'}`}>
        {label}
      </div>
    </div>
  )
}

function Flag({ children, tone }: { children: React.ReactNode; tone?: 'amber' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
        tone === 'amber'
          ? 'bg-[var(--color-amber-tint)] text-[var(--color-amber-deep)]'
          : 'bg-[var(--color-beige)] text-[var(--color-ink)]/55'
      }`}
    >
      {children}
    </span>
  )
}
