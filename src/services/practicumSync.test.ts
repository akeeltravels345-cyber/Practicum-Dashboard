import { describe, it, expect } from 'vitest'
import { parseRosterFeed, demographicsLine, SyncError, type RosterFeed } from './practicumSync'

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
