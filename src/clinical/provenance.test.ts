import { describe, it, expect } from 'vitest'
import {
  EVIDENCE_MARKER,
  changesFromFields,
  clinicalProse,
  rebuildEvidenceSummary,
  renumberSessions,
  sessionCitations,
  sourceOf,
} from './provenance'
import { parseChanges } from './ai'
import { extractFromSession } from './engine'
import { emptyLongitudinalImpact, type Formulation, type Session } from '../data/types'

function session(n: number, over: Partial<Session> = {}): Session {
  const rawText = over.rawText ?? ''
  const transcript = over.transcript
  return {
    id: `s${n}`,
    sessionNumber: n,
    date: `2026-0${n}-01`,
    duration: 1,
    rawText,
    transcript,
    interventions: '',
    response: '',
    plan: '',
    extracted: extractFromSession({ date: '', duration: 0, rawText, transcript, interventions: '', response: '', plan: '' }),
    longitudinalImpact: emptyLongitudinalImpact(),
    createdAt: `2026-0${n}-01T10:00:00Z`,
    ...over,
  }
}

const formulationWith = (workingSynthesis: string) => ({ workingSynthesis }) as Formulation

describe('overall case summary', () => {
  const sessions = [
    session(1, { extracted: { ...session(1).extracted, symptoms: ['Anxiety', 'Career'] } }),
    session(2, { extracted: { ...session(2).extracted, symptoms: ['Anxiety'] } }),
  ]

  // The reported bug: the old summary copied itself and bolted a sentence on
  // every session, so it grew forever and never changed its mind.
  it('does not grow when rebuilt repeatedly', () => {
    let synthesis = 'Client presents with generalised anxiety tied to work.'
    const first = rebuildEvidenceSummary({ formulation: formulationWith(synthesis), sessions }, sessions)
    synthesis = first
    const second = rebuildEvidenceSummary({ formulation: formulationWith(synthesis), sessions }, sessions)
    expect(second).toBe(first)
    expect(second.split(EVIDENCE_MARKER).length).toBe(2)
  })

  it('keeps the clinician-written prose', () => {
    const out = rebuildEvidenceSummary({ formulation: formulationWith('My own clinical paragraph.'), sessions }, sessions)
    expect(out.startsWith('My own clinical paragraph.')).toBe(true)
  })

  it('strips the old stacked "[Updated following Session N]" bolt-ons', () => {
    const legacy = 'Real paragraph.\n\n[Updated following Session 2 (x)] New evidence has been integrated.\n\n[Updated following Session 3 (y)] Again.'
    expect(clinicalProse(legacy)).toBe('Real paragraph.')
  })

  it('reflects the record, not the first session', () => {
    const out = rebuildEvidenceSummary({ formulation: formulationWith(''), sessions }, sessions)
    expect(out).toContain('Across 2 sessions')
    expect(out).toContain('Anxiety (2/2)')
  })
})

describe('evidence sources', () => {
  const s = session(1, {
    rawText: 'Client described worry about deadlines at work.',
    transcript: 'Client: I think I am letting everyone down all the time.',
  })

  it('attributes a sentence only in the transcript to the client', () => {
    expect(sourceOf('I think I am letting everyone down all the time.', s)).toBe('transcript')
  })

  it('attributes a sentence in the note to the clinician', () => {
    expect(sourceOf('Client described worry about deadlines at work.', s)).toBe('note')
  })

  it("quotes the client's own transcript words even when no pattern matched them", () => {
    const both = session(3, {
      rawText: 'Session focused on the rest block homework.',
      transcript: "Therapist: How did it go? Client: Honestly I skipped it. I'm letting everyone down if I stop.",
    })
    const cited = sessionCitations(both)
    const fromClient = cited.filter((c) => c.source === 'transcript').map((c) => c.text)
    expect(fromClient.some((t) => t.includes('letting everyone down'))).toBe(true)
    expect(fromClient.every((t) => !/^therapist/i.test(t))).toBe(true)
  })

  it('shows what was documented alongside what the client said', () => {
    const both = session(3, {
      rawText: 'Session focused on the rest block homework.',
      transcript: "Client: I'm letting everyone down if I stop.",
    })
    const sources = sessionCitations(both).map((c) => c.source)
    expect(sources).toContain('note')
    expect(sources).toContain('transcript')
  })

  it('cites a transcript-only session as the client, not the clinician', () => {
    const t = session(2, { rawText: '', transcript: 'Client: I keep thinking I will fail at this job.' })
    const cited = sessionCitations(t)
    expect(cited.length).toBeGreaterThan(0)
    expect(cited.every((c) => c.source === 'transcript')).toBe(true)
  })
})

describe('proposed changes', () => {
  const s = session(3)

  it('produces nothing for a field that did not move', () => {
    expect(changesFromFields([{ field: 'x', label: 'X', before: 'same', after: 'same' }], s, 'why', [])).toEqual([])
  })

  it('classifies adds, removes and revises', () => {
    const out = changesFromFields(
      [
        { field: 'a', label: 'A', before: '', after: 'new' },
        { field: 'b', label: 'B', before: 'old', after: '' },
        { field: 'c', label: 'C', before: 'old', after: 'new' },
      ],
      s,
      'why',
      [],
    )
    expect(out.map((c) => c.kind)).toEqual(['adds', 'removes', 'revises'])
  })

  it('stamps every change with the session it came from', () => {
    const [c] = changesFromFields([{ field: 'a', label: 'A', before: '', after: 'x' }], s, 'why', [])
    expect(c.sessionId).toBe('s3')
    expect(c.sessionNumber).toBe(3)
  })
})

describe('AI change parsing', () => {
  const s = session(4, {
    rawText: 'Client reported sleeping better this week.',
    transcript: 'Client: honestly I still lie awake most nights worrying.',
  })

  it('keeps a quote that really is in the transcript', () => {
    const [c] = parseChanges(
      [{ field: 'protective', kind: 'weakens', why: 'w', evidence: [{ text: 'I still lie awake most nights worrying', source: 'transcript' }] }],
      s,
    )
    expect(c.evidence[0].source).toBe('transcript')
  })

  // An AI paraphrase labelled as the client's words is exactly what must never
  // reach the record looking like evidence.
  it('downgrades an invented "quote" to inference', () => {
    const [c] = parseChanges(
      [{ field: 'protective', kind: 'weakens', why: 'w', evidence: [{ text: 'The client feels hopeless about treatment', source: 'transcript' }] }],
      s,
    )
    expect(c.evidence[0].source).toBe('inference')
  })

  it('coerces an unknown change kind to "revises" rather than trusting it', () => {
    const [c] = parseChanges([{ field: 'x', kind: 'demolishes', why: 'w' }], s)
    expect(c.kind).toBe('revises')
  })
})

describe('session numbering', () => {
  it('renumbers by date after a deletion, keeping ids', () => {
    const out = renumberSessions([session(1), session(3), session(4)])
    expect(out.map((x) => [x.id, x.sessionNumber])).toEqual([
      ['s1', 1],
      ['s3', 2],
      ['s4', 3],
    ])
  })
})
