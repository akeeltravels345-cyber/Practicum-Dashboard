import { Link } from 'react-router-dom'
import type { Client } from '../data/types'
import { classNames } from '../utils/format'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Monday of the week containing `d`, at local midnight. */
function startOfWeek(d: Date): Date {
  const out = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const shift = (out.getDay() + 6) % 7 // Sunday is 0, and our week starts Monday
  out.setDate(out.getDate() - shift)
  return out
}

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * The current week at a glance.
 *
 * Shows sessions that were actually LOGGED on each day, not scheduled ones: the
 * app tracks no appointment calendar, and inventing a "next session" would put
 * a number on the dashboard that nothing in the record supports.
 */
export function ThisWeek({ clients }: { clients: Client[] }) {
  const today = new Date()
  const todayKey = isoDay(today)
  const monday = startOfWeek(today)

  const days = DAY_LABELS.map((label, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const key = isoDay(date)

    const sessions = clients.flatMap((c) =>
      c.sessions.filter((s) => s.date.slice(0, 10) === key).map((s) => ({ client: c, session: s })),
    )
    return { label, date, key, sessions, isToday: key === todayKey, isFuture: key > todayKey }
  })

  const weekTotal = days.reduce((n, d) => n + d.sessions.length, 0)

  return (
    <section className="card p-5 sm:p-6 mb-7">
      <div className="mb-3.5 flex items-baseline justify-between gap-3">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-ink)]/45">This week</h2>
        <span className="text-xs text-[var(--color-ink)]/40">
          {weekTotal === 0 ? 'No sessions logged yet' : `${weekTotal} session${weekTotal === 1 ? '' : 's'} logged`}
        </span>
      </div>

      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((d) => (
          <div
            key={d.key}
            className={classNames(
              'rounded-xl px-1.5 py-2.5 text-center min-h-[74px] flex flex-col items-center gap-1',
              d.isToday
                ? 'bg-[var(--color-sage-tint)]'
                : d.isFuture
                  ? 'bg-[var(--color-beige)]/35'
                  : 'bg-[var(--color-beige)]/60',
            )}
          >
            <div
              className={classNames(
                'text-[10px] font-semibold uppercase tracking-[0.1em]',
                d.isToday ? 'text-[var(--color-sage-deep)]' : 'text-[var(--color-ink)]/40',
              )}
            >
              {d.label}
            </div>
            <div
              className={classNames(
                'font-serif-display text-base leading-none',
                d.isToday ? 'text-[var(--color-sage-deep)]' : 'text-[var(--color-ink)]/70',
              )}
            >
              {d.date.getDate()}
            </div>

            <div className="flex flex-col items-center gap-0.5 w-full mt-0.5">
              {d.sessions.slice(0, 2).map(({ client, session }) => (
                <Link
                  key={session.id}
                  to={`/clients/${client.id}?tab=sessions`}
                  title={`${client.label} · session ${session.sessionNumber}`}
                  className="w-full truncate rounded bg-[var(--color-paper)] px-1 py-0.5 text-[10px] font-medium text-[var(--color-ink)]/70 hover:text-[var(--color-ink)]"
                >
                  {client.label.replace(/^Client /, '')}
                </Link>
              ))}
              {d.sessions.length > 2 && (
                <span className="text-[10px] text-[var(--color-ink)]/40">+{d.sessions.length - 2}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
