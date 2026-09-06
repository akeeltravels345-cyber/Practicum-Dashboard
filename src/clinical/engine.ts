// Adaptive intelligence engine.
//
// This is a transparent, rule-based drafting assistant — it has no access to a
// clinical AI model. It extracts keyword-level signal from raw session text and
// drafts candidate updates. Every draft is a HYPOTHESIS/SYNTHESIS artifact that
// the clinician must review, edit, and explicitly apply. Nothing here silently
// overwrites the clinical record.

import { v4 as uuid } from 'uuid'
import type {
  Client,
  DocumentationGap,
  Extracted,
  FrameworkAssessment,
  LongitudinalImpact,
  MaintainingCycle,
  PendingSuggestion,
  PresentingConcern,
  ProgressDomainEntry,
  ProgressDomainName,
  ProgressTrend,
  Session,
  SupervisionQuestion,
  TreatmentGoal,
} from '../data/types'
import { PROGRESS_DOMAINS } from '../data/types'
import {
  BEHAVIORAL_PATTERN_KEYWORDS,
  COGNITIVE_DISTORTION_KEYWORDS,
  COPING_KEYWORDS,
  DIAGNOSTIC_FLAG_KEYWORDS,
  DOMAIN_RELEVANCE_KEYWORDS,
  FRAMEWORK_EVIDENCE_KEYWORDS,
  IMPROVING_MARKERS,
  INTERVENTION_KEYWORDS,
  INTERVENTION_MARKERS,
  PLAN_MARKERS,
  RELATIONAL_PATTERN_KEYWORDS,
  RESPONSE_MARKERS,
  RISK_KEYWORDS,
  STABLE_MARKERS,
  STRENGTH_KEYWORDS,
  WORSENING_MARKERS,
  detectEmotions,
  detectLabels,
  detectThemes,
  findKeywordHits,
} from './themeDictionary'

export interface SessionDraftInput {
  date: string
  duration: number
  rawText: string
  interventions: string
  response: string
  plan: string
}

// Splits one pasted session note into Interventions / Client Response / Plan
// sections, so a clinician can paste a single note (e.g. from an external
// note-taking tool) instead of manually copying it into three separate
// fields. Purely a mechanical sentence-classification heuristic — it never
// alters the raw note itself, and every result stays editable. Each sentence
// is assigned to at most one section (plan takes precedence over response,
// which takes precedence over intervention) so nothing is duplicated across
// sections; a sentence matching none of the markers is left out of all three
// and remains visible only in the raw note.
export interface SplitSessionNote {
  interventions: string
  response: string
  plan: string
}

export function splitSessionNote(rawText: string): SplitSessionNote {
  const sentences = rawText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const planSentences: string[] = []
  const responseSentences: string[] = []
  const interventionSentences: string[] = []

  const hasQuote = (s: string) => /["“”]/.test(s)
  const lowerIncludesAny = (s: string, markers: string[]) => {
    const lower = s.toLowerCase()
    return markers.some((m) => lower.includes(m))
  }

  for (const sentence of sentences) {
    if (lowerIncludesAny(sentence, PLAN_MARKERS)) {
      planSentences.push(sentence)
    } else if (lowerIncludesAny(sentence, RESPONSE_MARKERS) || hasQuote(sentence)) {
      responseSentences.push(sentence)
    } else if (lowerIncludesAny(sentence, INTERVENTION_KEYWORDS) || lowerIncludesAny(sentence, INTERVENTION_MARKERS)) {
      interventionSentences.push(sentence)
    }
  }

  return {
    interventions: interventionSentences.join(' '),
    response: responseSentences.join(' '),
    plan: planSentences.join(' '),
  }
}

// Step 2 — Extract
export function extractFromSession(input: SessionDraftInput): Extracted {
  const text = `${input.rawText}\n${input.interventions}\n${input.response}\n${input.plan}`
  return {
    symptoms: detectThemes(input.rawText).slice(0, 6),
    emotions: detectEmotions(text),
    thoughts: extractSentencesContaining(input.rawText, ['i think', 'i feel like', 'i believe', 'i keep thinking']),
    behaviors: extractSentencesContaining(input.rawText, ['i started', 'i stopped', 'i tried', 'i avoided', 'i did']),
    triggers: extractSentencesContaining(input.rawText, ['when', 'triggered by', 'happens after', 'set off by']).slice(0, 4),
    coping: findKeywordHits(text, COPING_KEYWORDS),
    relationships: extractSentencesContaining(input.rawText, ['partner', 'co-parent', 'family', 'friend', 'relationship']).slice(0, 4),
    functioning: extractSentencesContaining(input.rawText, ['sleep', 'appetite', 'work', 'school', 'daily']).slice(0, 4),
    interventions: findKeywordHits(text, INTERVENTION_KEYWORDS),
    response: input.response ? [input.response] : [],
    goals: extractSentencesContaining(input.plan, ['goal', 'aim to', 'plan to', 'homework']).slice(0, 4),
    risks: findKeywordHits(text, RISK_KEYWORDS),
    strengths: findKeywordHits(text, STRENGTH_KEYWORDS),
    cognitiveDistortions: detectLabels(text, COGNITIVE_DISTORTION_KEYWORDS),
    behavioralPatterns: detectLabels(text, BEHAVIORAL_PATTERN_KEYWORDS),
    relationalPatterns: detectLabels(text, RELATIONAL_PATTERN_KEYWORDS),
    frameworkEvidence: detectLabels(text, FRAMEWORK_EVIDENCE_KEYWORDS),
    diagnosticConsiderations: detectLabels(text, DIAGNOSTIC_FLAG_KEYWORDS),
  }
}

function extractSentencesContaining(text: string, markers: string[]): string[] {
  if (!text) return []
  const sentences = text.split(/(?<=[.!?])\s+/)
  const lowerMarkers = markers.map((m) => m.toLowerCase())
  return sentences
    .filter((s) => lowerMarkers.some((m) => s.toLowerCase().includes(m)))
    .map((s) => s.trim())
    .filter(Boolean)
}

// Step 3/4 — Compare + Classify against existing themes
export function compareThemes(newThemes: string[], existingThemes: string[]): LongitudinalImpact {
  const confirmed = newThemes.filter((t) => existingThemes.includes(t))
  const expanded = newThemes.filter((t) => !existingThemes.includes(t))
  return {
    confirmed,
    expanded,
    complicated: [],
    contradicted: [],
    changed: expanded.length > 0 ? expanded : [],
  }
}

export function mergeThemes(existingThemes: string[], newThemes: string[]): string[] {
  const set = new Set(existingThemes)
  newThemes.forEach((t) => set.add(t))
  return Array.from(set)
}

// Aggregates each session's extracted emotion labels into a longitudinal summary,
// ranked by how many sessions each emotion appeared in. This is a HYPOTHESIS
// artifact — keyword-level pattern matching, not a clinical read of affect —
// and should always be verified against the source session notes.
export function computeEmotionSummary(sessions: Session[]): string {
  if (sessions.length === 0) {
    return 'No sessions recorded yet — this will populate once session notes are added.'
  }
  const counts = new Map<string, number>()
  for (const s of sessions) {
    const seenThisSession = new Set(s.extracted.emotions)
    for (const emotion of seenThisSession) {
      counts.set(emotion, (counts.get(emotion) ?? 0) + 1)
    }
  }
  if (counts.size === 0) {
    return 'No emotion-related language was flagged in session notes yet — consider whether affect is being documented explicitly, or add more detail to session notes.'
  }
  const total = sessions.length
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const parts = ranked.map(([emotion, count]) => `${emotion} (${count}/${total} session${total === 1 ? '' : 's'})`)
  return `Computed from session notes: ${parts.join(', ')}. Verify these reflect the client's own language rather than clinician inference.`
}

// ---------------------------------------------------------------------------
// Significance gating — "adaptive, not volatile" (spec §11).
// A session only triggers a formulation/case-presentation update when it
// introduces genuinely new clinical signal. Otherwise the existing record is
// left untouched rather than being regenerated on every session.
// ---------------------------------------------------------------------------

export interface SignificanceResult {
  significant: boolean
  reasons: string[]
  newCognitivePatterns: string[]
  newBehavioralPatterns: string[]
  newRelationalPatterns: string[]
  progressSignal: 'improving' | 'worsening' | null
}

export function evaluateSessionSignificance(client: Client, session: Session): SignificanceResult {
  const reasons: string[] = []
  const newCognitivePatterns = session.extracted.cognitiveDistortions.filter((l) => !client.formulation.cognitivePatternLabels.includes(l))
  const newBehavioralPatterns = session.extracted.behavioralPatterns.filter((l) => !client.formulation.behavioralPatternLabels.includes(l))
  const newRelationalPatterns = session.extracted.relationalPatterns.filter((l) => !client.formulation.relationalPatternLabels.includes(l))

  if (session.longitudinalImpact.expanded.length) reasons.push(`New theme(s): ${session.longitudinalImpact.expanded.join(', ')}`)
  if (session.extracted.risks.length) reasons.push('Risk-related language flagged')
  if (newCognitivePatterns.length) reasons.push(`New cognitive pattern(s): ${newCognitivePatterns.join(', ')}`)
  if (newBehavioralPatterns.length) reasons.push(`New behavioral pattern(s): ${newBehavioralPatterns.join(', ')}`)
  if (newRelationalPatterns.length) reasons.push(`New relational pattern(s): ${newRelationalPatterns.join(', ')}`)

  const text = `${session.rawText} ${session.response} ${session.plan}`.toLowerCase()
  const improving = IMPROVING_MARKERS.some((m) => text.includes(m))
  const worsening = WORSENING_MARKERS.some((m) => text.includes(m))
  let progressSignal: 'improving' | 'worsening' | null = null
  if (improving && !worsening) {
    progressSignal = 'improving'
    reasons.push('Session language suggests improvement/progress')
  } else if (worsening && !improving) {
    progressSignal = 'worsening'
    reasons.push('Session language suggests difficulty/setback')
  }

  return {
    significant: reasons.length > 0,
    reasons,
    newCognitivePatterns,
    newBehavioralPatterns,
    newRelationalPatterns,
    progressSignal,
  }
}

// Only called when evaluateSessionSignificance() found genuinely new evidence.
// Integrates the new evidence into the existing synthesis rather than merely
// logging that a session occurred.
export function draftIntegratedSynthesis(client: Client, session: Session, sig: SignificanceResult): string {
  const prior = client.formulation.workingSynthesis?.trim()
  const sessionLabel = `Session ${session.sessionNumber} (${session.date})`
  const reasonText = sig.reasons.join('; ')
  const riskNote = session.extracted.risks.length
    ? ' Risk-related language was flagged — verify against source documentation and follow standard risk/safety protocol; this is an automated flag, not a risk determination.'
    : ''
  return [
    prior || 'Working synthesis not yet established.',
    '',
    `[Updated following ${sessionLabel}] New evidence (${reasonText}) has been integrated into the working hypothesis above.${riskNote} This remains a working synthesis — verify against source documentation.`,
  ].join('\n')
}

// Builds the four-part "Clinical Evolution" record (spec §7) for a
// significant update. Grounded in the actual session excerpt, never fabricated.
export function buildClinicalEvolutionFields(
  session: Session,
  sig: SignificanceResult,
  nextUnderstanding: string,
): { newEvidence: string; reasonForChange: string; currentUnderstanding: string } {
  return {
    newEvidence: `Session ${session.sessionNumber} (${session.date}): ${sig.reasons.join('; ')}. Source excerpt: "${truncate(session.rawText, 220)}"`,
    reasonForChange: sig.reasons.join('; '),
    currentUnderstanding: nextUnderstanding,
  }
}

export function mergeLabels(existing: string[], incoming: string[]): string[] {
  const set = new Set(existing)
  incoming.forEach((l) => set.add(l))
  return Array.from(set)
}

// Regenerates a pattern narrative only from the current label set — called
// only when that label set actually changed, so prose stays stable otherwise.
export function draftPatternNarrative(kind: string, labels: string[]): string {
  if (labels.length === 0) return `No clear ${kind} pattern has been identified from session notes yet.`
  return `Session notes suggest possible ${kind} pattern(s): ${labels.join(', ')}. These are keyword-level observations — verify against the client's own language and clinical judgment before treating them as established.`
}

export function computeMaintainingCycle(cognitiveLabels: string[], behavioralLabels: string[], topEmotion: string, latestTrigger: string): MaintainingCycle {
  const notYet = 'Not yet clearly identified from session notes.'
  const behavior = behavioralLabels.length ? behavioralLabels.join(', ') : notYet
  const hasBehavior = behavioralLabels.length > 0
  return {
    trigger: latestTrigger || notYet,
    thought: cognitiveLabels.length ? `Possible ${cognitiveLabels.join(', ')} pattern.` : notYet,
    emotion: topEmotion || notYet,
    behavior,
    consequence: hasBehavior
      ? 'This response may provide short-term relief but appears to maintain the difficulty over time — verify with the client.'
      : notYet,
    reinforcement: hasBehavior
      ? 'The short-term relief may reinforce the pattern, making it more likely to recur in similar situations — a hypothesis to test, not an established mechanism.'
      : notYet,
  }
}

// Tallies which theoretical frameworks the accumulated session language most
// supports. Never assigned just because an intervention was used once —
// ranked by how many distinct sessions carry that framework's markers.
export function computeTheoreticalFrameworks(sessions: Session[]): FrameworkAssessment[] {
  const counts = new Map<string, number>()
  for (const s of sessions) {
    const seen = new Set(s.extracted.frameworkEvidence)
    for (const fw of seen) counts.set(fw, (counts.get(fw) ?? 0) + 1)
  }
  if (counts.size === 0) return []
  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  const total = sessions.length
  return ranked.slice(0, 5).map(([framework, count], i) => ({
    framework,
    role: i === 0 ? 'primary' : 'supporting',
    evidence: `Language/intervention markers consistent with ${framework} appeared in ${count}/${total} session${total === 1 ? '' : 's'} — consider whether this reflects the strongest current explanatory lens or simply which interventions happened to be used.`,
  }))
}

export function computePresentingConcerns(client: Client): PresentingConcern[] {
  const scores = new Map<string, number>()
  client.sessions.forEach((s, idx) => {
    const recencyWeight = 1 + idx * 0.15
    new Set(s.extracted.symptoms).forEach((t) => scores.set(t, (scores.get(t) ?? 0) + recencyWeight))
  })
  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1])
  return ranked.slice(0, 6).map(([concern], i) => ({ concern, priority: i + 1 }))
}

export function computeKeyFindings(client: Client): string {
  const parts: string[] = []
  if (client.themes.length) parts.push(`Symptoms/themes: ${client.themes.join(', ')}.`)
  if (client.formulation.behavioralPatternLabels.length) parts.push(`Behavioral patterns: ${client.formulation.behavioralPatternLabels.join(', ')}.`)
  if (client.formulation.cognitivePatternLabels.length) parts.push(`Cognitive patterns: ${client.formulation.cognitivePatternLabels.join(', ')}.`)
  if (client.formulation.relationalPatternLabels.length) parts.push(`Relational patterns: ${client.formulation.relationalPatternLabels.join(', ')}.`)
  const strengths = Array.from(new Set(client.sessions.flatMap((s) => s.extracted.strengths)))
  if (strengths.length) parts.push(`Strengths/protective factors noted: ${strengths.join(', ')}.`)
  const risks = Array.from(new Set(client.sessions.flatMap((s) => s.extracted.risks)))
  if (risks.length) parts.push('Risk-related language has been flagged in session notes — verify and follow standard protocol.')
  if (parts.length === 0) return 'No significant findings identified from session notes yet.'
  return parts.join(' ')
}

// Only called when a session is significant — the narrative synthesis of
// "where the client currently is," not a running tally like key findings.
export function draftCurrentClinicalPicture(client: Client, session: Session, sig: SignificanceResult): string {
  const sessionCount = client.sessions.length
  const focus = client.treatmentPlan.presentingFocus || client.presentingConcern
  return `As of Session ${session.sessionNumber} (${sessionCount} session${sessionCount === 1 ? '' : 's'} total), the client's presentation centers on ${focus || 'concerns still being clarified'}. Recent evidence: ${sig.reasons.join('; ') || 'no significant change from prior understanding'}. This is a working synthesis — verify against source documentation.`
}

// Treatment Progress — cumulative, per-domain trend tracking (spec §6).
// Defaults honestly to "insufficient evidence" rather than guessing a trend
// from thin keyword signal.
export function computeProgressDomains(sessions: Session[]): ProgressDomainEntry[] {
  return PROGRESS_DOMAINS.map((domain) => computeSingleDomain(domain, sessions))
}

function computeSingleDomain(domain: ProgressDomainName, sessions: Session[]): ProgressDomainEntry {
  const keywords = DOMAIN_RELEVANCE_KEYWORDS[domain] ?? []
  const matches: { sessionNumber: number; sentence: string }[] = []
  for (const s of sessions) {
    const text = `${s.rawText} ${s.response} ${s.plan}`
    const sentences = text.split(/(?<=[.!?])\s+/)
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase()
      if (keywords.some((k) => lower.includes(k))) {
        matches.push({ sessionNumber: s.sessionNumber, sentence: sentence.trim() })
        break
      }
    }
  }
  if (matches.length === 0) {
    return { domain, trend: 'insufficient_evidence', narrative: 'No session-note language clearly relevant to this domain yet.' }
  }
  const earliest = matches[0]
  const latest = matches[matches.length - 1]
  const latestLower = latest.sentence.toLowerCase()
  const improving = IMPROVING_MARKERS.some((m) => latestLower.includes(m))
  const worsening = WORSENING_MARKERS.some((m) => latestLower.includes(m))
  const stable = STABLE_MARKERS.some((m) => latestLower.includes(m))

  let trend: ProgressTrend
  if (improving && worsening) trend = 'fluctuating'
  else if (improving) trend = 'improving'
  else if (worsening) trend = 'worsening'
  else if (stable) trend = 'stable'
  else trend = 'insufficient_evidence'

  const narrative =
    matches.length > 1 && earliest.sessionNumber !== latest.sessionNumber
      ? `Early (Session ${earliest.sessionNumber}): "${truncate(earliest.sentence, 140)}" — Later (Session ${latest.sessionNumber}): "${truncate(latest.sentence, 140)}"`
      : `Session ${latest.sessionNumber}: "${truncate(latest.sentence, 160)}"`

  return { domain, trend, narrative }
}

// Recomputes the fields that are safe to refresh whenever session data
// changes — mechanical tallies/rankings, not narrative interpretation, so
// refreshing them isn't the kind of "volatility" the adaptive-not-volatile
// principle (spec §11) guards against. Shared by the store (on each new
// session, and for the manual "Recompute" actions) and by seed data.
export function collectEmotionLabels(sessions: Session[]): string[] {
  return Array.from(new Set(sessions.flatMap((s) => s.extracted.emotions)))
}

export function computeClientAggregates(client: Client): Pick<Client, 'formulation' | 'casePresentation' | 'treatmentPlan' | 'treatmentReview'> {
  const emotionSummary = computeEmotionSummary(client.sessions)
  const emotionalPatterns = draftPatternNarrative('emotional', collectEmotionLabels(client.sessions))
  const cognitivePatterns = draftPatternNarrative('cognitive', client.formulation.cognitivePatternLabels)
  const behavioralPatterns = draftPatternNarrative('behavioral', client.formulation.behavioralPatternLabels)
  const relationalPatterns = draftPatternNarrative('relational', client.formulation.relationalPatternLabels)
  const frameworks = computeTheoreticalFrameworks(client.sessions)
  const presentingConcerns = computePresentingConcerns(client)
  const keyFindings = computeKeyFindings(client)
  const progressDomains = computeProgressDomains(client.sessions)
  const goalContextText = [
    client.presentingConcern,
    client.formulation.workingSynthesis,
    client.treatmentPlan.presentingFocus,
    client.treatmentPlan.rationale,
  ].join(' ')
  const flaggedGoals = flagStaleGoals(
    client.treatmentPlan.goals,
    client.themes,
    [...client.formulation.cognitivePatternLabels, ...client.formulation.behavioralPatternLabels, ...client.formulation.relationalPatternLabels],
    goalContextText,
  )
  const latestSession = client.sessions[client.sessions.length - 1]
  const maintainingCycle =
    client.formulation.cognitivePatternLabels.length || client.formulation.behavioralPatternLabels.length
      ? computeMaintainingCycle(
          client.formulation.cognitivePatternLabels,
          client.formulation.behavioralPatternLabels,
          latestSession?.extracted.emotions[0] ?? client.formulation.maintainingCycle.emotion,
          latestSession?.extracted.triggers[latestSession.extracted.triggers.length - 1] ?? client.formulation.maintainingCycle.trigger,
        )
      : client.formulation.maintainingCycle
  return {
    formulation: {
      ...client.formulation,
      patternMap: { ...client.formulation.patternMap, emotion: emotionSummary },
      emotionalPatterns,
      cognitivePatterns,
      behavioralPatterns,
      relationalPatterns,
      maintainingCycle,
      theoreticalFrameworks: frameworks,
    },
    casePresentation: {
      ...client.casePresentation,
      emotionalPresentation: emotionSummary,
      presentingConcerns,
      keyFindings,
    },
    treatmentPlan: { ...client.treatmentPlan, goals: flaggedGoals },
    treatmentReview: { ...client.treatmentReview, domains: progressDomains },
  }
}

// Flags goals that no longer clearly map to current themes/patterns for
// clinician review, rather than silently carrying them forward or dropping them.
const STOPWORDS = new Set([
  'that', 'this', 'with', 'from', 'have', 'been', 'about', 'into', 'their', 'they',
  'them', 'when', 'what', 'where', 'while', 'without', 'toward', 'towards', 'least', 'more',
  'most', 'some', 'than', 'then', 'were', 'will', 'each', 'other', 'over', 'under', 'such',
])

function significantWords(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((w) => w.length > 3 && !STOPWORDS.has(w)),
  )
}

// Flags goals that no longer clearly connect to the accumulated clinical
// picture. Deliberately forgiving (word-level overlap against a wide pool of
// narrative text, not exact theme-label matches) — a goal phrased in
// different words than the theme dictionary's canonical labels is still
// relevant, and false "stale" flags on an active, improving goal are more
// damaging than missing a genuinely stale one.
export function flagStaleGoals(goals: TreatmentGoal[], currentThemes: string[], allPatternLabels: string[], contextText: string): TreatmentGoal[] {
  const contextWords = significantWords(`${currentThemes.join(' ')} ${allPatternLabels.join(' ')} ${contextText}`)
  return goals.map((g) => {
    if (g.status === 'met' || g.status === 'on_hold' || g.status === 'needs_revision') {
      return { ...g, flaggedForReview: false, flagReason: '' }
    }
    if (contextWords.size === 0) return g
    const goalWords = significantWords(g.text)
    const stillRelevant = goalWords.size === 0 || [...goalWords].some((w) => contextWords.has(w))
    if (!stillRelevant) {
      return {
        ...g,
        flaggedForReview: true,
        flagReason: 'This goal no longer clearly connects to current themes, patterns, or the treatment rationale — consider reviewing whether it is still a priority.',
      }
    }
    return { ...g, flaggedForReview: false, flagReason: '' }
  })
}

export function draftNextSessionBrief(client: Client): string {
  const themes = client.themes.slice(0, 4)
  const gapNote = client.formulation.gaps ? ` Consider addressing the noted formulation gap: ${client.formulation.gaps}.` : ''
  const lastSession = client.sessions[client.sessions.length - 1]
  const responseNote = lastSession?.response ? ` Last session's response/change: "${truncate(lastSession.response, 140)}".` : ''
  return `Consider exploring further: ${themes.join(', ') || 'no recurring themes identified yet'}.${responseNote}${gapNote} This may warrant exploration next session — evidence suggests it, but clinical judgment should confirm priority.`
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n) + '…' : s
}

// Step 5 — draft candidate supervision questions in response to a session
export function draftSupervisionQuestions(client: Client, session: Session, sig?: SignificanceResult): SupervisionQuestion[] {
  const drafts: string[] = []
  if (session.longitudinalImpact.expanded.length) {
    drafts.push(`New themes emerged this session (${session.longitudinalImpact.expanded.join(', ')}) — how might these reshape the working formulation?`)
  }
  if (session.extracted.interventions.length === 0 && session.rawText.length > 0) {
    drafts.push('No clear intervention was identifiable in this session note — was this primarily exploratory, and is that the right call clinically?')
  }
  if (client.sessions.length >= 3 && client.formulation.alternativeFormulation.alternative.trim() === '') {
    drafts.push('What alternative formulation could account for the same presentation, and what evidence would distinguish it from the current working hypothesis?')
  }
  if (session.extracted.risks.length) {
    drafts.push('Risk-related language was flagged automatically this session — what is the current safety picture and does it need explicit review in supervision?')
  }
  if (sig && (sig.newCognitivePatterns.length || sig.newBehavioralPatterns.length || sig.newRelationalPatterns.length)) {
    drafts.push('New pattern evidence emerged this session — does this warrant revisiting the treatment goals or the maintaining cycle?')
  }
  if (session.extracted.diagnosticConsiderations.length) {
    drafts.push('Session content raised a diagnostic consideration for further assessment — is this worth discussing in supervision?')
  }
  return drafts.map((q) => ({
    id: uuid(),
    question: q,
    createdAt: new Date().toISOString(),
    fromSessionId: session.id,
    resolved: false,
  }))
}

// Documentation gap scan — always framed as an automated prompt, never fact.
export function scanDocumentationGaps(client: Client): DocumentationGap[] {
  const gaps: DocumentationGap[] = []
  const allRisk = client.sessions.flatMap((s) => s.extracted.risks)
  if (client.sessions.length > 0 && allRisk.length === 0) {
    gaps.push(mkGap('Risk/Safety', 'No risk/safety information appears in extracted session content — confirm this reflects an actual clinical determination and not an omission.'))
  }
  if (client.sessions.length >= 2) {
    const anyProgress = client.sessions.some((s) => s.extracted.response.some((r) => r.length > 0))
    if (!anyProgress) {
      gaps.push(mkGap('Progress Evidence', 'Progress/response evidence appears limited across recorded sessions — consider documenting client response more explicitly.'))
    }
  }
  if (!client.background || client.background.trim().length < 40) {
    gaps.push(mkGap('Background History', 'Background history appears incomplete or brief — consider expanding relevant history.'))
  }
  const unmeasurable = client.treatmentPlan.goals.filter((g) => !/\d|reduce|increase|by |per week|session/i.test(g.text))
  if (client.treatmentPlan.goals.length > 0 && unmeasurable.length === client.treatmentPlan.goals.length) {
    gaps.push(mkGap('Treatment Goal', 'Treatment goals may not be stated in measurable terms — consider adding frequency, duration, or magnitude language.'))
  }
  const diagnosticFlags = Array.from(new Set(client.sessions.flatMap((s) => s.extracted.diagnosticConsiderations)))
  diagnosticFlags.forEach((flag) => {
    gaps.push(
      mkGap(
        'Diagnostic Consideration',
        `${flag} — diagnostic consideration for further assessment, based on session-note language. This is an automated prompt only; diagnostic decisions remain the clinician's responsibility.`,
      ),
    )
  })
  if (!client.formulation.workingSynthesis || client.formulation.workingSynthesis.trim().length < 40) {
    gaps.push(mkGap('Diagnosis/Formulation', 'Working synthesis appears minimal relative to session count — formulation may be insufficiently supported.'))
  }
  return gaps
}

function mkGap(category: string, description: string): DocumentationGap {
  return { id: uuid(), category, description, createdAt: new Date().toISOString(), dismissed: false }
}


// ---------------------------------------------------------------------------
// Suggestion bundling — packages the rule-based drafts above into a
// PendingSuggestion for clinician review, rather than writing directly to
// the client's live formulation/treatment plan/case presentation/progress
// review. This is the offline/no-API-key path; see src/clinical/ai.ts for
// the live-Claude equivalent. Both produce the same PendingSuggestion shape
// so the review UI doesn't need to know which engine produced a draft.
// ---------------------------------------------------------------------------

export function buildRuleBasedSuggestion(client: Client, session: Session): PendingSuggestion {
  const sig = evaluateSessionSignificance(client, session)

  const base: PendingSuggestion = {
    id: uuid(),
    sessionId: session.id,
    sessionNumber: session.sessionNumber,
    createdAt: new Date().toISOString(),
    source: 'rules',
    status: 'ready',
    riskFlagged: session.extracted.risks.length > 0,
    riskNote: session.extracted.risks.length
      ? 'Risk-related language was flagged automatically from this session note. This is an automated keyword flag, not a risk determination — verify against source documentation and follow standard risk/safety protocol.'
      : '',
    changeHighlights: sig.reasons,
  }

  if (!sig.significant) {
    return {
      ...base,
      summary:
        'This session appears consistent with the existing clinical picture — no changes to the formulation, treatment plan, case presentation, or progress review are proposed. The raw note and extracted themes below have still been saved to the session timeline.',
    }
  }

  const updatedCognitive = mergeLabels(client.formulation.cognitivePatternLabels, session.extracted.cognitiveDistortions)
  const updatedBehavioral = mergeLabels(client.formulation.behavioralPatternLabels, session.extracted.behavioralPatterns)
  const updatedRelational = mergeLabels(client.formulation.relationalPatternLabels, session.extracted.relationalPatterns)
  const nextSynthesis = draftIntegratedSynthesis(client, session, sig)
  const evolutionFields = buildClinicalEvolutionFields(session, sig, nextSynthesis)

  // Compute the rest of the pattern narratives / frameworks / progress domains
  // as if this session were already part of the record, without mutating the
  // live client — computeClientAggregates is a pure function of its input.
  // `client.sessions` already includes `session` as its last entry — the
  // store commits the new session to state before calling this function.
  // Do NOT append it again here, or per-session tallies (frameworks,
  // progress domains, emotion counts) double-count the triggering session.
  const hypothetical: Client = {
    ...client,
    formulation: {
      ...client.formulation,
      cognitivePatternLabels: updatedCognitive,
      behavioralPatternLabels: updatedBehavioral,
      relationalPatternLabels: updatedRelational,
      workingSynthesis: nextSynthesis,
    },
  }
  const aggregates = computeClientAggregates(hypothetical)
  const nextCurrentPicture = draftCurrentClinicalPicture(client, session, sig)

  const suggestion: PendingSuggestion = {
    ...base,
    summary: `Session ${session.sessionNumber} introduced new evidence: ${sig.reasons.join('; ')}. Proposed updates below are drafted from this evidence — review each before it becomes part of the client's record.`,
    formulation: {
      status: 'pending',
      draft: aggregates.formulation,
      reasonForChange: evolutionFields.reasonForChange,
      newEvidence: evolutionFields.newEvidence,
    },
    casePresentation: {
      status: 'pending',
      draft: { ...aggregates.casePresentation, currentClinicalPicture: nextCurrentPicture },
      reasonForChange: sig.reasons.join('; '),
      newEvidence: evolutionFields.newEvidence,
    },
  }

  const goalsChanged = JSON.stringify(aggregates.treatmentPlan.goals) !== JSON.stringify(client.treatmentPlan.goals)
  if (goalsChanged) {
    suggestion.treatmentPlan = {
      status: 'pending',
      draft: aggregates.treatmentPlan,
      reasonForChange: 'One or more goals no longer clearly connect to current themes, patterns, or the treatment rationale and were flagged for review.',
      newEvidence: evolutionFields.newEvidence,
    }
  }

  const domainsChanged = JSON.stringify(aggregates.treatmentReview.domains) !== JSON.stringify(client.treatmentReview.domains)
  if (domainsChanged || sig.progressSignal) {
    suggestion.treatmentReview = {
      status: 'pending',
      draft: { ...client.treatmentReview, ...aggregates.treatmentReview, lastUpdated: new Date().toISOString() },
      reasonForChange: sig.progressSignal
        ? `Session language suggests ${sig.progressSignal}.`
        : 'Progress domain evidence updated from this session.',
      newEvidence: evolutionFields.newEvidence,
    }
  }

  return suggestion
}
