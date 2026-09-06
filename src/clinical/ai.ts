// Live Claude analysis engine.
//
// This is the optional, opt-in counterpart to clinical/engine.ts's rule-based
// drafting. When AI Assist is enabled and an API key is configured, a new
// session is sent — together with the client's already-de-identified history
// and current clinical documents — directly from the browser to Anthropic's
// Messages API, and the response is turned into the same PendingSuggestion
// shape the rule-based engine produces. Nothing here writes to the client's
// live record; see state/store.ts's approveSuggestionField for the only path
// that does that.
//
// Privacy: the API key is stored only in this browser (localStorage, via the
// Zustand persist middleware) and is sent only to https://api.anthropic.com.
// It is never included in workspace export/import. The only data sent in a
// request is whatever already lives in this client's profile/sessions — the
// same de-identified content already visible in the app. It is the
// clinician's responsibility to keep session notes de-identified before
// pasting them in; see utils/phi.ts for a client-side pre-send screen.

import { v4 as uuid } from 'uuid'
import type {
  AiSettings,
  ChangeClassification,
  Client,
  GoalStatus,
  LongitudinalImpact,
  PendingSuggestion,
  SourceDiscrepancy,
  ProgressDomainEntry,
  ProgressDomainName,
  ProgressTrend,
  Session,
  TreatmentGoal,
} from '../data/types'
import { PROGRESS_DOMAINS } from '../data/types'
import { computeKeyFindings, computePresentingConcerns, computeProgressDomains } from './engine'

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages'
const ANTHROPIC_VERSION = '2023-06-01'

const GOAL_STATUS_VALUES: GoalStatus[] = [
  'not_started',
  'active',
  'improving',
  'partially_met',
  'met',
  'needs_revision',
  'on_hold',
]
const TREND_VALUES: ProgressTrend[] = ['improving', 'stable', 'worsening', 'fluctuating', 'insufficient_evidence']
const CLASSIFICATION_VALUES: ChangeClassification[] = ['improvement', 'maintenance', 'deterioration', 'no_change', 'insufficient_evidence']

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are a clinical documentation assistant supporting a graduate practicum trainee. You help the trainee track how their understanding of a client evolves across sessions. You are not a licensed clinician and your output is never a clinical determination — it is a draft for the trainee's own review and their supervisor's oversight.

Ground rules:
- Work only from the de-identified material provided. Never invent facts, history, or details not evidenced in the text.
- Distinguish clearly between what a session directly states and what you are inferring. Inferences should be phrased as hypotheses ("may suggest", "is consistent with"), not certainties.
- Do not make risk or safety determinations. If risk-related language appears (self-harm, harm to others, suicidality, abuse, safety), set riskFlagged true and describe only what was flagged in the text — never assess risk level or recommend a course of action.
- If anything in the provided text looks like it might be real identifying information (a proper name that isn't a "Client X" label, a phone number, email, street address, employer name, specific date of birth, or similar), say so in deidentificationConcern — do not repeat the identifying detail back, just flag that it appeared.
- Only propose a change to a clinical document (formulation, treatment plan, case presentation, or progress review) when the new session actually introduces evidence that would change it. If the session is consistent with the existing record, set "significant": false and leave the corresponding fields null — do not manufacture change for its own sake.
- Always populate extractedInterventions, extractedResponse, and extractedPlan — regardless of "significant". These are a mechanical breakdown of the NEW session's raw note (not prior sessions) into what the clinician did (interventions), what the client reported or how they responded (response), and what was planned or assigned for next time (plan) — close paraphrase or direct extraction, not new interpretation. If the raw note already came with separate Interventions/Client response/Plan text (shown below), and that text already looks reasonably complete, you may leave these three fields as empty strings rather than duplicating it — only fill them in when they add real value over what's already there.
- When you do propose a change, write reasonForChange and newEvidence fields that ground the change in specific content from the new session.
- SOURCE HIERARCHY. Sessions may carry a SESSION NOTE alone, or a SESSION NOTE plus a RAW TRANSCRIPT. Keep them distinct at all times: the note is what the clinician chose to document, the transcript is what was actually said. Never present an inference of yours as something the client said, and never quote the transcript as though it were the clinician's note.
- When a transcript IS present, treat it as a deeper evidence layer rather than something to summarize. Look for clinically meaningful material that did not reach the note: minimization of the client's own needs, self-blame language, what the client became activated by, in-session shifts in thinking, and which interventions the client responded to. List these in "transcriptOnlyEvidence".
- When a transcript is present and appears to differ from the note, do NOT silently prefer one. Add an entry to "sourceDiscrepancies" describing the topic, what the note says, what the transcript suggests, and why it matters. The clinician decides the reading.
- When no transcript is present, run exactly the same longitudinal analysis from the note alone and leave "transcriptOnlyEvidence" and "sourceDiscrepancies" as empty arrays. A missing transcript must never stop the case from being updated.
- Classify this session's effect on existing understanding in "longitudinalImpact", using these buckets: confirms, strengthens, weakens, expands, complicates, contradicts, introduces, resolves, leavesUncertain. A bucket may be empty. Populating them is how the record shows its reasoning over time.
- Respond with ONLY a single valid JSON object matching the schema below. No markdown code fences, no prose before or after.

JSON schema (all fields required; use null/empty string/false/[] when there's no basis for a value):
{
  "significant": boolean,
  "extractedInterventions": string,
  "extractedResponse": string,
  "extractedPlan": string,
  "summary": string,
  "changeHighlights": string[],
  "riskFlagged": boolean,
  "riskNote": string,
  "deidentificationConcern": string,
  "transcriptOnlyEvidence": string[],
  "sourceDiscrepancies": [{ "topic": string, "inNotes": string, "inTranscript": string, "note": string }],
  "longitudinalImpact": {
    "confirms": string[], "strengthens": string[], "weakens": string[], "expands": string[],
    "complicates": string[], "contradicts": string[], "introduces": string[],
    "resolves": string[], "leavesUncertain": string[]
  },
  "formulation": null | {
    "presenting": string, "predisposing": string, "precipitating": string, "perpetuating": string, "protective": string,
    "workingSynthesis": string,
    "cognitivePatterns": string, "emotionalPatterns": string, "behavioralPatterns": string, "relationalPatterns": string,
    "maintainingCycle": { "trigger": string, "thought": string, "emotion": string, "behavior": string, "consequence": string, "reinforcement": string },
    "alternativeFormulation": { "alternative": string, "distinguishingEvidence": string },
    "gaps": string,
    "reasonForChange": string,
    "newEvidence": string
  },
  "treatmentPlan": null | {
    "presentingFocus": string, "rationale": string, "interventionStrategy": string, "currentPlan": string, "nextClinicalFocus": string,
    "goalUpdates": Array<{ "matchExistingGoal": string, "text": string, "status": ${JSON.stringify(GOAL_STATUS_VALUES)}[number], "objectives": string, "interventions": string, "evidence": string }>,
    "reasonForChange": string,
    "newEvidence": string
  },
  "casePresentation": null | {
    "background": string, "currentClinicalPicture": string, "formulationSummary": string, "emotionalPresentation": string,
    "interventionsAndPlans": string, "reasonForPresentation": string, "reasonForChange": string
  },
  "treatmentReview": null | {
    "whatIsChanging": string, "responseToIntervention": string, "progressToward": string,
    "progressClassification": ${JSON.stringify(CLASSIFICATION_VALUES)}[number],
    "planFit": string, "emergingPriorities": string,
    "domainUpdates": Array<{ "domain": ${JSON.stringify(PROGRESS_DOMAINS)}[number], "trend": ${JSON.stringify(TREND_VALUES)}[number], "narrative": string }>
  },
  "newSupervisionQuestions": string[],
  "newDocumentationGaps": Array<{ "category": string, "description": string }>
}

For "goalUpdates.matchExistingGoal": copy the exact text of the existing goal you are updating, or leave it "" if this is a new goal to add. Only include goals that are new or that should change — omit goals that are unaffected.
For "domainUpdates": only include domains where this session provides new evidence — omit domains with no new signal.`

function formatSession(s: Session): string {
  const lines = [
    `Session ${s.sessionNumber} (${s.date}, ${s.duration}h):`,
    `SESSION NOTE (the clinician's documented summary): ${s.rawText || '(none)'}`,
  ]
  // The transcript is a distinct source, not extra note text. Labelling it
  // explicitly is what lets the model reason about the two separately and
  // notice where they diverge.
  if (s.transcript?.trim()) {
    lines.push(`RAW TRANSCRIPT (verbatim, what was actually said): ${s.transcript}`)
  } else {
    lines.push('RAW TRANSCRIPT: (not provided for this session)')
  }
  lines.push(
    `Interventions: ${s.interventions || '(none)'}`,
    `Client response: ${s.response || '(none)'}`,
    `Plan: ${s.plan || '(none)'}`,
  )
  return lines.join('\n')
}

export function buildAnalysisPrompt(client: Client, newSession: Session): { system: string; user: string } {
  const priorSessions = client.sessions.filter((s) => s.id !== newSession.id)

  const clientProfile = {
    label: client.label,
    age: client.age,
    diagnosis: client.diagnosis,
    status: client.status,
    presentingConcern: client.presentingConcern,
    demographics: client.demographics,
    background: client.background,
    themes: client.themes,
  }

  const currentFormulation = { ...client.formulation }
  const currentTreatmentPlan = {
    presentingFocus: client.treatmentPlan.presentingFocus,
    rationale: client.treatmentPlan.rationale,
    interventionStrategy: client.treatmentPlan.interventionStrategy,
    currentPlan: client.treatmentPlan.currentPlan,
    nextClinicalFocus: client.treatmentPlan.nextClinicalFocus,
    goals: client.treatmentPlan.goals.map((g) => ({ text: g.text, status: g.status, objectives: g.objectives, interventions: g.interventions, evidence: g.evidence })),
  }
  const currentCasePresentation = {
    background: client.casePresentation.background,
    currentClinicalPicture: client.casePresentation.currentClinicalPicture,
    formulationSummary: client.casePresentation.formulationSummary,
    emotionalPresentation: client.casePresentation.emotionalPresentation,
    interventionsAndPlans: client.casePresentation.interventionsAndPlans,
    reasonForPresentation: client.casePresentation.reasonForPresentation,
  }
  const currentTreatmentReview = {
    whatIsChanging: client.treatmentReview.whatIsChanging,
    responseToIntervention: client.treatmentReview.responseToIntervention,
    progressToward: client.treatmentReview.progressToward,
    progressClassification: client.treatmentReview.progressClassification,
    planFit: client.treatmentReview.planFit,
    emergingPriorities: client.treatmentReview.emergingPriorities,
    domains: client.treatmentReview.domains,
  }

  const user = `De-identified client profile:
${JSON.stringify(clientProfile, null, 2)}

Current formulation:
${JSON.stringify(currentFormulation, null, 2)}

Current treatment plan:
${JSON.stringify(currentTreatmentPlan, null, 2)}

Current case presentation:
${JSON.stringify(currentCasePresentation, null, 2)}

Current progress review:
${JSON.stringify(currentTreatmentReview, null, 2)}

Prior sessions (oldest first), ${priorSessions.length} total:
${priorSessions.length ? priorSessions.map(formatSession).join('\n\n') : '(none — this is the first session)'}

NEW session to analyze against the above:
${formatSession(newSession)}

Compare the new session against the client's history and current clinical documents above, and return the JSON object described in your instructions.`

  return { system: SYSTEM_PROMPT, user }
}

// ---------------------------------------------------------------------------
// API call
// ---------------------------------------------------------------------------

export class AiRequestError extends Error {}

async function callClaude(settings: AiSettings, system: string, user: string, maxTokens = 4096): Promise<string> {
  if (!settings.apiKey.trim()) throw new AiRequestError('No Anthropic API key is configured. Add one in AI Assist settings.')
  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': settings.apiKey.trim(),
      'anthropic-version': ANTHROPIC_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: settings.model.trim() || 'claude-sonnet-4-5-20250929',
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  })

  if (!res.ok) {
    let detail = ''
    try {
      const body = await res.json()
      detail = body?.error?.message || JSON.stringify(body)
    } catch {
      detail = await res.text().catch(() => '')
    }
    if (res.status === 401) throw new AiRequestError('Anthropic rejected the API key (401). Check the key in AI Assist settings.')
    if (res.status === 429) throw new AiRequestError('Rate limited by Anthropic (429). Wait a moment and retry.')
    throw new AiRequestError(`Anthropic API error (${res.status}): ${detail || 'no further detail'}`)
  }

  const data = await res.json()
  const text = Array.isArray(data?.content) ? data.content.map((b: { type?: string; text?: string }) => (b?.type === 'text' ? b.text ?? '' : '')).join('') : ''
  if (!text.trim()) throw new AiRequestError('Anthropic returned an empty response.')
  return text
}

export async function testAiConnection(settings: AiSettings): Promise<{ ok: boolean; message: string }> {
  try {
    const text = await callClaude(
      settings,
      'Reply with only the single word: ok',
      'Reply with only the word "ok".',
      16,
    )
    if (text.toLowerCase().includes('ok')) return { ok: true, message: 'Connected successfully.' }
    return { ok: true, message: `Connected, but got an unexpected reply: "${text.trim().slice(0, 60)}"` }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : 'Unknown error.' }
  }
}

// ---------------------------------------------------------------------------
// Response parsing — defensive by design. LLM output is untrusted input:
// every field is individually validated and falls back to a safe default
// rather than throwing, so a partially-malformed response still produces a
// usable (if partial) suggestion instead of an opaque error.
// ---------------------------------------------------------------------------

function extractJson(raw: string): unknown {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1] : trimmed
  try {
    return JSON.parse(candidate)
  } catch {
    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start >= 0 && end > start) {
      return JSON.parse(candidate.slice(start, end + 1))
    }
    throw new AiRequestError('Could not parse a JSON object from the model response.')
  }
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}
function bool(v: unknown): boolean {
  return v === true
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback
}

function mergeGoalUpdates(existingGoals: TreatmentGoal[], rawUpdates: unknown): TreatmentGoal[] {
  const updates = Array.isArray(rawUpdates) ? rawUpdates : []
  let goals = [...existingGoals]
  for (const raw of updates) {
    if (!raw || typeof raw !== 'object') continue
    const u = raw as Record<string, unknown>
    const text = str(u.text)
    if (!text.trim()) continue
    const matchText = str(u.matchExistingGoal).trim().toLowerCase()
    const existingIdx = matchText ? goals.findIndex((g) => g.text.trim().toLowerCase() === matchText) : -1
    const patch: Partial<TreatmentGoal> = {
      text,
      status: oneOf(u.status, GOAL_STATUS_VALUES, existingIdx >= 0 ? goals[existingIdx].status : 'active'),
      objectives: str(u.objectives),
      interventions: str(u.interventions),
      evidence: str(u.evidence),
      flaggedForReview: false,
      flagReason: '',
    }
    if (existingIdx >= 0) {
      goals[existingIdx] = { ...goals[existingIdx], ...patch }
    } else {
      goals = [...goals, { id: uuid(), text, objectives: patch.objectives!, interventions: patch.interventions!, evidence: patch.evidence!, status: patch.status!, flaggedForReview: false, flagReason: '' }]
    }
  }
  return goals
}

function mergeDomainUpdates(client: Client, rawUpdates: unknown): ProgressDomainEntry[] {
  const base = client.treatmentReview.domains.length ? client.treatmentReview.domains : computeProgressDomains(client.sessions)
  const byDomain = new Map<ProgressDomainName, ProgressDomainEntry>(base.map((d) => [d.domain, d]))
  const updates = Array.isArray(rawUpdates) ? rawUpdates : []
  for (const raw of updates) {
    if (!raw || typeof raw !== 'object') continue
    const u = raw as Record<string, unknown>
    const domain = oneOf(u.domain, PROGRESS_DOMAINS, undefined as unknown as ProgressDomainName)
    if (!domain) continue
    byDomain.set(domain, {
      domain,
      trend: oneOf(u.trend, TREND_VALUES, 'insufficient_evidence'),
      narrative: str(u.narrative, byDomain.get(domain)?.narrative ?? ''),
    })
  }
  return PROGRESS_DOMAINS.map((d) => byDomain.get(d) ?? { domain: d, trend: 'insufficient_evidence', narrative: 'No session-note language clearly relevant to this domain yet.' })
}

export function parseAiResponseIntoSuggestion(rawText: string, client: Client, session: Session): PendingSuggestion {
  const parsed = extractJson(rawText)
  if (!parsed || typeof parsed !== 'object') throw new AiRequestError('Model response was not a JSON object.')
  const r = parsed as Record<string, unknown>

  const significant = bool(r.significant)
  const deidentificationConcern = str(r.deidentificationConcern)

  const suggestion: PendingSuggestion = {
    id: uuid(),
    sessionId: session.id,
    sessionNumber: session.sessionNumber,
    createdAt: new Date().toISOString(),
    source: 'ai',
    status: 'ready',
    summary: str(r.summary) || (significant ? 'The model proposed updates for review below.' : 'No significant change identified from this session.'),
    changeHighlights: strArr(r.changeHighlights),
    riskFlagged: bool(r.riskFlagged),
    riskNote: str(r.riskNote),
  }

  if (deidentificationConcern.trim()) {
    suggestion.changeHighlights = [`De-identification concern flagged by the model: ${deidentificationConcern}`, ...(suggestion.changeHighlights ?? [])]
  }

  if (!significant) return suggestion

  const f = r.formulation
  if (f && typeof f === 'object') {
    const fo = f as Record<string, unknown>
    const mc = (fo.maintainingCycle && typeof fo.maintainingCycle === 'object' ? fo.maintainingCycle : {}) as Record<string, unknown>
    const af = (fo.alternativeFormulation && typeof fo.alternativeFormulation === 'object' ? fo.alternativeFormulation : {}) as Record<string, unknown>
    suggestion.formulation = {
      status: 'pending',
      reasonForChange: str(fo.reasonForChange),
      newEvidence: str(fo.newEvidence),
      draft: {
        ...client.formulation,
        presenting: str(fo.presenting, client.formulation.presenting),
        predisposing: str(fo.predisposing, client.formulation.predisposing),
        precipitating: str(fo.precipitating, client.formulation.precipitating),
        perpetuating: str(fo.perpetuating, client.formulation.perpetuating),
        protective: str(fo.protective, client.formulation.protective),
        workingSynthesis: str(fo.workingSynthesis, client.formulation.workingSynthesis),
        cognitivePatterns: str(fo.cognitivePatterns, client.formulation.cognitivePatterns),
        emotionalPatterns: str(fo.emotionalPatterns, client.formulation.emotionalPatterns),
        behavioralPatterns: str(fo.behavioralPatterns, client.formulation.behavioralPatterns),
        relationalPatterns: str(fo.relationalPatterns, client.formulation.relationalPatterns),
        maintainingCycle: {
          trigger: str(mc.trigger, client.formulation.maintainingCycle.trigger),
          thought: str(mc.thought, client.formulation.maintainingCycle.thought),
          emotion: str(mc.emotion, client.formulation.maintainingCycle.emotion),
          behavior: str(mc.behavior, client.formulation.maintainingCycle.behavior),
          consequence: str(mc.consequence, client.formulation.maintainingCycle.consequence),
          reinforcement: str(mc.reinforcement, client.formulation.maintainingCycle.reinforcement),
        },
        alternativeFormulation: {
          alternative: str(af.alternative, client.formulation.alternativeFormulation.alternative),
          distinguishingEvidence: str(af.distinguishingEvidence, client.formulation.alternativeFormulation.distinguishingEvidence),
        },
        gaps: str(fo.gaps, client.formulation.gaps),
      },
    }
  }

  const tp = r.treatmentPlan
  if (tp && typeof tp === 'object') {
    const tpo = tp as Record<string, unknown>
    suggestion.treatmentPlan = {
      status: 'pending',
      reasonForChange: str(tpo.reasonForChange),
      newEvidence: str(tpo.newEvidence),
      draft: {
        ...client.treatmentPlan,
        presentingFocus: str(tpo.presentingFocus, client.treatmentPlan.presentingFocus),
        rationale: str(tpo.rationale, client.treatmentPlan.rationale),
        interventionStrategy: str(tpo.interventionStrategy, client.treatmentPlan.interventionStrategy),
        currentPlan: str(tpo.currentPlan, client.treatmentPlan.currentPlan),
        nextClinicalFocus: str(tpo.nextClinicalFocus, client.treatmentPlan.nextClinicalFocus),
        goals: mergeGoalUpdates(client.treatmentPlan.goals, tpo.goalUpdates),
      },
    }
  }

  const cp = r.casePresentation
  if (cp && typeof cp === 'object') {
    const cpo = cp as Record<string, unknown>
    suggestion.casePresentation = {
      status: 'pending',
      reasonForChange: str(cpo.reasonForChange),
      newEvidence: suggestion.formulation?.newEvidence ?? '',
      draft: {
        ...client.casePresentation,
        background: str(cpo.background, client.casePresentation.background),
        currentClinicalPicture: str(cpo.currentClinicalPicture, client.casePresentation.currentClinicalPicture),
        formulationSummary: str(cpo.formulationSummary, client.casePresentation.formulationSummary),
        emotionalPresentation: str(cpo.emotionalPresentation, client.casePresentation.emotionalPresentation),
        interventionsAndPlans: str(cpo.interventionsAndPlans, client.casePresentation.interventionsAndPlans),
        reasonForPresentation: str(cpo.reasonForPresentation, client.casePresentation.reasonForPresentation),
        // `client.sessions` already includes `session` as its last entry (the
        // store commits the new session before this analysis runs) — pass
        // `client` straight through rather than appending `session` again.
        presentingConcerns: computePresentingConcerns(client),
        keyFindings: computeKeyFindings(client),
      },
    }
  }

  const tr = r.treatmentReview
  if (tr && typeof tr === 'object') {
    const tro = tr as Record<string, unknown>
    suggestion.treatmentReview = {
      status: 'pending',
      reasonForChange: 'Progress review updated from this session.',
      newEvidence: suggestion.formulation?.newEvidence ?? '',
      draft: {
        ...client.treatmentReview,
        whatIsChanging: str(tro.whatIsChanging, client.treatmentReview.whatIsChanging),
        responseToIntervention: str(tro.responseToIntervention, client.treatmentReview.responseToIntervention),
        progressToward: str(tro.progressToward, client.treatmentReview.progressToward),
        progressClassification: oneOf(tro.progressClassification, CLASSIFICATION_VALUES, client.treatmentReview.progressClassification),
        planFit: str(tro.planFit, client.treatmentReview.planFit),
        emergingPriorities: str(tro.emergingPriorities, client.treatmentReview.emergingPriorities),
        domains: mergeDomainUpdates(client, tro.domainUpdates),
        lastUpdated: new Date().toISOString(),
      },
    }
  }

  return suggestion
}

export function parseAiSupervisionAndGaps(rawText: string): { questions: string[]; gaps: Array<{ category: string; description: string }> } {
  try {
    const parsed = extractJson(rawText) as Record<string, unknown>
    const questions = strArr(parsed.newSupervisionQuestions)
    const gapsRaw = Array.isArray(parsed.newDocumentationGaps) ? parsed.newDocumentationGaps : []
    const gaps = gapsRaw
      .filter((g): g is Record<string, unknown> => !!g && typeof g === 'object')
      .map((g) => ({ category: str(g.category, 'General'), description: str(g.description) }))
      .filter((g) => g.description.trim().length > 0)
    return { questions, gaps }
  } catch {
    return { questions: [], gaps: [] }
  }
}

// A mechanical transcription of the raw note, not a clinical conclusion —
// unlike everything in PendingSuggestion, this is safe to apply to the
// session directly rather than routing through suggestion review.
export function parseAiExtractedSections(rawText: string): { interventions: string; response: string; plan: string } {
  try {
    const parsed = extractJson(rawText) as Record<string, unknown>
    return {
      interventions: str(parsed.extractedInterventions),
      response: str(parsed.extractedResponse),
      plan: str(parsed.extractedPlan),
    }
  } catch {
    return { interventions: '', response: '', plan: '' }
  }
}

/**
 * The two-source findings and the nine-bucket impact classification.
 * Returned separately from the suggestion because these describe the SESSION's
 * evidence, not a proposed edit to a clinical document — they are recorded
 * against the session itself rather than going through suggestion review.
 */
export function parseAiSourceAnalysis(rawText: string): {
  transcriptOnlyEvidence: string[]
  sourceDiscrepancies: SourceDiscrepancy[]
  longitudinalImpact: LongitudinalImpact | null
} {
  const empty = { transcriptOnlyEvidence: [], sourceDiscrepancies: [], longitudinalImpact: null }
  try {
    const parsed = extractJson(rawText) as Record<string, unknown>
    if (!parsed) return empty

    const discrepancies: SourceDiscrepancy[] = Array.isArray(parsed.sourceDiscrepancies)
      ? parsed.sourceDiscrepancies
          .filter((d): d is Record<string, unknown> => typeof d === 'object' && d !== null)
          .map((d) => ({
            id: uuid(),
            topic: str(d.topic),
            inNotes: str(d.inNotes),
            inTranscript: str(d.inTranscript),
            note: str(d.note),
            reviewed: false,
          }))
          .filter((d) => d.topic && (d.inNotes || d.inTranscript))
      : []

    const raw = parsed.longitudinalImpact as Record<string, unknown> | undefined
    const longitudinalImpact: LongitudinalImpact | null = raw
      ? {
          confirmed: strArr(raw.confirms),
          strengthened: strArr(raw.strengthens),
          weakened: strArr(raw.weakens),
          expanded: strArr(raw.expands),
          complicated: strArr(raw.complicates),
          contradicted: strArr(raw.contradicts),
          resolved: strArr(raw.resolves),
          uncertain: strArr(raw.leavesUncertain),
          changed: [...strArr(raw.introduces), ...strArr(raw.expands)],
        }
      : null

    return {
      transcriptOnlyEvidence: strArr(parsed.transcriptOnlyEvidence),
      sourceDiscrepancies: discrepancies,
      longitudinalImpact,
    }
  } catch {
    return empty
  }
}

export interface AiAnalysisResult {
  suggestion: PendingSuggestion
  supervisionQuestions: string[]
  documentationGaps: Array<{ category: string; description: string }>
  extractedSections: { interventions: string; response: string; plan: string }
  sourceAnalysis: ReturnType<typeof parseAiSourceAnalysis>
}

export async function runAiSessionAnalysis(client: Client, session: Session, settings: AiSettings): Promise<AiAnalysisResult> {
  try {
    const { system, user } = buildAnalysisPrompt(client, session)
    const rawText = await callClaude(settings, system, user)
    const suggestion = parseAiResponseIntoSuggestion(rawText, client, session)
    const { questions, gaps } = parseAiSupervisionAndGaps(rawText)
    const extractedSections = parseAiExtractedSections(rawText)
    const sourceAnalysis = parseAiSourceAnalysis(rawText)
    return { suggestion, supervisionQuestions: questions, documentationGaps: gaps, extractedSections, sourceAnalysis }
  } catch (err) {
    return {
      suggestion: {
        id: uuid(),
        sessionId: session.id,
        sessionNumber: session.sessionNumber,
        createdAt: new Date().toISOString(),
        source: 'ai',
        status: 'error',
        error: err instanceof Error ? err.message : 'Unknown error analyzing this session.',
      },
      supervisionQuestions: [],
      documentationGaps: [],
      extractedSections: { interventions: '', response: '', plan: '' },
      sourceAnalysis: { transcriptOnlyEvidence: [], sourceDiscrepancies: [], longitudinalImpact: null },
    }
  }
}
