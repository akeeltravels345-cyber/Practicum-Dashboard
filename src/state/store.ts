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
  TreatmentPlan,
  TreatmentReview,
} from '../data/types'
import { DEFAULT_AI_SETTINGS, PRACTICUM_DATA_VERSION } from '../data/types'
import { buildSeedClients, buildSeedPracticum } from '../data/seed'
import {
  buildRuleBasedSuggestion,
  compareThemes,
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

interface WorkspaceStore {
  clients: Client[]
  practicum: PracticumState
  aiSettings: AiSettings

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

  updateAiSettings: (settings: AiSettings) => void

  // Manual, intentional revisions — independent of the suggestion workflow
  // above. Still versioned; still never overwrites prior history.
  applyFormulationDraft: (clientId: string, next: Formulation, reasonForChange: string, newEvidence: string) => void
  applyTreatmentPlanDraft: (clientId: string, next: TreatmentPlan, reasonForChange: string, newEvidence: string) => void
  updateTreatmentReview: (clientId: string, patch: Partial<Client['treatmentReview']>) => void
  applyCasePresentationDraft: (clientId: string, next: CasePresentation, reasonForChange: string) => void

  addSupervisionQuestion: (clientId: string, question: string) => void
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

      getClient: (id) => get().clients.find((c) => c.id === id),

      addClient: (input) => {
        const id = uuid()
        const now = new Date().toISOString()
        const newClient: Client = {
          id,
          label: input.label,
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
        const impact = compareThemes(extracted.symptoms, client.themes)
        const sessionId = uuid()
        const session: Session = {
          id: sessionId,
          sessionNumber: client.sessions.length + 1,
          date: input.date,
          duration: input.duration,
          rawText: input.rawText,
          interventions: input.interventions,
          response: input.response,
          plan: input.plan,
          extracted,
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
              const hasRefinement = interventions.trim() || response.trim() || plan.trim()
              const sessions = hasRefinement
                ? withSuggestion.sessions.map((s) => {
                    if (s.id !== sessionId) return s
                    const refined: SessionDraftInput = {
                      date: s.date,
                      duration: s.duration,
                      rawText: s.rawText,
                      interventions: interventions.trim() || s.interventions,
                      response: response.trim() || s.response,
                      plan: plan.trim() || s.plan,
                    }
                    return { ...s, ...refined, extracted: extractFromSession(refined) }
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
