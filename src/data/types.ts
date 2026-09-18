// Core data model for ZNKSTR Practicum
// This shape is the persistence contract — keep additions backward compatible
// and bump PRACTICUM_DATA_VERSION when the shape changes meaningfully.

// The provenance ladder, weakest claim to strongest. Every clinical statement in
// the app is tagged with one, so an inference is never displayed as though the
// client had said it.
//   source     — words from the session note or transcript
//   extracted  — an observation mechanically identified in that source
//   synthesis  — what the accumulated evidence appears to mean
//   hypothesis — a possible reading that still needs clinical judgment
//   approved   — a conclusion the clinician has reviewed and accepted
export type EvidenceKind = 'source' | 'extracted' | 'synthesis' | 'hypothesis' | 'approved'

export type ClientStatus = 'Active' | 'On Hold' | 'Closed' | 'Intake'

export interface Extracted {
  symptoms: string[]
  emotions: string[]
  thoughts: string[]
  behaviors: string[]
  triggers: string[]
  coping: string[]
  relationships: string[]
  functioning: string[]
  interventions: string[]
  response: string[]
  goals: string[]
  risks: string[]
  strengths: string[]
  cognitiveDistortions: string[]
  behavioralPatterns: string[]
  relationalPatterns: string[]
  frameworkEvidence: string[]
  diagnosticConsiderations: string[]
}

// What a new session does to what we already believed. Each bucket holds the
// themes that moved in that direction, so a change can always be traced back to
// the specific evidence that caused it.
export interface LongitudinalImpact {
  confirmed: string[]    // seen before and seen again
  strengthened: string[] // recurring often enough to look like a stable pattern
  weakened: string[]     // previously established, absent this session
  expanded: string[]     // newly introduced this session
  complicated: string[]  // present, but alongside evidence pulling the other way
  contradicted: string[] // directly opposed by this session
  resolved: string[]     // absent long enough to look genuinely settled
  uncertain: string[]    // evidence points both ways; needs clinical judgment
  changed: string[]      // legacy roll-up, retained so older saved sessions still read
}

/** Every bucket except the legacy roll-up, for iterating in the UI. */
export const LONGITUDINAL_BUCKETS = [
  'confirmed', 'strengthened', 'weakened', 'expanded',
  'complicated', 'contradicted', 'resolved', 'uncertain',
] as const

export const LONGITUDINAL_BUCKET_LABELS: Record<string, string> = {
  confirmed: 'Confirms',
  strengthened: 'Strengthens',
  weakened: 'Weakens',
  expanded: 'Newly introduces',
  complicated: 'Complicates',
  contradicted: 'Contradicts',
  resolved: 'Resolves',
  uncertain: 'Leaves uncertain',
}

export function emptyLongitudinalImpact(): LongitudinalImpact {
  return {
    confirmed: [], strengthened: [], weakened: [], expanded: [],
    complicated: [], contradicted: [], resolved: [], uncertain: [], changed: [],
  }
}

// A place where the clinician's written note and the session transcript appear
// to say different things. Never resolved automatically: the two sources are
// shown side by side and the clinician decides which reading is right.
export interface SourceDiscrepancy {
  id: string
  topic: string          // what the two sources disagree about
  inNotes: string        // what the session note says
  inTranscript: string   // what the transcript suggests instead
  note: string           // why this was flagged
  reviewed: boolean
}

export interface Session {
  id: string
  sessionNumber: number
  date: string // ISO date
  duration: number // hours
  // The clinician's documented summary (SuperNotes). May be empty when the
  // session was entered from a transcript alone; a session needs at least one of
  // the two. Both, when present, are two evidence sources for ONE session.
  rawText: string
  // Verbatim transcript of the session, when the clinician has one. Optional by
  // design: the full longitudinal pipeline runs either way. When present it is
  // treated as a deeper evidence layer, not as a replacement for the note.
  transcript?: string
  interventions: string
  response: string
  plan: string
  extracted: Extracted
  // What the transcript surfaced that the note did not. Kept separate so the
  // clinician can see exactly what the deeper source added.
  transcriptOnlyEvidence?: string[]
  sourceDiscrepancies?: SourceDiscrepancy[]
  longitudinalImpact: LongitudinalImpact
  createdAt: string
  isSeed?: boolean // true for reconstructed/seed material pending verification
}

export interface MaintainingCycle {
  trigger: string
  thought: string
  emotion: string
  behavior: string
  consequence: string
  reinforcement: string
}

export type FrameworkRole = 'primary' | 'supporting'

export interface FrameworkAssessment {
  framework: string
  role: FrameworkRole
  evidence: string
}

export interface Formulation {
  presenting: string
  predisposing: string
  precipitating: string
  perpetuating: string
  protective: string
  workingSynthesis: string
  patternMap: {
    contextTrigger: string
    interpretation: string
    emotion: string
    behavior: string
  }
  alternativeFormulation: {
    alternative: string
    distinguishingEvidence: string
  }
  gaps: string
  // Living-formulation extensions — each pattern narrative only regenerates
  // when genuinely new pattern evidence is detected, not on every session.
  cognitivePatterns: string
  cognitivePatternLabels: string[]
  emotionalPatterns: string
  behavioralPatterns: string
  behavioralPatternLabels: string[]
  relationalPatterns: string
  relationalPatternLabels: string[]
  maintainingCycle: MaintainingCycle
  theoreticalFrameworks: FrameworkAssessment[]
}

export interface FormulationVersion {
  version: number
  date: string
  previous: Formulation
  newEvidence: string
  reasonForChange: string
  // "Clinical Evolution" fields — the plain-language 4-part change record.
  currentUnderstanding: string
  sessionId?: string
  changes?: ProposedChange[]   // what the clinician approved, with its evidence
}

export type GoalStatus = 'not_started' | 'active' | 'improving' | 'partially_met' | 'met' | 'needs_revision' | 'on_hold'

export interface TreatmentGoal {
  id: string
  text: string
  objectives: string
  interventions: string
  evidence: string
  status: GoalStatus
  flaggedForReview: boolean
  flagReason: string
}

export interface TreatmentPlan {
  presentingFocus: string
  rationale: string
  goals: TreatmentGoal[]
  interventionStrategy: string
  currentPlan: string
  nextClinicalFocus: string
}

export interface TreatmentPlanVersion {
  version: number
  date: string
  previous: TreatmentPlan
  newEvidence: string
  reasonForChange: string
  sessionId?: string
  changes?: ProposedChange[]
}

export type ChangeClassification = 'improvement' | 'maintenance' | 'deterioration' | 'no_change' | 'insufficient_evidence'

export type ProgressTrend = 'improving' | 'stable' | 'worsening' | 'fluctuating' | 'insufficient_evidence'

export const PROGRESS_DOMAINS = [
  'Symptoms',
  'Functioning',
  'Emotional Regulation',
  'Cognitions',
  'Behaviors',
  'Relationships',
  'Coping',
  'Insight',
  'Motivation',
  'Goal Attainment',
  'Risk/Protective Factors',
  'Strengths',
] as const

export type ProgressDomainName = (typeof PROGRESS_DOMAINS)[number]

export interface ProgressDomainEntry {
  domain: ProgressDomainName
  trend: ProgressTrend
  narrative: string
}

export interface TreatmentReview {
  whatIsChanging: string
  responseToIntervention: string
  progressToward: string
  progressClassification: ChangeClassification
  planFit: string
  emergingPriorities: string
  lastUpdated: string
  domains: ProgressDomainEntry[]
}

export interface PresentingConcern {
  concern: string
  priority: number // 1 = highest priority
}

export interface CasePresentation {
  demographics: string
  presentingConcerns: PresentingConcern[]
  keyFindings: string
  background: string
  formulationSummary: string
  emotionalPresentation: string
  currentClinicalPicture: string
  interventionsAndPlans: string
  reasonForPresentation: string
  checklist: {
    demographicsComplete: boolean
    keyFindingsIdentified: boolean
    backgroundEstablished: boolean
    formulationSupported: boolean
    interventionsDocumented: boolean
    clientResponseDocumented: boolean
    progressDocumented: boolean
    reasonSpecific: boolean
    supervisionQuestionIdentified: boolean
  }
}

export interface CasePresentationVersion {
  version: number
  date: string
  previous: CasePresentation
  reasonForChange: string
  sessionId?: string
  changes?: ProposedChange[]
}

export interface SupervisionQuestion {
  id: string
  question: string
  createdAt: string
  fromSessionId?: string
  resolved: boolean
  notes?: string
  // Picked for the next supervision meeting. Separate from `resolved` because
  // an agenda is about what to raise, not what has been settled.
  onAgenda?: boolean
}

export interface ClinicalLearningEntry {
  id: string
  date: string
  skillPracticed: string
  facilitatedWell: string
  movedTooQuickly: string
  genuinelyUnsure: string
  selfNoticing: string
  bringToSupervision: string
  fromSessionId?: string
}

export interface DocumentationGap {
  id: string
  category: string
  description: string
  createdAt: string
  dismissed: boolean
}

export type SuggestionFieldKey = 'formulation' | 'treatmentPlan' | 'casePresentation' | 'treatmentReview'
export type SuggestionFieldStatus = 'pending' | 'approved' | 'rejected'
export type SuggestionSource = 'ai' | 'rules'
export type PendingSuggestionStatus = 'analyzing' | 'ready' | 'error'

// A single proposed change to one clinical document. `draft` is the full
// proposed replacement value (never a partial patch) so the review UI can
// show a clean current-vs-proposed comparison. Nothing here touches the
// live record until the clinician calls approveSuggestionField().
// Where a piece of evidence came from. This is the distinction the clinician
// needs to see on every proposed change: what the client actually said, what
// the clinician chose to document, what arrived with intake, and what the
// engine or AI inferred. "Approved" is not a source; it is what happens to a
// change once the clinician accepts it, and is recorded on the version.
export type EvidenceSource = 'transcript' | 'note' | 'intake' | 'inference'

export const EVIDENCE_SOURCE_LABEL: Record<EvidenceSource, string> = {
  transcript: 'Client said',
  note: 'You documented',
  intake: 'Intake',
  inference: 'Inferred',
}

export interface EvidenceCitation {
  text: string            // the quote or observation
  source: EvidenceSource
  sessionId?: string      // absent for intake evidence
  sessionNumber?: number
}

// What a session does to one piece of the record. Mirrors the longitudinal
// buckets, plus the edit verbs a document change needs.
export type ChangeKind =
  | 'confirms' | 'strengthens' | 'weakens' | 'adds' | 'contradicts'
  | 'revises' | 'removes' | 'uncertain'

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = {
  confirms: 'Confirms',
  strengthens: 'Strengthens',
  weakens: 'Weakens',
  adds: 'Adds',
  contradicts: 'Contradicts',
  revises: 'Revises',
  removes: 'Removes',
  uncertain: 'Leaves uncertain',
}

/**
 * One proposed change, fully traceable: what changed, why, what evidence
 * caused it, and which session that evidence came from. A document-level
 * suggestion carries a list of these so each change can be read on its own
 * rather than hidden inside a rewritten block of text.
 */
export interface ProposedChange {
  id: string
  field: string           // e.g. 'perpetuating', 'maintainingCycle', 'goal:<text>'
  label: string           // human name for the field, e.g. 'Perpetuating factors'
  kind: ChangeKind
  before: string
  after: string
  why: string
  evidence: EvidenceCitation[]
  sessionId: string
  sessionNumber: number
}

export interface SuggestedFieldDraft<T> {
  status: SuggestionFieldStatus
  draft: T
  reasonForChange: string
  newEvidence: string
  // Optional so suggestions saved before this existed still load.
  changes?: ProposedChange[]
}

// The bundle of proposed updates generated after a new session is pasted —
// either by the rule-based engine or by a live Claude analysis call. This is
// always a HYPOTHESIS awaiting clinician review; approving a field is the
// only way its contents reach the client's live record (and version history).
export interface PendingSuggestion {
  id: string
  sessionId: string
  sessionNumber: number
  createdAt: string
  source: SuggestionSource
  status: PendingSuggestionStatus
  error?: string
  summary?: string
  changeHighlights?: string[]
  riskFlagged?: boolean
  riskNote?: string
  formulation?: SuggestedFieldDraft<Formulation>
  treatmentPlan?: SuggestedFieldDraft<TreatmentPlan>
  casePresentation?: SuggestedFieldDraft<CasePresentation>
  treatmentReview?: SuggestedFieldDraft<TreatmentReview>
}

export interface AiSettings {
  enabled: boolean
  apiKey: string
  model: string
}

// Last verified against docs.claude.com/en/docs/about-claude/models at the time
// this feature was built — check there for the current recommended model id
// and update in AI Assist settings if this default has since been retired.
export const DEFAULT_AI_MODEL = 'claude-sonnet-4-5-20250929'

export const DEFAULT_AI_SETTINGS: AiSettings = {
  enabled: false,
  apiKey: '',
  model: DEFAULT_AI_MODEL,
}

// Pulls the de-identified caseload from the TIFEC billing app so the practicum
// roster does not have to be retyped. The feed carries no PHI by contract — see
// lib/practicumSync.ts in the billing repo for what is and is not sent.
export interface SyncSettings {
  enabled: boolean
  endpoint: string // e.g. http://localhost:3009/api/practicum/roster
  token: string    // bearer token from /api/practicum/token
  lastSyncedAt: string | null
}

// The deployed billing app. Pointing at localhost by default only worked while
// the billing app happened to be running on the same laptop, which is not how
// this gets used day to day.
export const DEFAULT_SYNC_ENDPOINT = 'https://tifec-intake.vercel.app/api/practicum/roster'
export const DEFAULT_TOKEN_PAGE = 'https://tifec-intake.vercel.app/api/practicum/token'

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  enabled: false,
  endpoint: DEFAULT_SYNC_ENDPOINT,
  token: '',
  lastSyncedAt: null,
}

/**
 * Intake information from the TIFEC app, once that connection exists.
 *
 * Kept generic on purpose. Which intake answers should feed which part of the
 * case is not decided yet, so this holds labelled sections rather than a fixed
 * set of fields the Hub would have to guess at. Like the roster feed, it must
 * arrive de-identified: TIFEC intake answers contain names and dates of birth,
 * and this app stores everything in plain browser storage.
 */
export interface IntakeSnapshot {
  source: 'tifec'
  receivedAt: string
  sections: Array<{ key: string; label: string; text: string }>
}

// Which case presentation sections sessions may propose changes to.
//
// 'session': rewritten as the case develops, through the usual review step.
// 'intake':  left alone by session analysis for now. These are the sections
//            that come from intake in practice, and the Hub does not have the
//            intake yet, so proposing changes to them from session notes would
//            be guessing. They stay editable by hand. When the TIFEC connection
//            lands, this is the one place to decide how each should update.
export type CasePresentationSectionPolicy = 'session' | 'intake'

export const CASE_PRESENTATION_POLICY: Record<
  'demographics' | 'background' | 'keyFindings' | 'currentClinicalPicture' | 'formulationSummary'
  | 'emotionalPresentation' | 'interventionsAndPlans' | 'reasonForPresentation',
  CasePresentationSectionPolicy
> = {
  demographics: 'intake',
  background: 'intake',
  keyFindings: 'session',
  currentClinicalPicture: 'session',
  formulationSummary: 'session',
  emotionalPresentation: 'session',
  interventionsAndPlans: 'session',
  reasonForPresentation: 'session',
}

export interface Client {
  id: string
  label: string // "Client K" / "Client L" — never a real name
  // Opaque billing-client id when this client came from the TIFEC sync. It is the
  // join key for later syncs, and is meaningless outside the billing system — the
  // name behind it never leaves that system.
  externalRef?: string
  // Intake from TIFEC, when connected. Absent until then; nothing assumes it.
  intake?: IntakeSnapshot
  age: number
  diagnosis: string
  status: ClientStatus
  presentingConcern: string
  demographics: string
  background: string
  themes: string[]
  formulation: Formulation
  formulationHistory: FormulationVersion[]
  treatmentPlan: TreatmentPlan
  treatmentPlanHistory: TreatmentPlanVersion[]
  treatmentReview: TreatmentReview
  casePresentation: CasePresentation
  casePresentationHistory: CasePresentationVersion[]
  supervisionQuestions: SupervisionQuestion[]
  clinicalLearning: ClinicalLearningEntry[]
  documentationGaps: DocumentationGap[]
  pendingSuggestions: PendingSuggestion[]
  sessions: Session[]
  createdAt: string
  updatedAt: string
}

export interface PracticumHourEntry {
  id: string
  kind: 'direct' | 'indirect'
  amount: number
  label: string
  category?: string // for indirect: supervision, documentation, etc.
  date: string
  clientId?: string
  sessionId?: string
  // Legacy. A short-lived version pulled hours from the billing feed; that was
  // wrong, because practicum clients are never billed and the dashboard already
  // logs the duration of every pasted session. Kept only so the sync can
  // recognise and clear rows it created back then.
  syncedFromRef?: string
}

export interface PracticumSettings {
  directTarget: number
  indirectTarget: number
}

export interface PracticumState {
  settings: PracticumSettings
  entries: PracticumHourEntry[]
}

export interface Workspace {
  clients: Client[]
  practicum: PracticumState
}

export const PRACTICUM_DATA_VERSION = 7

export interface ExportPayload {
  version: number
  exportedAt: string
  clients: Client[]
  practicum: PracticumState
}

export const INDIRECT_CATEGORIES = [
  'Supervision',
  'Documentation',
  'Case Conceptualization',
  'Case Presentation Preparation',
  'Training',
  'Case Review',
  'Program Development',
  'Administrative/Clinical (Approved)',
] as const
