// Lightweight, client-side pre-send screen for likely identifying
// information. This is a heuristic safety net, not a de-identification
// guarantee — it exists to catch obvious slips (a pasted email, phone
// number, address, or full name) before session text is sent anywhere,
// especially before a live AI analysis call leaves this machine. It never
// blocks silently: matches are surfaced to the clinician, who decides
// whether to edit the note or proceed.

export type PhiConfidence = 'high' | 'low'

export interface PhiMatch {
  type: string
  snippet: string
  confidence: PhiConfidence
}

// Common clinical/therapeutic bigrams and trigrams that would otherwise
// false-positive against the capitalized-word-sequence ("possible name")
// heuristic below.
const CLINICAL_TERM_STOPLIST = new Set([
  'cognitive behavioral',
  'behavioral therapy',
  'socratic questioning',
  'client response',
  'treatment plan',
  'treatment goals',
  'case presentation',
  'case conceptualization',
  'working synthesis',
  'generalized anxiety',
  'panic attack',
  'panic attacks',
  'adjustment disorder',
  'clinical picture',
  'session note',
  'session notes',
  'progress review',
  'risk assessment',
  'values clarification',
  'cognitive distortion',
  'cognitive distortions',
])

function pushMatch(matches: PhiMatch[], type: string, confidence: PhiConfidence, raw: string) {
  const snippet = raw.length > 48 ? raw.slice(0, 48) + '…' : raw
  if (matches.some((m) => m.type === type && m.snippet === snippet)) return
  matches.push({ type, snippet, confidence })
}

export function scanForPossiblePii(text: string): PhiMatch[] {
  const matches: PhiMatch[] = []
  if (!text || !text.trim()) return matches

  for (const m of text.matchAll(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)) {
    pushMatch(matches, 'Email address', 'high', m[0])
  }
  for (const m of text.matchAll(/(?:\+?\d{1,2}[\s.-]?)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b/g)) {
    pushMatch(matches, 'Phone number', 'high', m[0])
  }
  for (const m of text.matchAll(/\b\d{3}-\d{2}-\d{4}\b/g)) {
    pushMatch(matches, 'SSN-like number', 'high', m[0])
  }
  for (const m of text.matchAll(/\b(0?[1-9]|1[0-2])[/-](0?[1-9]|[12]\d|3[01])[/-](19|20)\d{2}\b/g)) {
    pushMatch(matches, 'Full date (possible date of birth)', 'high', m[0])
  }
  for (const m of text.matchAll(/\b\d{1,6}\s+(?:[A-Z][a-z]+\s){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Place|Pl)\b/g)) {
    pushMatch(matches, 'Street address', 'high', m[0])
  }

  const nameRe = /\b[A-Z][a-z]{1,15}\s+[A-Z][a-z]{1,15}(?:\s+[A-Z][a-z]{1,15})?\b/g
  for (const m of text.matchAll(nameRe)) {
    const phrase = m[0]
    if (/^Client\s+[A-Z]$/.test(phrase)) continue
    if (CLINICAL_TERM_STOPLIST.has(phrase.toLowerCase())) continue
    pushMatch(matches, 'Possible proper name (clinical terms can false-positive — verify)', 'low', phrase)
  }

  return matches.slice(0, 25)
}

export function hasHighConfidenceMatch(matches: PhiMatch[]): boolean {
  return matches.some((m) => m.confidence === 'high')
}

export function summarizePhiMatches(matches: PhiMatch[]): string {
  if (matches.length === 0) return ''
  const byType = new Map<string, number>()
  matches.forEach((m) => byType.set(m.type, (byType.get(m.type) ?? 0) + 1))
  return Array.from(byType.entries())
    .map(([type, count]) => `${type} (${count})`)
    .join(', ')
}
