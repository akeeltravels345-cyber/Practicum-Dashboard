import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useWorkspaceStore } from '../state/store'
import { searchClients } from '../utils/search'

export function GlobalSearch() {
  const clients = useWorkspaceStore((s) => s.clients)
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const ref = useRef<HTMLDivElement>(null)

  const results = useMemo(() => searchClients(clients, query).slice(0, 8), [clients, query])

  return (
    <div className="relative w-full max-w-sm" ref={ref}>
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-ink)]/40" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Search clients, themes, formulation…"
          className="w-full rounded-lg border border-[var(--color-beige-deep)] bg-[var(--color-paper)] py-2 pl-9 pr-3 text-sm placeholder:text-[var(--color-ink)]/35 focus:outline-none focus:ring-2 focus:ring-[var(--color-sage)]"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute z-40 mt-1.5 w-full rounded-xl border border-[var(--color-beige-deep)] bg-[var(--color-paper)] shadow-xl overflow-hidden max-h-80 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-[var(--color-ink)]/50">No matches.</div>
          ) : (
            results.map((r, i) => (
              <button
                key={i}
                onMouseDown={() => {
                  navigate(`/clients/${r.client.id}`)
                  setOpen(false)
                  setQuery('')
                }}
                className="block w-full text-left px-4 py-2.5 hover:bg-[var(--color-beige)] border-b border-[var(--color-beige-deep)] last:border-0"
              >
                <div className="text-sm font-medium text-[var(--color-ink)]">
                  {r.client.label} <span className="text-[var(--color-ink)]/40 font-normal">· {r.matchedIn}</span>
                </div>
                <div className="text-xs text-[var(--color-ink)]/50 mt-0.5 line-clamp-1">{r.snippet}</div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
