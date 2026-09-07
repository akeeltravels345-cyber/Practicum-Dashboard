import type { PracticumHourEntry } from '../data/types'

const WEEKS = 8

function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  out.setDate(out.getDate() - ((out.getDay() + 6) % 7)) // weeks start Monday
  return out
}

/**
 * Direct and indirect hours per week, stacked, for the last eight weeks.
 *
 * Built from the dated hour entries the store already keeps, so it reflects the
 * real log rather than a separate running total that could drift from it.
 */
export function WeeklyHoursChart({ entries }: { entries: PracticumHourEntry[] }) {
  const thisWeek = startOfWeek(new Date())

  const weeks = Array.from({ length: WEEKS }, (_, i) => {
    const from = new Date(thisWeek)
    from.setDate(thisWeek.getDate() - (WEEKS - 1 - i) * 7)
    const to = new Date(from)
    to.setDate(from.getDate() + 7)

    let direct = 0
    let indirect = 0
    for (const e of entries) {
      const t = new Date(e.date)
      if (Number.isNaN(t.getTime()) || t < from || t >= to) continue
      if (e.kind === 'direct') direct += e.amount
      else indirect += e.amount
    }
    return {
      key: from.toISOString().slice(0, 10),
      label: `${from.getDate()}/${from.getMonth() + 1}`,
      direct,
      indirect,
      total: direct + indirect,
      isCurrent: i === WEEKS - 1,
    }
  })

  const peak = Math.max(1, ...weeks.map((w) => w.total))
  const logged = weeks.reduce((n, w) => n + w.total, 0)

  return (
    <section className="card p-5 sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3 flex-wrap">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]/45">Weekly log</h2>
        <div className="flex items-center gap-3.5 text-xs text-[var(--color-ink)]/45">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[var(--color-sage-deep)]" /> Direct
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm bg-[var(--color-amber)]" /> Indirect
          </span>
        </div>
      </div>

      {logged === 0 ? (
        <p className="text-sm text-[var(--color-ink)]/45 py-6 text-center">
          No hours logged in the last {WEEKS} weeks. They will appear here as you add sessions.
        </p>
      ) : (
        <>
          <div className="flex items-end gap-2 sm:gap-3" style={{ height: 132 }}>
            {weeks.map((w) => (
              <div key={w.key} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end" title={`${w.total}h that week`}>
                <span className="text-[10px] tabular-nums text-[var(--color-ink)]/40">{w.total > 0 ? w.total : ''}</span>
                <div className="flex w-full flex-col justify-end gap-0.5" style={{ height: '100%' }}>
                  {w.indirect > 0 && (
                    <div
                      className="w-full rounded-t bg-[var(--color-amber)]"
                      style={{ height: `${(w.indirect / peak) * 100}%` }}
                    />
                  )}
                  {w.direct > 0 && (
                    <div
                      className={`w-full bg-[var(--color-sage-deep)] ${w.indirect > 0 ? 'rounded-b' : 'rounded'}`}
                      style={{ height: `${(w.direct / peak) * 100}%` }}
                    />
                  )}
                  {w.total === 0 && <div className="w-full rounded bg-[var(--color-beige)]" style={{ height: 3 }} />}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-2 flex gap-2 sm:gap-3">
            {weeks.map((w) => (
              <div
                key={w.key}
                className={`flex-1 text-center text-[10px] tabular-nums ${
                  w.isCurrent ? 'font-semibold text-[var(--color-sage-deep)]' : 'text-[var(--color-ink)]/35'
                }`}
              >
                {w.label}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
