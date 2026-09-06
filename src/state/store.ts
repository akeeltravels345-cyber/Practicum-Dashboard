import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { v4 as uuid } from 'uuid'
import type {
  AiSettings,
  Client,
  CasePresentation,
  ClinicalLearningEntry,
  DocumentationGap,
  ExportPayload,
  Formulation,
  PendingSuggestion,
  PracticumHourEntry,
  PracticumSettings,
  PracticumState,
  Session,
  SuggestionFieldKey,
  SupervisionQuestion,
  SyncSettings,
  TreatmentPlan,
  TreatmentReview,
} from '../data/types'
import { DEFAULT_AI_SETTINGS, DEFAULT_SYNC_SETTINGS, PRACTICUM_DATA_VERSION } from '../data/types'
import { buildSeedClients, buildSeedPracticum } from '../data/seed'
import type { RosterFeed } from '../services/practicumSync'
import { maybeSnapshot } from '../services/backup'
import { demographicsLine } from '../services/practicumSync'
import {
  buildRuleBasedSuggestion,
  compareLongitudinal,
  findTranscriptOnlyEvidence,
  detectSourceDiscrepancies,
  computeClientAggregates,
  computeProgressDomains,
  draftNextSessionBrief,
  draftSupervisionQuestions,
  evaluateSessionSignificance,
  extractFromSession,
  mergeThemes,
  scanDocumentationGaps,
} from '../clinical/engine'
import type { SessionDraftInput } from '../clinical/engine'
import { runAiSessionAnalysis } from '../clinical/ai'

/** What a roster sync changed, so the UI can report it honestly. */
export interface RosterSyncResult {
  added: number
  updated: number
  unchanged: number
  addedLabels: string[]
  staleHourRowsRemoved: number
}

interface WorkspaceStore {
  clients: Client[]
  practicum: PracticumState
  aiSettings: AiSettings
  syncSettings: SyncSettings

  getClient: (id: string) => Client | undefined

  addClient: (input: Partial<Client> & { label: string }) => string
  updateClient: (id: string, patch: Partial<Client>) => void

  addSession: (clientId: string, input: SessionDraftInput) => { sessionId: string }

  // Suggestion review workflow — the only path by which a drafted update to
  // formulation / treatment plan / case presentation / progress review
  // reaches the client's live record. Nothing is auto-applied.
  generateSuggestion: (clientId: string, sessionId: string) => void
  retrySuggestion: (clientId: string, suggestionId: string) => void
  approveSuggestionField: (clientId: string, suggestionId: string, field: SuggestionFieldKey, editedDraft?: unknown) => void
  rejectSuggestionField: (clientId: string, suggestionId: string, field: SuggestionFieldKey) => void
  dismissSuggestion: (clientId: string, suggestionId: string) => void

  // A flagged note-vs-transcript difference is only ever cleared by the
  // clinician deciding on it. Nothing resolves a discrepancy automatically.
  markDiscrepancyReviewed: (clientId: string, sessionId: string, discrepancyId: string) => void

  updateAiSettings: (settings: AiSettings) => void
  updateSyncSettings: (settings: SyncSettings) => void
  applyRosterFeed: (feed: RosterFeed) => RosterSyncResult

  // Manual, intentional revisions — independent of the suggestion workflow
  // above. Still versioned; still never overwrites prior history.
  applyFormulationDraft: (clientId: string, next: Formulation, reasonForChange: string, newEvidence: string) => void
  applyTreatmentPlanDraft: (clientId: string, next: TreatmentPlan, reasonForChange: string, newEvidence: string) => void
  updateTreatmentReview: (clientId: string, patch: Partial<Client['treatmentReview']>) => void
  applyCasePresentationDraft: (clientId: string, next: CasePresentation, reasonForChange: string) => void

  addSupervisionQuestion: (clientId: string, question: string) => void
  toggleSupervisionAgenda: (clientId: string, questionId: string) => void
  clearSupervisionAgenda: () => void
  toggleSupervisionResolved: (clientId: string, questionId: string) => void
  updateSupervisionNotes: (clientId: string, questionId: string, notes: string) => void

  addClinicalLearning: (clientId: string, entry: Omit<ClinicalLearningEntry, 'id'>) => void
  updateClinicalLearning: (clientId: string, entryId: string, patch: Partial<ClinicalLearningEntry>) => void

  dismissDocumentationGap: (clientId: string, gapId: string) => void
  rescanDocumentationGaps: (clientId: string) => void
  // Manual, clinician-initiated recompute of mechanical/derived fields
  // (pattern narratives from label sets, progress domain trends, stale-goal
  // flags) from accumulated session notes. An explicit, transparent action —
  // unlike the suggestion workflow, this doesn't touch version history.
  recomputeComputedFields: (clientId: string) => void

  addDirectHours: (amount: number, label: string, clientId?: string, sessionId?: string) => void
  addIndirectHours: (amount: number, label: string, category?: string) => void
  removeHourEntry: (entryId: string) => void
  updatePracticumSettings: (settings: PracticumSettings) => void

  exportWorkspace: () => ExportPayload
  importWorkspace: (payload: ExportPayload) => void
  resetToSeed: () => void
}

// Clients are addressed only by an anonymous label. Pick the next unused letter
// so a synced client gets a stable, human-sayable name in supervision without
// anything identifying attached to it.
function nextClientLabel(existing: string[]): string {
  const taken = new Set(existing)
  for (let i = 0; i < 26; i++) {
    const label = `Client ${String.fromCharCode(65 + i)}`
    if (!taken.has(label)) return label
  }
  // Past 26 clients, fall back to a numbered label rather than reusing a letter.
  for (let n = 2; ; n++) {
    const label = `Client ${n}`
    if (!taken.has(label)) return label
  }
}

function touch(client: Client): Client {
  return { ...client, updatedAt: new Date().toISOString() }
}

function replaceSuggestion(client: Client, suggestionId: string, next: PendingSuggestion): Client {
  return {
    ...client,
    pendingSuggestions: client.pendingSuggestions.map((s) => (s.id === suggestionId ? next : s)),
  }
}

export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      clients: buildSeedClients(),
      practicum: buildSeedPracticum(),
      aiSettings: DEFAULT_AI_SETTINGS,
      syncSettings: DEFAULT_SYNC_SETTINGS,

      getClient: (id) => get().clients.find((c) => c.id === id),

      addClient: (input) => {
        const id = uuid()
        const now = new Date().toISOString()
        const newClient: Client = {
          id,
          label: input.label,
          externalRef: input.externalRef,
          age: input.age ?? 0,
          diagnosis: input.diagnosis ?? '',
          status: input.status ?? 'Intake',
          presentingConcern: input.presentingConcern ?? '',
          demographics: input.demographics ?? '',
          background: input.background ?? '',
          themes: [],
          formulation: {
            presenting: '', predisposing: '', precipitating: '', perpetuating: '', protective: '',
            workingSynthesis: '',
            patternMap: { contextTrigger: '', interpretation: '', emotion: '', behavior: '' },
            alternativeFormulation: { alternative: '', distinguishingEvidence: '' },
            gaps: '',
            cognitivePatterns: '',
            cognitivePatternLabels: [],
            emotionalPatterns: '',
            behavioralPatterns: '',
            behavioralPatternLabels: [],
            relationalPatterns: '',
            relationalPatternLabels: [],
            maintainingCycle: { trigger: '', thought: '', emotion: '', behavior: '', consequence: '', reinforcement: '' },
            theoreticalFrameworks: [],
          },
          formulationHistory: [],
          treatmentPlan: {
            presentingFocus: '', rationale: '', goals: [], interventionStrategy: '', currentPlan: '',
            nextClinicalFocus: '',
          },
          treatmentPlanHistory: [],
          treatmentReview: {
            whatIsChanging: '', responseToIntervention: '', progressToward: '',
            progressClassification: 'insufficient_evidence', planFit: '', emergingPriorities: '',
            lastUpdated: now,
            domains: computeProgressDomains([]),
          },
          casePresentation: {
            demographics: '', presentingConcerns: [], keyFindings: '', background: '', formulationSummary: '',
            emotionalPresentation: 'No sessions recorded yet — this will populate once session notes are added.',
            currentClinicalPicture: '',
            interventionsAndPlans: '', reasonForPresentation: '',
            checklist: {
              demographicsComplete: false, keyFindingsIdentified: false, backgroundEstablished: false,
              formulationSupported: false, interventionsDocumented: false, clientResponseDocumented: false,
              progressDocumented: false, reasonSpecific: false, supervisionQuestionIdentified: false,
            },
          },
          casePresentationHistory: [],
          pendingSuggestions: [],
          supervisionQuestions: [],
          clinicalLearning: [],
          documentationGaps: [],
          sessions: [],
          createdAt: now,
          updatedAt: now,
        }
        set((state) => ({ clients: [...state.clients, newClient] }))
        return id
      },

      updateClient: (id, patch) => {
        set((state) => ({
          clients: state.clients.map((c) => (c.id === id ? touch({ ...c, ...patch }) : c)),
        }))
      },

      addSession: (clientId, input) => {
        const client = get().clients.find((c) => c.id === clientId)
        if (!client) return { sessionId: '' }
        const extracted = extractFromSession(input)
        // Compared against the whole case history, not just the theme list, so
        // the nine impact buckets can tell "seen again" from "settling" from
        // "flickering in and out".
        const impact = compareLongitudinal(
          extracted.symptoms,
          client.themes,
          client.sessions,
          `${input.rawText}\n${input.transcript ?? ''}`,
        )
        const transcript = input.transcript?.trim() ?? ''
        const transcriptOnlyEvidence = transcript ? findTranscriptOnlyEvidence(input.rawText, transcript) : []
        const sourceDiscrepancies = transcript ? detectSourceDiscrepancies(input.rawText, transcript) : []
        const sessionId = uuid()
        const session: Session = {
          id: sessionId,
          sessionNumber: client.sessions.length + 1,
          date: input.date,
          duration: input.duration,
          rawText: input.rawText,
          transcript: transcript || undefined,
          interventions: input.interventions,
          response: input.response,
          plan: input.plan,
          extracted,
          transcriptOnlyEvidence: transcriptOnlyEvidence.length > 0 ? transcriptOnlyEvidence : undefined,
          sourceDiscrepancies: sourceDiscrepancies.length > 0 ? sourceDiscrepancies : undefined,
          longitudinalImpact: impact,
          createdAt: new Date().toISOString(),
        }

        // Mechanical, low-stakes updates land immediately: the raw session
        // itself, the theme tag list, supervision-question prompts, and the
        // documentation-gap scan. None of these overwrite clinical judgment —
        // they're either source material or dismissable prompts. Everything
        // that IS a clinical conclusion (formulation, treatment plan, case
        // presentation, progress review) goes through the suggestion review
        // workflow below instead of being written here.
        const sig = evaluateSessionSignificance(client, session)
        const updatedThemes = mergeThemes(client.themes, extracted.symptoms)
        const newSupervisionQs = draftSupervisionQuestions(client, session, sig)
        const allSessions = [...client.sessions, session]

        let updatedClient: Client = touch({
          ...client,
          sessions: allSessions,
          themes: updatedThemes,
          supervisionQuestions: [...client.supervisionQuestions, ...newSupervisionQs],
        })
        updatedClient.documentationGaps = scanDocumentationGaps(updatedClient)

        set((state) => ({
          clients: state.clients.map((c) => (c.id === clientId ? updatedClient : c)),
          practicum: {
            ...state.practicum,
            entries: [
              ...state.practicum.entries,
              {
                id: uuid(),
                kind: 'direct',
                amount: input.duration,
                label: `${client.label} — Session ${session.sessionNumber}`,
                date: input.date,
                clientId,
                sessionId,
              },
            ],
          },
        }))

        get().generateSuggestion(clientId, sessionId)

        // A new session is the point at which unsaved work becomes worth
        // losing, so that is when a rolling snapshot is taken. Rate-limited
        // inside maybeSnapshot, and never allowed to break the save.
        try {
          maybeSnapshot(get().exportWorkspace())
        } catch {
          /* backups are best-effort and must never fail a session save */
        }

        return { sessionId }
      },

      generateSuggestion: (clientId, sessionId) => {
        const client = get().clients.find((c) => c.id === clientId)
        const session = client?.sessions.find((s) => s.id === sessionId)
        if (!client || !session) return

        const settings = get().aiSettings
        const usesAi = settings.enabled && settings.apiKey.trim().length > 0
        const placeholderId = uuid()

        const placeholder: PendingSuggestion = {
          id: placeholderId,
          sessionId,
          sessionNumber: session.sessionNumber,
          createdAt: new Date().toISOString(),
          source: usesAi ? 'ai' : 'rules',
          status: usesAi ? 'analyzing' : 'ready',
        }

        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId ? { ...c, pendingSuggestions: [...c.pendingSuggestions, placeholder] } : c,
          ),
        }))

        if (!usesAi) {
          const rulesSuggestion = { ...buildRuleBasedSuggestion(client, session), id: placeholderId }
          set((state) => ({
            clients: state.clients.map((c) => (c.id === clientId ? replaceSuggestion(c, placeholderId, rulesSuggestion) : c)),
          }))
          return
        }

        runAiSessionAnalysis(client, session, settings).then((result) => {
          const finalSuggestion = { ...result.suggestion, id: placeholderId }
          set((state) => ({
            clients: state.clients.map((c) => {
              if (c.id !== clientId) return c
              const withSuggestion = replaceSuggestion(c, placeholderId, finalSuggestion)
              const newQs: SupervisionQuestion[] = result.supervisionQuestions.map((q) => ({
                id: uuid(),
                question: q,
                createdAt: new Date().toISOString(),
                fromSessionId: sessionId,
                resolved: false,
              }))
              const newGaps: DocumentationGap[] = result.documentationGaps.map((g) => ({
                id: uuid(),
                category: g.category,
                description: g.description,
                createdAt: new Date().toISOString(),
                dismissed: false,
              }))

              // Refine the session's Interventions/Response/Plan breakdown with
              // Claude's read of the raw note, if it offered one — a mechanical
              // transcription task, not a clinical conclusion, so it's applied
              // directly rather than routed through suggestion review. The raw
              // note itself is never touched.
              const { interventions, response, plan } = result.extractedSections
              const { transcriptOnlyEvidence, sourceDiscrepancies, longitudinalImpact } = result.sourceAnalysis
              const hasRefinement = interventions.trim() || response.trim() || plan.trim()
              const hasSourceAnalysis =
                transcriptOnlyEvidence.length > 0 || sourceDiscrepancies.length > 0 || longitudinalImpact !== null

              // Claude's two-source findings are recorded against the SESSION,
              // not merged into a clinical document — they describe evidence,
              // not a conclusion. Discrepancies in particular stay unresolved
              // and unreviewed until the clinician rules on them.
              const sessions = hasRefinement || hasSourceAnalysis
                ? withSuggestion.sessions.map((s) => {
                    if (s.id !== sessionId) return s
                    const refined: SessionDraftInput = {
                      date: s.date,
                      duration: s.duration,
                      rawText: s.rawText,
                      transcript: s.transcript,
                      interventions: interventions.trim() || s.interventions,
                      response: response.trim() || s.response,
                      plan: plan.trim() || s.plan,
                    }
                    return {
                      ...s,
                      ...refined,
                      extracted: extractFromSession(refined),
                      // Union the rule-based findings with Claude's, rather than
                      // replacing: the offline pass already found real things.
                      transcriptOnlyEvidence: transcriptOnlyEvidence.length > 0
                        ? Array.from(new Set([...(s.transcriptOnlyEvidence ?? []), ...transcriptOnlyEvidence]))
                        : s.transcriptOnlyEvidence,
                      sourceDiscrepancies: sourceDiscrepancies.length > 0
                        ? [...(s.sourceDiscrepancies ?? []), ...sourceDiscrepancies]
                        : s.sourceDiscrepancies,
                      longitudinalImpact: longitudinalImpact ?? s.longitudinalImpact,
                    }
                  })
                : withSuggestion.sessions

              return {
                ...withSuggestion,
                sessions,
                supervisionQuestions: [...withSuggestion.supervisionQuestions, ...newQs],
                documentationGaps: [...withSuggestion.documentationGaps, ...newGaps],
              }
            }),
          }))
        })
      },

      retrySuggestion: (clientId, suggestionId) => {
        const client = get().clients.find((c) => c.id === clientId)
        const suggestion = client?.pendingSuggestions.find((s) => s.id === suggestionId)
        const session = client?.sessions.find((s) => s.id === suggestion?.sessionId)
        if (!client || !suggestion || !session) return

        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId ? replaceSuggestion(c, suggestionId, { ...suggestion, status: 'analyzing', error: undefined }) : c,
          ),
        }))

        const settings = get().aiSettings
        runAiSessionAnalysis(client, session, settings).then((result) => {
          const finalSuggestion = { ...result.suggestion, id: suggestionId }
          set((state) => ({
            clients: state.clients.map((c) => (c.id === clientId ? replaceSuggestion(c, suggestionId, finalSuggestion) : c)),
          }))
        })
      },

      approveSuggestionField: (clientId, suggestionId, field, editedDraft) => {
        set((state) => ({
          clients: state.clients.map((c) => {
            if (c.id !== clientId) return c
            const suggestion = c.pendingSuggestions.find((s) => s.id === suggestionId)
            const fieldDraft = suggestion?.[field]
            if (!suggestion || !fieldDraft) return c

            const draftValue = editedDraft ?? fieldDraft.draft
            let next: Client = c

            if (field === 'formulation') {
              const version = c.formulationHistory.length + 1
              const formulation = draftValue as Formulation
              next = {
                ...c,
                formulation,
                formulationHistory: [
                  ...c.formulationHistory,
                  {
                    version,
                    date: new Date().toISOString(),
                    previous: c.formulation,
                    newEvidence: fieldDraft.newEvidence,
                    reasonForChange: fieldDraft.reasonForChange,
                    currentUnderstanding: formulation.workingSynthesis,
                    sessionId: suggestion.sessionId,
                  },
                ],
              }
            } else if (field === 'treatmentPlan') {
              const version = c.treatmentPlanHistory.length + 1
              next = {
                ...c,
                treatmentPlan: draftValue as TreatmentPlan,
                treatmentPlanHistory: [
                  ...c.treatmentPlanHistory,
                  { version, date: new Date().toISOString(), previous: c.treatmentPlan, newEvidence: fieldDraft.newEvidence, reasonForChange: fieldDraft.reasonForChange },
                ],
              }
            } else if (field === 'casePresentation') {
              const version = c.casePresentationHistory.length + 1
              next = {
                ...c,
                casePresentation: draftValue as CasePresentation,
                casePresentationHistory: [
                  ...c.casePresentationHistory,
                  { version, date: new Date().toISOString(), previous: c.casePresentation, reasonForChange: fieldDraft.reasonForChange },
                ],
              }
            } else if (field === 'treatmentReview') {
              next = { ...c, treatmentReview: draftValue as TreatmentReview }
            }

            const resolvedSuggestion: PendingSuggestion = { ...suggestion, [field]: { ...fieldDraft, status: 'approved' } }
            return touch(replaceSuggestion(next, suggestionId, resolvedSuggestion))
          }),
        }))
      },

      rejectSuggestionField: (clientId, suggestionId, field) => {
        set((state) => ({
          clients: state.clients.map((c) => {
            if (c.id !== clientId) return c
            const suggestion = c.pendingSuggestions.find((s) => s.id === suggestionId)
            const fieldDraft = suggestion?.[field]
            if (!suggestion || !fieldDraft) return c
            const rejected: PendingSuggestion = { ...suggestion, [field]: { ...fieldDraft, status: 'rejected' } }
            return touch(replaceSuggestion(c, suggestionId, rejected))
          }),
        }))
      },

      dismissSuggestion: (clientId, suggestionId) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId ? touch({ ...c, pendingSuggestions: c.pendingSuggestions.filter((s) => s.id !== suggestionId) }) : c,
          ),
        }))
      },

      updateAiSettings: (settings) => set({ aiSettings: settings }),

      markDiscrepancyReviewed: (clientId, sessionId, discrepancyId) =>
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id !== clientId
              ? c
              : touch({
                  ...c,
                  sessions: c.sessions.map((s) =>
                    s.id !== sessionId
                      ? s
                      : {
                          ...s,
                          sourceDiscrepancies: (s.sourceDiscrepancies ?? []).map((d) =>
                            d.id === discrepancyId ? { ...d, reviewed: true } : d,
                          ),
                        },
                  ),
                }),
          ),
        })),

      updateSyncSettings: (settings) => set({ syncSettings: settings }),

      // Merge a de-identified roster feed into the workspace.
      //
      // Deliberately conservative: the feed owns objective facts (age, the
      // diagnosis code list, the demographics line) and nothing else. Every
      // narrative field — presenting concern, background, formulation, case
      // presentation — is the clinician's own writing and is never touched, so
      // re-syncing can't erase work. A non-empty diagnosis or demographics line
      // is also left alone, on the same principle: the clinician's edit wins.
      //
      // Note this is an upsert, unlike importWorkspace, which replaces the
      // whole workspace. Syncing must never drop a client.
      applyRosterFeed: (feed) => {
        const result: RosterSyncResult = { added: 0, updated: 0, unchanged: 0, addedLabels: [], staleHourRowsRemoved: 0 }
        const now = new Date().toISOString()

        for (const incoming of feed.clients) {
          const existing = get().clients.find((c) => c.externalRef === incoming.ref)
          const demographics = demographicsLine(incoming)

          if (!existing) {
            const label = nextClientLabel(get().clients.map((c) => c.label))
            get().addClient({
              label,
              externalRef: incoming.ref,
              status: 'Intake',
              age: incoming.ageYears ?? 0,
              diagnosis: incoming.diagnosisLabel,
              demographics,
            })
            result.added++
            result.addedLabels.push(label)
            continue
          }

          const patch: Partial<Client> = {}
          if (incoming.ageYears !== null && existing.age !== incoming.ageYears) {
            patch.age = incoming.ageYears
          }
          if (!existing.diagnosis.trim() && incoming.diagnosisLabel) {
            patch.diagnosis = incoming.diagnosisLabel
          }
          if (!existing.demographics.trim() && demographics) {
            patch.demographics = demographics
          }

          if (Object.keys(patch).length > 0) {
            get().updateClient(existing.id, patch)
            result.updated++
          } else {
            result.unchanged++
          }
        }

        // Practicum hours deliberately do NOT come from this feed.
        //
        // Nick's practicum clients are never billed, so the billing system holds
        // no sessions for them and the feed's totalHours is always zero. Worse,
        // the dashboard already records a Direct Hours entry from the duration
        // on every session he pastes — so if a session ever were logged on the
        // billing side, the same hour would be counted twice. Against a
        // 200-hour requirement that error reads as progress.
        //
        // Hours belong to the session log, which measures time spent, not money
        // charged. All this does now is clear rows left by the earlier version.
        const practicum = get().practicum
        const stale = practicum.entries.filter((e) => e.syncedFromRef)
        result.staleHourRowsRemoved = stale.length

        set({
          practicum:
            stale.length > 0
              ? { ...practicum, entries: practicum.entries.filter((e) => !e.syncedFromRef) }
              : practicum,
          syncSettings: { ...get().syncSettings, lastSyncedAt: now },
        })

        return result
      },

      applyFormulationDraft: (clientId, next, reasonForChange, newEvidence) => {
        set((state) => ({
          clients: state.clients.map((c) => {
            if (c.id !== clientId) return c
            const version = c.formulationHistory.length + 1
            return touch({
              ...c,
              formulation: next,
              formulationHistory: [
                ...c.formulationHistory,
                {
                  version,
                  date: new Date().toISOString(),
                  previous: c.formulation,
                  newEvidence,
                  reasonForChange,
                  currentUnderstanding: next.workingSynthesis,
                },
              ],
            })
          }),
        }))
      },

      applyTreatmentPlanDraft: (clientId, next, reasonForChange, newEvidence) => {
        set((state) => ({
          clients: state.clients.map((c) => {
            if (c.id !== clientId) return c
            const version = c.treatmentPlanHistory.length + 1
            return touch({
              ...c,
              treatmentPlan: next,
              treatmentPlanHistory: [
                ...c.treatmentPlanHistory,
                { version, date: new Date().toISOString(), previous: c.treatmentPlan, newEvidence, reasonForChange },
              ],
            })
          }),
        }))
      },

      updateTreatmentReview: (clientId, patch) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? touch({ ...c, treatmentReview: { ...c.treatmentReview, ...patch, lastUpdated: new Date().toISOString() } })
              : c,
          ),
        }))
      },

      applyCasePresentationDraft: (clientId, next, reasonForChange) => {
        set((state) => ({
          clients: state.clients.map((c) => {
            if (c.id !== clientId) return c
            const version = c.casePresentationHistory.length + 1
            return touch({
              ...c,
              casePresentation: next,
              casePresentationHistory: [
                ...c.casePresentationHistory,
                { version, date: new Date().toISOString(), previous: c.casePresentation, reasonForChange },
              ],
            })
          }),
        }))
      },

      toggleSupervisionAgenda: (clientId, questionId) =>
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id !== clientId
              ? c
              : touch({
                  ...c,
                  supervisionQuestions: c.supervisionQuestions.map((q) =>
                    q.id === questionId ? { ...q, onAgenda: !q.onAgenda } : q,
                  ),
                }),
          ),
        })),

      // Called after a supervision meeting: empties the agenda without touching
      // whether anything was resolved. Those are separate judgements.
      clearSupervisionAgenda: () =>
        set((state) => ({
          clients: state.clients.map((c) =>
            c.supervisionQuestions.some((q) => q.onAgenda)
              ? touch({ ...c, supervisionQuestions: c.supervisionQuestions.map((q) => ({ ...q, onAgenda: false })) })
              : c,
          ),
        })),

      addSupervisionQuestion: (clientId, question) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? touch({
                  ...c,
                  supervisionQuestions: [
                    ...c.supervisionQuestions,
                    { id: uuid(), question, createdAt: new Date().toISOString(), resolved: false } satisfies SupervisionQuestion,
                  ],
                })
              : c,
          ),
        }))
      },

      toggleSupervisionResolved: (clientId, questionId) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? touch({
                  ...c,
                  supervisionQuestions: c.supervisionQuestions.map((q) =>
                    q.id === questionId ? { ...q, resolved: !q.resolved } : q,
                  ),
                })
              : c,
          ),
        }))
      },

      updateSupervisionNotes: (clientId, questionId, notes) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? touch({
                  ...c,
                  supervisionQuestions: c.supervisionQuestions.map((q) => (q.id === questionId ? { ...q, notes } : q)),
                })
              : c,
          ),
        }))
      },

      addClinicalLearning: (clientId, entry) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? touch({ ...c, clinicalLearning: [...c.clinicalLearning, { ...entry, id: uuid() }] })
              : c,
          ),
        }))
      },

      updateClinicalLearning: (clientId, entryId, patch) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? touch({
                  ...c,
                  clinicalLearning: c.clinicalLearning.map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
                })
              : c,
          ),
        }))
      },

      dismissDocumentationGap: (clientId, gapId) => {
        set((state) => ({
          clients: state.clients.map((c) =>
            c.id === clientId
              ? touch({
                  ...c,
                  documentationGaps: c.documentationGaps.map((g) => (g.id === gapId ? { ...g, dismissed: true } : g)),
                })
              : c,
          ),
        }))
      },

      rescanDocumentationGaps: (clientId) => {
        set((state) => ({
          clients: state.clients.map((c) => (c.id === clientId ? touch({ ...c, documentationGaps: scanDocumentationGaps(c) }) : c)),
        }))
      },

      recomputeComputedFields: (clientId) => {
        set((state) => ({
          clients: state.clients.map((c) => (c.id === clientId ? touch({ ...c, ...computeClientAggregates(c) }) : c)),
        }))
      },

      addDirectHours: (amount, label, clientId, sessionId) => {
        const entry: PracticumHourEntry = { id: uuid(), kind: 'direct', amount, label, date: new Date().toISOString(), clientId, sessionId }
        set((state) => ({ practicum: { ...state.practicum, entries: [...state.practicum.entries, entry] } }))
      },

      addIndirectHours: (amount, label, category) => {
        const entry: PracticumHourEntry = { id: uuid(), kind: 'indirect', amount, label, category, date: new Date().toISOString() }
        set((state) => ({ practicum: { ...state.practicum, entries: [...state.practicum.entries, entry] } }))
      },

      removeHourEntry: (entryId) => {
        set((state) => ({ practicum: { ...state.practicum, entries: state.practicum.entries.filter((e) => e.id !== entryId) } }))
      },

      updatePracticumSettings: (settings) => {
        set((state) => ({ practicum: { ...state.practicum, settings } }))
      },

      exportWorkspace: () => {
        const state = get()
        return {
          version: PRACTICUM_DATA_VERSION,
          exportedAt: new Date().toISOString(),
          clients: state.clients,
          practicum: state.practicum,
        }
      },

      importWorkspace: (payload) => {
        set({ clients: payload.clients, practicum: payload.practicum })
      },

      resetToSeed: () => {
        set({ clients: buildSeedClients(), practicum: buildSeedPracticum() })
      },
    }),
    { name: 'znkstr-practicum-workspace-v4' },
  ),
)

export function draftNextSessionBriefFor(client: Client) {
  return draftNextSessionBrief(client)
}
