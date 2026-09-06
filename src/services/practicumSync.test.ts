import { describe, it, expect } from 'vitest'
import {
  parseRosterFeed,
  buildSyncedHourEntries,
  reconcileHourEntries,
  demographicsLine,
  SyncError,
  type RosterFeed,
} from './practicumSync'

function feed(clients: Partial<RosterFeed['clients'][number]>[]): RosterFeed {
  return {
    version: 1,
    generatedAt: '2026-09-06T00:00:00.000Z',
    clinicianId: 'nick-oconnor',
    clients: clients.map((c) => ({
      ref: 'ref-1',
      ageYears: null,
      ageCapped: false,
      sex: null,
      diagnosisCodes: [],
      diagnosisLabel: '',
      sessionCount: 0,
      firstSessionDate: null,
      lastSessionDate: null,
      totalHours: 0,
      ...c,
    })),
  }
}

const noLabels = () => ({})

describe('PHI boundary', () => {
  // The dashboard has no encryption at rest and is a public repo. A feed that
  // starts carrying identifiers must fail loudly, not persist quietly.
  it.each(['name', 'first', 'last', 'dob', 'address', 'phone', 'email', 'memberId'])(
    'refuses a feed containing %s',
    (field) => {
      const bad = { version: 1, generatedAt: '', clinicianId: 'x', clients: [{ ref: 'r', [field]: 'anything' }] }
      expect(() => parseRosterFeed(bad)).toThrow(SyncError)
    },
  )

  it('accepts a clean de-identified feed', () => {
    expect(() => parseRosterFeed(feed([{ ref: 'r', ageYears: 34 }]))).not.toThrow()
  })

  it('refuses a feed from a newer billing app than it understands', () => {
    expect(() => parseRosterFeed({ ...feed([]), version: 99 })).toThrow(/v99/)
  })

  it('never renders a birth date, only an age band', () => {
    expect(demographicsLine({ ...feed([{}]).clients[0], ageYears: 90, ageCapped: true })).toBe('Age 90+')
  })
})

describe('direct hours reconciliation', () => {
  const twoClients = feed([
    { ref: 'a', totalHours: 4.5, sessionCount: 5, lastSessionDate: '2026-08-01' },
    { ref: 'b', totalHours: 2, sessionCount: 2, lastSessionDate: '2026-08-02' },
  ])

  it('creates one entry per client with billed hours', () => {
    const entries = buildSyncedHourEntries(twoClients, noLabels)
    expect(entries).toHaveLength(2)
    expect(entries.reduce((n, e) => n + e.amount, 0)).toBe(6.5)
  })

  it('skips clients with no billed hours', () => {
    expect(buildSyncedHourEntries(feed([{ ref: 'a', totalHours: 0 }]), noLabels)).toHaveLength(0)
  })

  it('gives each client a stable id across syncs, so rows replace rather than pile up', () => {
    const first = buildSyncedHourEntries(twoClients, noLabels)
    const second = buildSyncedHourEntries(twoClients, noLabels)
    expect(first.map((e) => e.id)).toEqual(second.map((e) => e.id))
  })

  // The one that actually matters: against a 200-hour requirement, double
  // counting looks like progress rather than like a bug.
  it('does not inflate hours when synced repeatedly', () => {
    let entries: Array<{ amount: number; syncedFromRef?: string }> = []
    for (let i = 0; i < 5; i++) {
      entries = reconcileHourEntries(entries, buildSyncedHourEntries(twoClients, noLabels))
    }
    expect(entries).toHaveLength(2)
    expect(entries.reduce((n, e) => n + e.amount, 0)).toBe(6.5)
  })

  it('reflects a corrected figure instead of adding the difference', () => {
    let entries: Array<{ amount: number; syncedFromRef?: string }> = reconcileHourEntries(
      [],
      buildSyncedHourEntries(feed([{ ref: 'a', totalHours: 4 }]), noLabels),
    )
    entries = reconcileHourEntries(entries, buildSyncedHourEntries(feed([{ ref: 'a', totalHours: 6 }]), noLabels))
    expect(entries.reduce((n, e) => n + e.amount, 0)).toBe(6)
  })

  it('never touches hand-entered hours', () => {
    const manual: Array<{ amount: number; label: string; syncedFromRef?: string }> = [
      { amount: 3, label: 'Typed by hand' },
      { amount: 1.5, label: 'Also by hand' },
    ]
    const after = reconcileHourEntries(manual, buildSyncedHourEntries(twoClients, noLabels))
    const kept = after.filter((e) => !e.syncedFromRef)
    expect(kept).toEqual(manual)
  })

  it('drops synced rows for clients no longer on the roster', () => {
    let entries: Array<{ amount: number; syncedFromRef?: string }> = reconcileHourEntries(
      [],
      buildSyncedHourEntries(twoClients, noLabels),
    )
    // Client b comes off the roster.
    entries = reconcileHourEntries(entries, buildSyncedHourEntries(feed([{ ref: 'a', totalHours: 4.5 }]), noLabels))
    expect(entries).toHaveLength(1)
    expect(entries[0].amount).toBe(4.5)
  })
})
