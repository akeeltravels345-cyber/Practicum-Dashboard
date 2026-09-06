// Seed data — anonymized, reconstructed from recovered practicum material only.
// Real identifying details are never stored: clients appear only as "Client K" / "Client L".
// Session entries below are marked isSeed:true and framed as recovered summaries,
// not verbatim transcripts — verify all content against original documentation.

import type { Client, PracticumState } from './types'
import {
  compareThemes,
  computeClientAggregates,
  computeEmotionSummary,
  computeMaintainingCycle,
  draftPatternNarrative,
  extractFromSession,
  scanDocumentationGaps,
} from '../clinical/engine'

function buildSession(
  sessionNumber: number,
  date: string,
  duration: number,
  rawText: string,
  interventions: string,
  response: string,
  plan: string,
  existingThemesBefore: string[],
): { session: Client['sessions'][number]; themesAfter: string[] } {
  const extracted = extractFromSession({ date, duration, rawText, interventions, response, plan })
  const impact = compareThemes(extracted.symptoms, existingThemesBefore)
  const themesAfter = Array.from(new Set([...existingThemesBefore, ...extracted.symptoms]))
  return {
    session: {
      id: `seed-${sessionNumber}-${date}`,
      sessionNumber,
      date,
      duration,
      rawText,
      interventions,
      response,
      plan,
      extracted,
      longitudinalImpact: impact,
      createdAt: new Date(date).toISOString(),
      isSeed: true,
    },
    themesAfter,
  }
}

function buildClientK(): Client {
  const now = new Date().toISOString()
  let themes: string[] = []
  const sessions: Client['sessions'] = []

  const s1 = buildSession(
    1,
    '2026-02-03',
    1.0,
    'Client presents with persistent, generalized anxiety, rated approximately 5.5/10 on most days. Reports a history of panic attacks during undergraduate years, now largely resolved but anxiety remains a near-constant background presence. Describes career uncertainty around acting work as a significant stressor, along with a tendency to compare herself to peers who appear further along professionally.',
    'Initial intake and information-gathering; began building a shared vocabulary for anxiety intensity and triggers.',
    'Client was engaged and articulate about her internal experience; some relief noted simply from naming the pattern aloud.',
    'Continue information-gathering; begin tracking situations that increase vs. decrease anxiety.',
    themes,
  )
  sessions.push(s1.session)
  themes = s1.themesAfter

  const s2 = buildSession(
    2,
    '2026-02-17',
    1.0,
    'Discussed difficulty tolerating stillness — client describes feeling compelled to stay constantly productive, and that unstructured time triggers guilt and restlessness. Described this as having "two different brains": one that wants rest, one that treats rest as a failure. Fear-based motivation surfaced as a pattern — client often acts from fear of falling behind rather than from values or interest.',
    'Explored the productivity/rest conflict using open-ended questioning; introduced the concept of fear-based vs. values-based motivation for future exploration.',
    'Client responded strongly to the "two different brains" framing and used it spontaneously later in session to describe other conflicts.',
    'Introduce a brief stillness/rest exercise between sessions; continue mapping fear-based motivation patterns.',
    themes,
  )
  sessions.push(s2.session)
  themes = s2.themesAfter

  const s3 = buildSession(
    3,
    '2026-03-03',
    1.0,
    'Client reports having practiced brief meditation and an intentional boredom/stillness exercise between sessions. Noted increased awareness of anxiety arising specifically when not being "productive." Continued discussion of identity being closely tied to career progress and output, with self-worth fluctuating based on perceived productivity that day.',
    'Reviewed between-session meditation/stillness exercise; used Socratic questioning to explore the link between productivity and self-worth.',
    'Client noted the stillness exercise was uncomfortable but tolerable, and that anxiety was highest in the first few minutes before settling somewhat.',
    'Continue stillness practice; begin exploring where the productivity-equals-worth belief originated.',
    themes,
  )
  sessions.push(s3.session)
  themes = s3.themesAfter

  const s4 = buildSession(
    4,
    '2026-03-17',
    1.25,
    'Extended discussion of career and identity uncertainty related to acting work — client describes not knowing whether to continue pursuing it and feeling that her sense of self is entangled with career outcomes she cannot control. Reframing work began around examining expectations placed on herself versus expectations that may be externally driven or comparison-based.',
    'Cognitive reframing around self-imposed expectations; gentle challenge of all-or-nothing language regarding career success.',
    'Client engaged well with reframing but acknowledged the belief "if I\'m not working toward something, I\'m falling behind" remains strong.',
    'Continue reframing work on expectations; consider explicitly naming perfectionism as a possible thread running through career, productivity, and self-worth material.',
    themes,
  )
  sessions.push(s4.session)
  themes = s4.themesAfter

  const s5 = buildSession(
    5,
    '2026-03-31',
    1.0,
    'Session focused on distinguishing fear-based motivation from love/values-based motivation, using recent career decisions as concrete examples. Client identified that most of her recent choices were driven by fear of judgment or falling behind rather than genuine interest, and expressed curiosity about what values-based motivation would actually feel like.',
    'Values clarification exercise contrasting fear-driven vs. values-driven decisions; continued reframing around expectations.',
    "Client appeared moved by the exercise, describing it as \"the first time I've separated what I want from what I'm scared of.\"",
    'Carry values-based motivation framework into ongoing career discussions; continue monitoring stillness tolerance.',
    themes,
  )
  sessions.push(s5.session)
  themes = s5.themesAfter

  const emotionSummary = computeEmotionSummary(sessions)
  const cognitiveLabels = Array.from(new Set(sessions.flatMap((s) => s.extracted.cognitiveDistortions)))
  const behavioralLabels = Array.from(new Set(sessions.flatMap((s) => s.extracted.behavioralPatterns)))
  const relationalLabels = Array.from(new Set(sessions.flatMap((s) => s.extracted.relationalPatterns)))
  const lastSession = sessions[sessions.length - 1]
  const maintainingCycle = computeMaintainingCycle(
    cognitiveLabels,
    behavioralLabels,
    lastSession?.extracted.emotions[0] ?? '',
    lastSession?.extracted.triggers[lastSession.extracted.triggers.length - 1] ?? '',
  )

  const formulationSynthesis = `Client presents with generalized anxiety (approx. 5.5/10 baseline) with a documented history of panic attacks in undergraduate years. A recurring pattern connects difficulty tolerating stillness, a strong productivity/rest conflict, and self-worth that appears contingent on output. Career and identity uncertainty (acting work) intersect with comparison to peers and fear-based motivation. Early evidence (Sessions 4-5) suggests a possible underlying thread of perfectionism and intolerance of uncertainty connecting these areas, though this remains a working hypothesis pending further confirmation.`

  return {
    id: 'client-k',
    label: 'Client K',
    age: 27,
    diagnosis: 'Generalized Anxiety Disorder (GAD)',
    status: 'Active',
    presentingConcern: 'Persistent generalized anxiety with productivity/rest conflict, career uncertainty, and self-worth tied to output.',
    demographics: 'Adult client, early career, pursuing work in the performing arts (acting).',
    background: 'History of panic attacks during undergraduate years, now largely resolved. No further background documented yet — consider expanding.',
    themes,
    formulation: {
      presenting: 'Generalized anxiety (~5.5/10 baseline), difficulty tolerating stillness, productivity/rest conflict.',
      predisposing: 'History of panic attacks in undergraduate years; possible longstanding tendency toward self-comparison.',
      precipitating: 'Career uncertainty in acting work; unstructured/non-productive time.',
      perpetuating: 'Fear-based motivation, self-worth contingent on productivity, comparison to peers, possible perfectionistic beliefs.',
      protective: 'Willingness to engage in stillness/meditation exercises; strong verbal insight and engagement in reframing work.',
      workingSynthesis: formulationSynthesis,
      patternMap: {
        contextTrigger: 'Unstructured time, or career-related uncertainty/comparison.',
        interpretation: 'Possible belief: "If I am not being productive, I am falling behind and my worth is at risk."',
        emotion: emotionSummary,
        behavior: 'Compulsive productivity, avoidance of stillness, fear-driven career decisions.',
      },
      alternativeFormulation: {
        alternative: '',
        distinguishingEvidence: '',
      },
      gaps: 'Family/developmental history not yet documented. Unclear how long the productivity/rest conflict has been present versus emerging recently.',
      cognitivePatterns: draftPatternNarrative('cognitive', cognitiveLabels),
      cognitivePatternLabels: cognitiveLabels,
      emotionalPatterns: '',
      behavioralPatterns: draftPatternNarrative('behavioral', behavioralLabels),
      behavioralPatternLabels: behavioralLabels,
      relationalPatterns: draftPatternNarrative('relational', relationalLabels),
      relationalPatternLabels: relationalLabels,
      maintainingCycle,
      theoreticalFrameworks: [],
    },
    formulationHistory: [],
    treatmentPlan: {
      presentingFocus: 'Generalized anxiety, productivity/rest conflict, and career-related uncertainty.',
      rationale: 'Anxiety appears maintained by fear-based motivation and self-worth contingent on productivity; early sessions focus on building tolerance for stillness and identifying the fear/values distinction.',
      goals: [
        {
          id: 'k-g1',
          text: 'Reduce generalized anxiety from ~5.5/10 toward a self-rated 3/10 or below on most days.',
          objectives: 'Track anxiety rating at start of each session; identify at least one situation per week where anxiety was tolerated without avoidance.',
          interventions: 'CBT-oriented reframing, brief mindfulness/stillness exercises.',
          evidence: 'No standardized measure collected yet — consider adding a GAD-7 or similar to track this goal objectively.',
          status: 'active',
          flaggedForReview: false,
          flagReason: '',
        },
        {
          id: 'k-g2',
          text: 'Increase tolerance for unstructured/rest time without significant guilt or restlessness.',
          objectives: 'Complete brief stillness/rest exercises between sessions; notice and name the guilt response when it arises.',
          interventions: 'Mindfulness/stillness exercises, Socratic questioning.',
          evidence: 'Sessions 2-3: client completed stillness exercises and reported anxiety settling somewhat after initial discomfort.',
          status: 'improving',
          flaggedForReview: false,
          flagReason: '',
        },
        {
          id: 'k-g3',
          text: 'Identify and articulate values-based (vs. fear-based) motivation in at least one major life domain.',
          objectives: 'Apply the fear-vs-values distinction to at least one concrete career decision.',
          interventions: 'Values clarification exercise, cognitive reframing.',
          evidence: 'Session 5: client applied the distinction to recent career choices and described it as clarifying.',
          status: 'improving',
          flaggedForReview: false,
          flagReason: '',
        },
      ],
      interventionStrategy: 'CBT-oriented reframing, brief mindfulness/stillness exercises, Socratic questioning, values clarification.',
      currentPlan: 'Continue stillness practice between sessions; extend values-based motivation framework to career decision-making; monitor for perfectionistic themes as a possible unifying focus.',
      nextClinicalFocus: 'Consider whether perfectionism/intolerance of uncertainty should become an explicit treatment target given evidence from Sessions 4-5.',
    },
    treatmentPlanHistory: [],
    treatmentReview: {
      whatIsChanging: 'Client is beginning to differentiate fear-based from values-based motivation and has tolerated initial stillness exercises with decreasing distress.',
      responseToIntervention: 'Positive engagement with reframing and values clarification; between-session exercises completed as assigned.',
      progressToward: 'Early but consistent movement toward goals 2 and 3; goal 1 (anxiety reduction) not yet independently measured — consider a standardized measure (e.g., GAD-7) going forward.',
      progressClassification: 'improvement',
      planFit: 'Plan still fits current formulation, though perfectionism/intolerance of uncertainty may warrant explicit incorporation as evidence accumulates.',
      emergingPriorities: 'Consider formally exploring perfectionism as a treatment target; consider adding a standardized anxiety measure for tracking.',
      lastUpdated: now,
      domains: [],
    },
    casePresentation: {
      demographics: 'Adult client, early career, performing arts field.',
      presentingConcerns: [],
      keyFindings: 'Generalized anxiety with productivity/rest conflict; self-worth contingent on output; possible perfectionism thread.',
      background: 'History of panic attacks (undergraduate years), now resolved.',
      formulationSummary: formulationSynthesis,
      emotionalPresentation: emotionSummary,
      currentClinicalPicture: '',
      interventionsAndPlans: 'CBT reframing, mindfulness/stillness exercises, values clarification; plan to extend to perfectionism-focused work.',
      reasonForPresentation: 'Consultation on whether to formally incorporate perfectionism/intolerance of uncertainty as an explicit treatment target.',
      checklist: {
        demographicsComplete: true,
        keyFindingsIdentified: true,
        backgroundEstablished: false,
        formulationSupported: true,
        interventionsDocumented: true,
        clientResponseDocumented: true,
        progressDocumented: false,
        reasonSpecific: true,
        supervisionQuestionIdentified: true,
      },
    },
    casePresentationHistory: [],
    pendingSuggestions: [],
    supervisionQuestions: [
      { id: 'k-sq1', question: 'What recurring pattern appears most clinically important across sessions — the productivity/rest conflict, or the underlying self-worth belief?', createdAt: now, resolved: false },
      { id: 'k-sq2', question: 'Where might I be moving too quickly from exploration into reframing, before the client has fully articulated her own understanding?', createdAt: now, resolved: false },
      { id: 'k-sq3', question: 'Is there enough evidence yet to formally add perfectionism/intolerance of uncertainty to the treatment focus, or is this premature?', createdAt: now, resolved: false },
    ],
    clinicalLearning: [
      {
        id: 'k-cl1',
        date: '2026-03-17',
        skillPracticed: 'Cognitive reframing and values clarification.',
        facilitatedWell: 'Used the client\'s own language ("two different brains") to deepen the reframing work rather than imposing external framing.',
        movedTooQuickly: 'May have moved into reframing before fully validating how uncomfortable the stillness exercise was.',
        genuinelyUnsure: 'Unsure whether perfectionism is truly a distinct treatment target or simply a restatement of the productivity/self-worth pattern already identified.',
        selfNoticing: 'Noticed my own pull toward wanting to "solve" the productivity conflict quickly rather than staying longer in exploration.',
        bringToSupervision: 'Whether to formally introduce perfectionism-focused interventions or continue broader values-based work.',
      },
    ],
    documentationGaps: [],
    sessions,
    createdAt: now,
    updatedAt: now,
  }
}

function buildClientL(): Client {
  const now = new Date().toISOString()
  let themes: string[] = []
  const sessions: Client['sessions'] = []

  const s1 = buildSession(
    1,
    '2026-02-10',
    1.0,
    'Client presents with significant relationship stress related to co-parenting dynamics with a former partner. Describes difficulty setting boundaries and frequent emotional exhaustion following interactions. Also reports employment uncertainty as a compounding stressor, with recent job changes contributing to instability.',
    'Initial intake; validation of emotional exhaustion; began problem clarification around co-parenting communication.',
    'Client was visibly relieved to have space to process the relationship stress without judgment.',
    'Continue clarifying specific boundary-setting situations; gather more detail on employment situation.',
    themes,
  )
  sessions.push(s1.session)
  themes = s1.themesAfter

  const s2 = buildSession(
    2,
    '2026-02-24',
    1.0,
    'Focused on boundary-setting within the co-parenting relationship. Client described specific recent incidents where communication broke down, leading to increased conflict. Explored underlying beliefs about conflict avoidance and the fear that setting boundaries would escalate tension further.',
    'Socratic questioning to examine beliefs about boundary-setting and conflict; CBT-oriented reframing of "setting a boundary means starting a fight."',
    'Client identified the specific belief driving her avoidance and appeared surprised by how automatic it was.',
    'Practice one small boundary-setting statement before next session; continue tracking co-parenting communication patterns.',
    themes,
  )
  sessions.push(s2.session)
  themes = s2.themesAfter

  const s3 = buildSession(
    3,
    '2026-03-10',
    1.0,
    'Client reported attempting a small boundary-setting conversation, with mixed results — some initial pushback but ultimately a calmer outcome than anticipated. Continued discussion of employment uncertainty, including emotional exhaustion from balancing job search stress with co-parenting demands. Some early self-discovery material emerged around what client wants for herself outside of the relationship and parenting roles.',
    'Validation of the boundary-setting attempt; CBT reframing of the pushback as expected rather than evidence of failure; brief exploration of self-discovery themes.',
    'Client reported feeling proud of the attempt despite the discomfort, and expressed interest in exploring the self-discovery thread further.',
    'Continue boundary-setting practice; begin more direct exploration of self-discovery/identity outside of current roles.',
    themes,
  )
  sessions.push(s3.session)
  themes = s3.themesAfter

  const emotionSummary = computeEmotionSummary(sessions)
  const cognitiveLabels = Array.from(new Set(sessions.flatMap((s) => s.extracted.cognitiveDistortions)))
  const behavioralLabels = Array.from(new Set(sessions.flatMap((s) => s.extracted.behavioralPatterns)))
  const relationalLabels = Array.from(new Set(sessions.flatMap((s) => s.extracted.relationalPatterns)))
  const lastSession = sessions[sessions.length - 1]
  const maintainingCycle = computeMaintainingCycle(
    cognitiveLabels,
    behavioralLabels,
    lastSession?.extracted.emotions[0] ?? '',
    lastSession?.extracted.triggers[lastSession.extracted.triggers.length - 1] ?? '',
  )

  const formulationSynthesis = `Client presents with adjustment-related distress connected to co-parenting relationship stress, boundary-setting difficulty, and compounding employment uncertainty. A recurring pattern links conflict-avoidant beliefs ("setting a boundary means starting a fight") to emotional exhaustion. Early self-discovery material (Session 3) suggests the client may be beginning to differentiate her own identity from her relationship and parenting roles — this is an emerging thread with limited evidence so far and should be watched across future sessions rather than treated as established.`

  return {
    id: 'client-l',
    label: 'Client L',
    age: 34,
    diagnosis: 'Adjustment Disorder',
    status: 'Active',
    presentingConcern: 'Relationship/co-parenting stress, boundary-setting difficulty, and employment uncertainty.',
    demographics: 'Adult client, co-parenting a child with a former partner, navigating employment transition.',
    background: 'Background history not yet fully documented — consider expanding in future sessions.',
    themes,
    formulation: {
      presenting: 'Emotional exhaustion, relationship/co-parenting stress, boundary-setting difficulty.',
      predisposing: 'Not yet documented — consider exploring developmental or relational history relevant to conflict avoidance.',
      precipitating: 'Co-parenting conflict; employment uncertainty/job transition.',
      perpetuating: 'Conflict-avoidant belief that boundary-setting escalates tension; compounding stress from employment instability.',
      protective: 'Willingness to attempt boundary-setting despite discomfort; emerging interest in self-discovery.',
      workingSynthesis: formulationSynthesis,
      patternMap: {
        contextTrigger: 'Co-parenting communication, or employment-related stress.',
        interpretation: 'Possible belief: "Setting a boundary means starting a fight."',
        emotion: emotionSummary,
        behavior: 'Conflict avoidance, over-accommodation, followed by exhaustion.',
      },
      alternativeFormulation: {
        alternative: '',
        distinguishingEvidence: '',
      },
      gaps: 'Developmental/relational history not yet established. Unclear whether conflict-avoidant pattern predates the co-parenting relationship or is specific to it.',
      cognitivePatterns: draftPatternNarrative('cognitive', cognitiveLabels),
      cognitivePatternLabels: cognitiveLabels,
      emotionalPatterns: '',
      behavioralPatterns: draftPatternNarrative('behavioral', behavioralLabels),
      behavioralPatternLabels: behavioralLabels,
      relationalPatterns: draftPatternNarrative('relational', relationalLabels),
      relationalPatternLabels: relationalLabels,
      maintainingCycle,
      theoreticalFrameworks: [],
    },
    formulationHistory: [],
    treatmentPlan: {
      presentingFocus: 'Boundary-setting, co-parenting relationship stress, and employment-related uncertainty.',
      rationale: 'Emotional exhaustion appears maintained by conflict-avoidant beliefs; treatment focuses on building boundary-setting skills and reframing conflict-avoidant assumptions.',
      goals: [
        {
          id: 'l-g1',
          text: 'Increase frequency of boundary-setting attempts in co-parenting communication.',
          objectives: 'Practice at least one boundary-setting statement per week in co-parenting communication.',
          interventions: 'CBT-oriented reframing, Socratic questioning.',
          evidence: 'Session 3: client attempted a boundary-setting conversation with a calmer-than-expected outcome.',
          status: 'improving',
          flaggedForReview: false,
          flagReason: '',
        },
        {
          id: 'l-g2',
          text: 'Reduce emotional exhaustion following co-parenting interactions.',
          objectives: 'Identify early signs of exhaustion and one coping response to use in the moment.',
          interventions: 'Validation, problem clarification.',
          evidence: 'Insufficient evidence yet — not directly measured across sessions.',
          status: 'active',
          flaggedForReview: false,
          flagReason: '',
        },
        {
          id: 'l-g3',
          text: 'Begin articulating identity and goals outside of relationship/parenting roles.',
          objectives: 'Explore at least one interest or goal unrelated to co-parenting or relationship roles.',
          interventions: 'Exploratory questioning.',
          evidence: 'Session 3: early self-discovery material emerged; client expressed interest in exploring further.',
          status: 'not_started',
          flaggedForReview: false,
          flagReason: '',
        },
      ],
      interventionStrategy: 'CBT-oriented reframing, validation, Socratic questioning, problem clarification.',
      currentPlan: 'Continue graduated boundary-setting practice; monitor employment-related stress; begin light self-discovery exploration as client shows readiness.',
      nextClinicalFocus: 'Watch whether the self-discovery thread develops into a more explicit treatment focus, or remains secondary to boundary-setting work.',
    },
    treatmentPlanHistory: [],
    treatmentReview: {
      whatIsChanging: 'Client has begun taking small boundary-setting risks and reports somewhat better-than-expected outcomes.',
      responseToIntervention: 'Positive early response to reframing of pushback as expected rather than failure.',
      progressToward: 'Early movement toward goal 1; goals 2 and 3 not yet clearly evidenced — insufficient data at this stage.',
      progressClassification: 'insufficient_evidence',
      planFit: 'Plan still fits current formulation; self-discovery thread may warrant more explicit attention as it develops.',
      emergingPriorities: 'Watch for further self-discovery material; monitor employment situation as an ongoing stressor.',
      lastUpdated: now,
      domains: [],
    },
    casePresentation: {
      demographics: 'Adult client, co-parenting, employment transition.',
      presentingConcerns: [],
      keyFindings: 'Conflict-avoidant boundary-setting pattern maintaining emotional exhaustion; emerging self-discovery thread.',
      background: 'Background history incomplete — consider expanding before formal presentation.',
      formulationSummary: formulationSynthesis,
      emotionalPresentation: emotionSummary,
      currentClinicalPicture: '',
      interventionsAndPlans: 'CBT reframing, validation, Socratic questioning; graduated boundary-setting practice.',
      reasonForPresentation: 'Consultation on how to support the emerging self-discovery thread without prematurely shifting focus away from boundary-setting work.',
      checklist: {
        demographicsComplete: true,
        keyFindingsIdentified: true,
        backgroundEstablished: false,
        formulationSupported: true,
        interventionsDocumented: true,
        clientResponseDocumented: true,
        progressDocumented: false,
        reasonSpecific: true,
        supervisionQuestionIdentified: true,
      },
    },
    casePresentationHistory: [],
    pendingSuggestions: [],
    supervisionQuestions: [
      { id: 'l-sq1', question: 'What recurring pattern appears most clinically important — the boundary-setting difficulty, or the underlying conflict-avoidant belief?', createdAt: now, resolved: false },
      { id: 'l-sq2', question: 'Is the self-discovery material substantial enough yet to warrant its own treatment focus, or should it remain secondary for now?', createdAt: now, resolved: false },
      { id: 'l-sq3', question: 'What information is still missing (e.g., developmental history) that could change the current formulation?', createdAt: now, resolved: false },
    ],
    clinicalLearning: [
      {
        id: 'l-cl1',
        date: '2026-03-10',
        skillPracticed: 'Validation paired with cognitive reframing.',
        facilitatedWell: 'Validated the discomfort of the boundary-setting attempt before reframing the outcome, which seemed to land well.',
        movedTooQuickly: 'Possibly introduced the self-discovery thread before the client had fully processed the boundary-setting win.',
        genuinelyUnsure: 'Unsure how much weight to give the self-discovery material this early — could be a passing comment or a genuine emerging theme.',
        selfNoticing: 'Noticed relief on my own part when the client reported a positive boundary-setting outcome — worth watching that I don\'t overweight positive results.',
        bringToSupervision: 'How to pace exploration of the self-discovery thread relative to the primary boundary-setting work.',
      },
    ],
    documentationGaps: [],
    sessions,
    createdAt: now,
    updatedAt: now,
  }
}

export function buildSeedClients(): Client[] {
  return [buildClientK(), buildClientL()].map((c) => {
    const withAggregates = { ...c, ...computeClientAggregates(c) }
    return { ...withAggregates, documentationGaps: scanDocumentationGaps(withAggregates) }
  })
}

export function buildSeedPracticum(): PracticumState {
  const entries: PracticumState['entries'] = []
  const k = buildClientK()
  const l = buildClientL()
  ;[k, l].forEach((c) => {
    c.sessions.forEach((s) => {
      entries.push({
        id: `seed-hours-${s.id}`,
        kind: 'direct',
        amount: s.duration,
        label: `${c.label} — Session ${s.sessionNumber}`,
        date: s.date,
        clientId: c.id,
        sessionId: s.id,
      })
    })
  })
  return {
    settings: { directTarget: 200, indirectTarget: 200 },
    entries,
  }
}
