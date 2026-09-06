// Client for the TIFEC billing app's de-identified practicum roster feed.
//
// The feed is a limited data set: opaque ref, age, sex, ICD-10 diagnosis, and
// session dates/durations. It never contains a name, DOB, address, phone, or
// insurance identifier, and this module rejects a payload that looks like it
// does — the dashboard has no encryption at rest, so a feed that started
// carrying PHI must fail loudly rather than quietly persist it to localStorage.

export const PRACTICUM_FEED_VERSION = 1

export interface RosterClient {
  ref: string
  ageYears: number | null
  ageCapped: boolean
  sex: 'M' | 'F' | 'U' | null
  diagnosisCodes: string[]
  diagnosisLabel: string
  sessionCount: number
  firstSessionDate: string | null
  lastSessionDate: string | null
  totalHours: number
}

export interface RosterFeed {
  version: number
  generatedAt: string
  clinicianId: string
  clients: RosterClient[]
}

export class SyncError extends Error {}

// Fields that must never appear in the feed. If the billing side ever widens the
// payload, this trips before anything reaches the store.
const FORBIDDEN_KEYS = [
  'first', 'last', 'name', 'dob', 'dateOfBirth', 'address', 'phone', 'email',
  'memberId', 'insurance', 'insurerId', 'notes',
]

function assertNoPhi(client: Record<string, unknown>) {
  const offending = FORBIDDEN_KEYS.filter((k) => k in client)
  if (offending.length > 0) {
    throw new SyncError(
      `The feed returned identifying fields (${offending.join(', ')}). Sync stopped — this dashboard must only receive de-identified data.`,
    )
  }
}

export function parseRosterFeed(data: unknown): RosterFeed {
  if (typeof data !== 'object' || data === null) throw new SyncError('Feed is not a JSON object.')
  const feed = data as Record<string, unknown>

  if (typeof feed.version !== 'number') throw new SyncError('Feed is missing a version.')
  if (feed.version > PRACTICUM_FEED_VERSION) {
    throw new SyncError(
      `The billing app is sending feed v${feed.version}, but this dashboard understands v${PRACTICUM_FEED_VERSION}. Update the dashboard.`,
    )
  }
  if (!Array.isArray(feed.clients)) throw new SyncError('Feed is missing a clients array.')

  const clients = feed.clients.map((raw, i) => {
    if (typeof raw !== 'object' || raw === null) throw new SyncError(`Client ${i} is not an object.`)
    const c = raw as Record<string, unknown>
    assertNoPhi(c)
    if (typeof c.ref !== 'string' || !c.ref) throw new SyncError(`Client ${i} has no ref.`)
    return {
      ref: c.ref,
      ageYears: typeof c.ageYears === 'number' ? c.ageYears : null,
      ageCapped: c.ageCapped === true,
      sex: c.sex === 'M' || c.sex === 'F' || c.sex === 'U' ? c.sex : null,
      diagnosisCodes: Array.isArray(c.diagnosisCodes) ? c.diagnosisCodes.filter((x): x is string => typeof x === 'string') : [],
      diagnosisLabel: typeof c.diagnosisLabel === 'string' ? c.diagnosisLabel : '',
      sessionCount: typeof c.sessionCount === 'number' ? c.sessionCount : 0,
      firstSessionDate: typeof c.firstSessionDate === 'string' ? c.firstSessionDate : null,
      lastSessionDate: typeof c.lastSessionDate === 'string' ? c.lastSessionDate : null,
      totalHours: typeof c.totalHours === 'number' ? c.totalHours : 0,
    } satisfies RosterClient
  })

  return {
    version: feed.version,
    generatedAt: typeof feed.generatedAt === 'string' ? feed.generatedAt : new Date().toISOString(),
    clinicianId: typeof feed.clinicianId === 'string' ? feed.clinicianId : '',
    clients,
  }
}

export async function fetchRoster(endpoint: string, token: string): Promise<RosterFeed> {
  if (!endpoint.trim()) throw new SyncError('No sync endpoint is configured. Add one in Intake Sync settings.')
  if (!token.trim()) throw new SyncError('No sync token is configured. Add one in Intake Sync settings.')

  let res: Response
  try {
    res = await fetch(endpoint.trim(), {
      headers: { authorization: `Bearer ${token.trim()}` },
    })
  } catch {
    throw new SyncError(`Could not reach ${endpoint.trim()}. Check the billing app is running and the URL is right.`)
  }

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = typeof body?.error === 'string' ? body.error : ''
    } catch {
      detail = await res.text().catch(() => '')
    }
    if (res.status === 401) throw new SyncError(`The sync token was rejected. Generate a new one in the billing app. ${detail}`.trim())
    if (res.status === 403) throw new SyncError(`Access refused: ${detail || 'not a practicum clinician.'}`)
    throw new SyncError(`Sync failed (${res.status}): ${detail || 'no further detail'}`)
  }

  return parseRosterFeed(await res.json())
}

/** Human-readable demographics line built only from non-identifying fields. */
export function demographicsLine(c: RosterClient): string {
  const bits: string[] = []
  if (c.ageYears !== null) bits.push(c.ageCapped ? 'Age 90+' : `Age ${c.ageYears}`)
  if (c.sex === 'M') bits.push('Male')
  else if (c.sex === 'F') bits.push('Female')
  return bits.join(' · ')
}

/**
 * Build the direct-hour entries a feed implies.
 *
 * Kept pure and separate from the store because the correctness that matters
 * here is arithmetic: these entries REPLACE the previous synced rows rather
 * than adding to them. Appending instead would inflate Nick's hours a little
 * more every time he pressed Sync, against a 200-hour requirement, and the
 * error would look like progress.
 *
 * `labelFor` resolves a client ref to its anonymous label; entries for refs the
 * dashboard doesn't know yet still carry the hours.
 */
export function buildSyncedHourEntries(
  feed: RosterFeed,
  labelFor: (ref: string) => { id?: string; label?: string },
): Array<{
  id: string
  kind: 'direct'
  amount: number
  label: string
  date: string
  clientId?: string
  syncedFromRef: string
}> {
  const out = []
  for (const c of feed.clients) {
    if (c.totalHours <= 0) continue
    const { id, label } = labelFor(c.ref)
    out.push({
      id: `sync-${c.ref}`,
      kind: 'direct' as const,
      amount: c.totalHours,
      label: `${label ?? 'Synced client'} — ${c.sessionCount} session${c.sessionCount === 1 ? '' : 's'} (from billing)`,
      date: c.lastSessionDate ?? feed.generatedAt,
      clientId: id,
      syncedFromRef: c.ref,
    })
  }
  return out
}

/** Replace previously synced hour rows, leaving hand-entered ones untouched. */
export function reconcileHourEntries<T extends { syncedFromRef?: string }>(existing: T[], synced: T[]): T[] {
  return [...existing.filter((e) => !e.syncedFromRef), ...synced]
}
