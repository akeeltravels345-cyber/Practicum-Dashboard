// Provenance for proposed changes: what changed, why, on what evidence, from
// which session. Pure functions only, so every rule here is testable.
//
// The offline engine cannot reason clinically; it can only notice recurring
// language. So everything it proposes is tagged as inferred, and every piece of
// evidence it cites is tagged by where it actually came from: the transcript
// (what the client said) or the note (what the clinician documented).

import { v4 as uuid } from 'uuid'
import type { ChangeKind, Client, EvidenceCitation, ProposedChange, Session } from '../data/types'

/** Split text into trimmed sentences. */
function sentences(text: string): string[] {
  return (text || '')
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 12)
}

/**
 * Where a sentence came from. The transcript is the client's own words, so it
 * wins only when the sentence is found there and not in the note; a sentence in
 * the note is what the clinician documented, even if the client also said it.
 */
export function sourceOf(sentence: string, session: Pick<Session, 'rawText' | 'transcript'>): 'note' | 'transcript' {
  const needle = sentence.trim().toLowerCase().slice(0, 60)
  const inNote = (session.rawText || '').toLowerCase().includes(needle)
  const inTranscript = (session.transcript || '').toLowerCase().includes(needle)
  return inTranscript && !inNote ? 'transcript' : 'note'
}

/**
 * Evidence citations from one session: the sentences the extraction step
 * actually latched onto, labelled by source. Never paraphrased, so a citation
 * can always be found verbatim in the session it names.
 */
export function sessionCitations(session: Session, limit = 4): EvidenceCitation[] {
  const pool = [
    ...session.extracted.thoughts,
    ...session.extracted.triggers,
    ...session.extracted.behaviors,
    ...session.extracted.relationships,
    ...session.extracted.functioning,
  ]
  const seen = new Set<string>()
  const out: EvidenceCitation[] = []
  for (const text of pool) {
    const key = text.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ text, source: sourceOf(text, session), sessionId: session.id, sessionNumber: session.sessionNumber })
    if (out.length >= limit) break
  }
  // When there is a transcript, the client's own words belong in the trail even
  // if none of the pattern extractors happened to match them. Prefer first-person
  // lines ("I …"), which is where the client, not the therapist, is speaking.
  if (session.transcript?.trim() && !out.some((c) => c.source === 'transcript')) {
    const clientLines = sentences(session.transcript)
      .map((t) => t.replace(/^(client|c|patient)\s*:\s*/i, '').trim())
      .filter((t) => /(^|\s)(i|i'm|i've|i'd|my|me)\b/i.test(t) && !/^(therapist|t)\s*:/i.test(t))
      .filter((t) => sourceOf(t, session) === 'transcript')
    for (const text of clientLines.slice(0, 2)) {
      out.push({ text, source: 'transcript', sessionId: session.id, sessionNumber: session.sessionNumber })
    }
  }

  // Likewise the clinician's own documentation: when there is a note, the trail
  // shows it alongside the client's words, so the two can be compared. Its
  // opening sentence stands in when no extractor matched anything specific.
  if (session.rawText.trim() && !out.some((c) => c.source === 'note')) {
    const first = sentences(session.rawText)[0]
    if (first) out.unshift({ text: first, source: 'note', sessionId: session.id, sessionNumber: session.sessionNumber })
  }

  // A transcript-only session whose lines matched nothing still has evidence.
  if (out.length === 0) {
    const first = sentences(session.transcript ?? '')[0]
    if (first) out.push({ text: first, source: 'transcript', sessionId: session.id, sessionNumber: session.sessionNumber })
  }
  return out
}

/** The engine's own reasoning, cited as inference so it is never mistaken for evidence. */
export function inference(text: string, session: Session): EvidenceCitation {
  return { text, source: 'inference', sessionId: session.id, sessionNumber: session.sessionNumber }
}

export interface FieldPair {
  field: string
  label: string
  before: string
  after: string
}

function kindFor(before: string, after: string): ChangeKind {
  if (!before.trim() && after.trim()) return 'adds'
  if (before.trim() && !after.trim()) return 'removes'
  return 'revises'
}

/**
 * One ProposedChange per field that actually differs. Fields that did not move
 * produce nothing, so an unchanged section never shows up as a "change".
 */
export function changesFromFields(
  pairs: FieldPair[],
  session: Session,
  why: string,
  evidence: EvidenceCitation[],
  kindOverride?: (pair: FieldPair) => ChangeKind | undefined,
): ProposedChange[] {
  return pairs
    .filter((p) => (p.before || '').trim() !== (p.after || '').trim())
    .map((p) => ({
      id: uuid(),
      field: p.field,
      label: p.label,
      kind: kindOverride?.(p) ?? kindFor(p.before || '', p.after || ''),
      before: p.before || '',
      after: p.after || '',
      why,
      evidence,
      sessionId: session.id,
      sessionNumber: session.sessionNumber,
    }))
}

// ---------------------------------------------------------------------------
// The overall case summary.
//
// The old offline summary copied the previous text and appended
// "[Updated following Session N] New evidence has been integrated…". Every
// session stacked another sentence and nothing was ever re-thought, which is
// exactly the "keeps repeating the original summary" problem.
//
// Now: whatever clinical prose is there is kept (it may be the clinician's own
// writing, and a keyword engine has no business replacing it), old bolt-ons are
// stripped, and a single evidence section is REBUILT from the whole record each
// time. Running this twice gives the same result; it never grows.
// ---------------------------------------------------------------------------

export const EVIDENCE_MARKER = 'Where the evidence stands (rebuilt from the session record):'
const LEGACY_BOLT_ON = /\n*\[Updated following Session[^\]]*\][^\n]*/g

/** The clinician-written part of a synthesis, with every generated section removed. */
export function clinicalProse(synthesis: string): string {
  const withoutMarker = (synthesis || '').split(EVIDENCE_MARKER)[0]
  return withoutMarker.replace(LEGACY_BOLT_ON, '').trim()
}

function listWithCounts(themes: string[], counts: Map<string, number>, total: number): string {
  return themes.map((t) => `${t} (${counts.get(t) ?? 0}/${total})`).join(', ')
}

/**
 * Rebuild the evidence section of the summary from every session so far.
 * `sessions` must be in session order and include the latest one.
 */
export function rebuildEvidenceSummary(client: Pick<Client, 'formulation' | 'sessions'>, sessions: Session[]): string {
  const total = sessions.length
  const prose = clinicalProse(client.formulation.workingSynthesis)
  if (total === 0) return prose || 'Working synthesis not yet established.'

  const counts = new Map<string, number>()
  for (const s of sessions) for (const t of new Set(s.extracted.symptoms)) counts.set(t, (counts.get(t) ?? 0) + 1)

  const latest = sessions[total - 1]
  const impact = latest.longitudinalImpact
  const persistent = [...counts.entries()]
    .filter(([, n]) => n >= Math.max(2, Math.ceil(total / 2)))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t)
    .slice(0, 6)

  const lines: string[] = []
  lines.push(`Across ${total} session${total === 1 ? '' : 's'} (latest: session ${latest.sessionNumber}, ${latest.date}).`)
  if (persistent.length) lines.push(`Most consistent themes: ${listWithCounts(persistent, counts, total)}.`)
  if (impact.strengthened.length) lines.push(`Strengthening: ${impact.strengthened.join(', ')}.`)
  if (impact.expanded.length) lines.push(`Newly raised in session ${latest.sessionNumber}: ${impact.expanded.join(', ')}.`)
  if (impact.weakened.length) lines.push(`Less present in session ${latest.sessionNumber}: ${impact.weakened.join(', ')}.`)
  if (impact.contradicted.length) lines.push(`Contradicted: ${impact.contradicted.join(', ')}.`)
  if (impact.resolved.length) lines.push(`Possibly resolving: ${impact.resolved.join(', ')}.`)
  if (impact.uncertain.length) lines.push(`Still uncertain: ${impact.uncertain.join(', ')}.`)
  if (latest.extracted.risks.length) {
    lines.push('Risk-related language appears in the latest session. This is an automated flag, not a risk determination; follow standard protocol.')
  }
  lines.push('Built from recurring language in the notes, not clinical judgment. Verify against the sessions.')

  const evidence = `${EVIDENCE_MARKER}\n${lines.join(' ')}`
  return prose ? `${prose}\n\n${evidence}` : evidence
}

// ---------------------------------------------------------------------------
// Session history maintenance, used when a session is edited or deleted.
// ---------------------------------------------------------------------------

/** Sessions renumbered 1..n in date order, keeping ids stable. */
export function renumberSessions(sessions: Session[]): Session[] {
  return [...sessions]
    .sort((a, b) => (a.date === b.date ? a.createdAt.localeCompare(b.createdAt) : a.date.localeCompare(b.date)))
    .map((s, i) => (s.sessionNumber === i + 1 ? s : { ...s, sessionNumber: i + 1 }))
}
