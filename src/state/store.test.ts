import { describe, it, expect, beforeEach } from 'vitest'
import { useWorkspaceStore } from './store'

const base = { interventions: '', response: '', plan: '' }

function freshClient() {
  const store = useWorkspaceStore.getState()
  store.resetToSeed()
  const id = useWorkspaceStore.getState().addClient({ label: 'Client Z', status: 'Active' })
  // AI off, so analysis is the synchronous offline engine.
  useWorkspaceStore.setState({ aiSettings: { enabled: false, apiKey: '', model: '' } })
  return id
}

const client = (id: string) => useWorkspaceStore.getState().clients.find((c) => c.id === id)!
const hoursFor = (id: string) => useWorkspaceStore.getState().practicum.entries.filter((e) => e.clientId === id)

describe('session editing', () => {
  let id = ''
  beforeEach(() => {
    id = freshClient()
    const { addSession } = useWorkspaceStore.getState()
    addSession(id, { ...base, date: '2026-09-01', duration: 1, rawText: 'Client described worry about work deadlines and poor sleep.' })
    addSession(id, { ...base, date: '2026-09-08', duration: 1, rawText: 'Client reported anxiety about a presentation and avoided a meeting.' })
  })

  it('adds a transcript to the same session rather than creating a new one', () => {
    const s1 = client(id).sessions[0]
    useWorkspaceStore.getState().updateSession(id, s1.id, {
      ...base,
      date: s1.date,
      duration: s1.duration,
      rawText: s1.rawText,
      transcript: 'Client: I think I will never get on top of things.',
    })
    const after = client(id)
    expect(after.sessions).toHaveLength(2)
    expect(after.sessions.find((s) => s.id === s1.id)?.transcript).toContain('never get on top')
  })

  it('reruns the analysis on an edited session', () => {
    const s1 = client(id).sessions[0]
    const before = client(id).pendingSuggestions.filter((sg) => sg.sessionId === s1.id).map((sg) => sg.id)
    useWorkspaceStore.getState().updateSession(id, s1.id, { ...base, date: s1.date, duration: s1.duration, rawText: s1.rawText + ' She felt hopeless.' })
    const now = client(id).pendingSuggestions.filter((sg) => sg.sessionId === s1.id)
    expect(now).toHaveLength(1)
    expect(before).not.toContain(now[0].id) // a fresh suggestion, not the stale one
  })

  it('keeps a suggestion the clinician already acted on', () => {
    const s1 = client(id).sessions[0]
    // Force a decided suggestion onto this session, so the test never depends
    // on whether the offline engine happened to find the session significant.
    const decided = {
      id: 'decided-1',
      sessionId: s1.id,
      sessionNumber: s1.sessionNumber,
      createdAt: new Date().toISOString(),
      source: 'rules' as const,
      status: 'ready' as const,
      casePresentation: { status: 'approved' as const, draft: client(id).casePresentation, reasonForChange: 'r', newEvidence: 'e' },
    }
    useWorkspaceStore.setState((st) => ({
      clients: st.clients.map((c) => (c.id === id ? { ...c, pendingSuggestions: [...c.pendingSuggestions, decided] } : c)),
    }))
    useWorkspaceStore.getState().updateSession(id, s1.id, { ...base, date: s1.date, duration: s1.duration, rawText: s1.rawText + ' More.' })
    expect(client(id).pendingSuggestions.some((x) => x.id === 'decided-1')).toBe(true)
  })

  it('moves the session hours when the duration is edited', () => {
    const s1 = client(id).sessions[0]
    useWorkspaceStore.getState().updateSession(id, s1.id, { ...base, date: s1.date, duration: 1.5, rawText: s1.rawText })
    expect(hoursFor(id).find((e) => e.sessionId === s1.id)?.amount).toBe(1.5)
    expect(hoursFor(id)).toHaveLength(2) // corrected, not duplicated
  })

  it('accepts a transcript-only session', () => {
    useWorkspaceStore.getState().addSession(id, { ...base, date: '2026-09-15', duration: 1, rawText: '', transcript: 'Client: I avoided the call again because I felt anxious.' })
    const last = client(id).sessions.at(-1)!
    expect(last.rawText).toBe('')
    expect(last.transcript).toContain('avoided the call')
    expect(last.transcriptOnlyEvidence).toBeUndefined() // nothing to be "missing from the note" without a note
  })
})

describe('session deletion', () => {
  let id = ''
  beforeEach(() => {
    id = freshClient()
    const { addSession } = useWorkspaceStore.getState()
    for (const [date, text] of [
      ['2026-09-01', 'Client described worry about work deadlines.'],
      ['2026-09-08', 'Client reported anxiety about a presentation.'],
      ['2026-09-15', 'Client practised grounding and felt calmer.'],
    ]) {
      addSession(id, { ...base, date, duration: 1, rawText: text })
    }
  })

  it('renumbers the remaining sessions', () => {
    const middle = client(id).sessions[1]
    useWorkspaceStore.getState().deleteSession(id, middle.id)
    expect(client(id).sessions.map((s) => s.sessionNumber)).toEqual([1, 2])
  })

  it('removes the deleted session hours and relabels the rest', () => {
    const middle = client(id).sessions[1]
    useWorkspaceStore.getState().deleteSession(id, middle.id)
    const entries = hoursFor(id)
    expect(entries).toHaveLength(2)
    expect(entries.some((e) => e.sessionId === middle.id)).toBe(false)
    expect(entries.map((e) => e.label).sort()).toEqual(['Client Z · Session 1', 'Client Z · Session 2'])
  })

  it('drops undecided suggestions for the deleted session', () => {
    const middle = client(id).sessions[1]
    useWorkspaceStore.getState().deleteSession(id, middle.id)
    expect(client(id).pendingSuggestions.some((sg) => sg.sessionId === middle.id)).toBe(false)
  })
})
