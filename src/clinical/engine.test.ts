import { describe, it, expect } from 'vitest'
import {
  compareLongitudinal,
  detectSourceDiscrepancies,
  findTranscriptOnlyEvidence,
  extractFromSession,
} from './engine'
import { emptyLongitudinalImpact, type Session } from '../data/types'

// A session carrying just the fields the comparison actually reads.
function session(n: number, symptoms: string[]): Session {
  return {
    id: `s${n}`,
    sessionNumber: n,
    date: `2026-0${n}-01`,
    duration: 1,
    rawText: '',
    interventions: '',
    response: '',
    plan: '',
    extracted: { ...extractFromSession({ date: '', duration: 0, rawText: '', interventions: '', response: '', plan: '' }), symptoms },
    longitudinalImpact: emptyLongitudinalImpact(),
    createdAt: new Date().toISOString(),
  }
}

describe('compareLongitudinal', () => {
  it('treats a theme never seen before as newly introduced', () => {
    const impact = compareLongitudinal(['Boundaries'], [], [])
    expect(impact.expanded).toContain('Boundaries')
    expect(impact.confirmed).not.toContain('Boundaries')
  })

  it('confirms a theme that is already established', () => {
    const prior = [session(1, ['Anxiety'])]
    const impact = compareLongitudinal(['Anxiety'], ['Anxiety'], prior)
    expect(impact.confirmed).toContain('Anxiety')
    expect(impact.expanded).not.toContain('Anxiety')
  })

  it('strengthens a theme recurring across the recent window', () => {
    const prior = [session(1, ['Anxiety']), session(2, ['Anxiety']), session(3, ['Anxiety'])]
    const impact = compareLongitudinal(['Anxiety'], ['Anxiety'], prior)
    expect(impact.strengthened).toContain('Anxiety')
  })

  // The bug this suite exists for. Theme detection is keyword-based, so a note
  // that simply does not use a word must never be read as clinical absence —
  // otherwise the app tells a supervisor that a GAD client's anxiety resolved.
  describe('never asserts resolution from silence', () => {
    it('does not resolve a theme just because it is missing from one session', () => {
      const prior = [session(1, ['Anxiety']), session(2, ['Anxiety']), session(3, ['Anxiety'])]
      const impact = compareLongitudinal(['Career'], ['Anxiety', 'Career'], prior)
      expect(impact.resolved).not.toContain('Anxiety')
      expect(impact.weakened).toContain('Anxiety')
    })

    it('does not resolve a theme after a long silence with no resolution language', () => {
      const prior = [session(1, ['Anxiety']), session(2, []), session(3, []), session(4, [])]
      const impact = compareLongitudinal(['Career'], ['Anxiety', 'Career'], prior, 'We discussed work stress.')
      expect(impact.resolved).toEqual([])
    })

    it('resolves when absence is sustained AND the session says so', () => {
      // Absent in session 2, session 3, and now — a run of three.
      const prior = [session(1, ['Anxiety']), session(2, []), session(3, [])]
      const withLanguage = compareLongitudinal(
        ['Career'],
        ['Anxiety', 'Career'],
        prior,
        'Client no longer reports the panic symptoms discussed previously.',
      )
      expect(withLanguage.resolved).toContain('Anxiety')
    })

    it('does not resolve on a short absence even with resolution language', () => {
      // Only a two-session run. Resolution language alone is not enough.
      const prior = [session(1, ['Anxiety']), session(2, ['Anxiety']), session(3, [])]
      const impact = compareLongitudinal(
        ['Career'],
        ['Anxiety', 'Career'],
        prior,
        'Client no longer reports the panic symptoms discussed previously.',
      )
      expect(impact.resolved).not.toContain('Anxiety')
    })
  })

  it('ignores themes with no session-level evidence at all', () => {
    // A theme sitting in the theme list but never extracted from any session has
    // no trail to reason about; claiming it weakened would be fabricated.
    const prior = [session(1, ['Career'])]
    const impact = compareLongitudinal(['Career'], ['Career', 'NeverSeen'], prior)
    expect(impact.weakened).not.toContain('NeverSeen')
    expect(impact.resolved).not.toContain('NeverSeen')
    expect(impact.uncertain).not.toContain('NeverSeen')
  })

  it('does not call a steadily fading theme uncertain', () => {
    const prior = [session(1, ['Anxiety']), session(2, ['Anxiety']), session(3, ['Anxiety'])]
    const impact = compareLongitudinal(['Career'], ['Anxiety', 'Career'], prior)
    // It is weakening, which is a direction. Uncertain is for oscillation.
    expect(impact.weakened).toContain('Anxiety')
    expect(impact.uncertain).not.toContain('Anxiety')
  })

  it('a theme cannot be both strengthened and uncertain', () => {
    const prior = [session(1, ['Anxiety']), session(2, []), session(3, ['Anxiety']), session(4, [])]
    const impact = compareLongitudinal(['Anxiety'], ['Anxiety'], prior)
    const both = impact.strengthened.filter((t) => impact.uncertain.includes(t))
    expect(both).toEqual([])
  })

  it('runs with no history at all without throwing', () => {
    expect(() => compareLongitudinal(['Anxiety'], ['Anxiety'], [])).not.toThrow()
  })
})

describe('transcript analysis', () => {
  const note = 'Client reported a good week overall and seemed calmer. Progress noted around boundary setting.'
  const transcript =
    'Client: Honestly I have been overwhelmed most days. I kept crying in the car before work. I think I am just hopeless about it changing.'

  it('flags a note that reads more positively than the transcript', () => {
    const found = detectSourceDiscrepancies(note, transcript)
    expect(found.map((d) => d.topic)).toContain('Overall session valence')
  })

  it('always flags risk language present only in the transcript', () => {
    const found = detectSourceDiscrepancies(note, transcript)
    expect(found.map((d) => d.topic)).toContain('Risk / safety')
  })

  it('leaves every discrepancy unreviewed for the clinician to decide', () => {
    const found = detectSourceDiscrepancies(note, transcript)
    expect(found.length).toBeGreaterThan(0)
    expect(found.every((d) => d.reviewed === false)).toBe(true)
  })

  it('reports evidence the transcript adds over the note', () => {
    const added = findTranscriptOnlyEvidence(note, transcript)
    expect(added.length).toBeGreaterThan(0)
    expect(added.join(' ')).toMatch(/transcript/i)
  })

  it('finds nothing when there is no transcript', () => {
    expect(findTranscriptOnlyEvidence(note, '')).toEqual([])
    expect(detectSourceDiscrepancies(note, '')).toEqual([])
  })
})

describe('extraction', () => {
  const base = { date: '2026-01-01', duration: 1, interventions: '', response: '', plan: '' }

  it('works from the note alone', () => {
    const out = extractFromSession({ ...base, rawText: 'Client described worry about work and avoided a rest day.' })
    expect(out).toBeDefined()
    expect(Array.isArray(out.symptoms)).toBe(true)
  })

  it('a transcript only ever adds evidence, never removes it', () => {
    const rawText = 'Client described worry about work and avoided a rest day.'
    const noteOnly = extractFromSession({ ...base, rawText })
    const withTranscript = extractFromSession({ ...base, rawText, transcript: 'Client: I felt hopeless and exhausted all week.' })
    for (const theme of noteOnly.symptoms) {
      expect(withTranscript.symptoms).toContain(theme)
    }
    expect(withTranscript.emotions.length).toBeGreaterThanOrEqual(noteOnly.emotions.length)
  })
})
