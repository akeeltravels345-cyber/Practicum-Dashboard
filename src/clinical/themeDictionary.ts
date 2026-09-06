// Keyword heuristics used to draft theme/extraction suggestions from raw session text.
// This is a lightweight, transparent, rule-based assistant — NOT clinical AI.
// Every output it produces is a draft the clinician must review and confirm.

export const THEME_KEYWORDS: Record<string, string[]> = {
  Anxiety: ['anxious', 'anxiety', 'worry', 'worried', 'on edge', 'panic', 'racing thoughts', 'tense'],
  Identity: ['identity', 'who i am', 'sense of self', 'authentic', 'true self'],
  Career: ['career', 'job', 'work', 'acting', 'audition', 'profession', 'employment'],
  Stillness: ['stillness', 'rest', 'slowing down', 'boredom', 'doing nothing', 'sit still'],
  'Self-worth': ['self-worth', 'self worth', 'not good enough', 'worthless', 'self-esteem', 'value as a person'],
  Boundaries: ['boundary', 'boundaries', 'saying no', 'limits'],
  Relationship: ['relationship', 'partner', 'co-parent', 'coparent', 'marriage', 'dating'],
  Communication: ['communication', 'communicate', 'conversation', 'expressing', 'assertive'],
  Productivity: ['productivity', 'productive', 'busy', 'accomplish', 'output'],
  Uncertainty: ['uncertain', 'uncertainty', 'unknown', 'ambiguous', 'not knowing'],
  'Fear-based motivation': ['fear-based', 'fear of failure', 'afraid of failing', 'driven by fear'],
  Comparison: ['comparison', 'compare myself', 'comparing', 'other people seem'],
  Employment: ['employment', 'job search', 'unemployed', 'interview', 'workplace'],
  'Self-discovery': ['self-discovery', 'figuring myself out', 'exploring who', 'learning about myself'],
  Perfectionism: ['perfectionis', 'high standards', 'never good enough', 'has to be perfect'],
  'Intolerance of uncertainty': ['intolerance of uncertainty', 'need to know', 'cant stand not knowing', "can't stand not knowing"],
}

export const RISK_KEYWORDS = [
  'suicid', 'self-harm', 'self harm', 'kill myself', 'end my life', 'hopeless',
  'homicid', 'unsafe', 'harm to others', 'safety plan', 'risk assessment',
]

// Stems rather than exact words, so both noun and adjective forms match
// (e.g. "anxi" catches "anxiety" and "anxious"; "guilt" catches "guilt" and "guilty").
export const EMOTION_KEYWORDS: Record<string, string[]> = {
  Anxiety: ['anxi'],
  Sadness: ['sad'],
  Anger: ['angr'],
  Frustration: ['frustrat'],
  Overwhelm: ['overwhelm'],
  Numbness: ['numb'],
  Hope: ['hopeful', 'hope'],
  Hopelessness: ['hopeless'],
  Relief: ['relie'],
  Guilt: ['guilt'],
  Shame: ['asham', 'shame'],
  Exhaustion: ['exhaust'],
  Calm: ['calm'],
  Fear: ['afraid', 'scared', 'fear'],
  Grief: ['grief'],
  Loneliness: ['lonely', 'lonel'],
  Pride: ['proud', 'pride'],
  Discomfort: ['discomfort', 'uncomfortable'],
  Curiosity: ['curio'],
  Surprise: ['surpris'],
}

export const COPING_KEYWORDS = [
  'meditation', 'meditate', 'journaling', 'exercise', 'breathing', 'grounding',
  'talking to a friend', 'avoidance', 'distraction', 'reframing',
]

export const INTERVENTION_KEYWORDS = [
  'cbt', 'cognitive', 'reframe', 'reframing', 'socratic', 'psychoeducation',
  'validation', 'mindfulness', 'exposure', 'behavioral activation', 'motivational interviewing',
]

// Markers used to split a single pasted session note into its Interventions /
// Client Response / Plan sections when the clinician pastes one blob of text
// rather than filling those fields separately. Heuristic and imperfect by
// design — every result stays editable, and the raw note itself is never
// altered.
export const INTERVENTION_MARKERS = [
  'used ', 'introduced ', 'explored ', 'utilized ', 'utilised ', 'implemented ', 'facilitated ',
  'employed ', 'applied ', 'practiced ', 'practised ', 'guided ', 'led client through',
  'therapist ', 'intervention', 'technique',
]

export const RESPONSE_MARKERS = [
  'client reported', 'client stated', 'client noted', 'client described', 'client appeared',
  'client expressed', 'client responded', 'client shared', 'client indicated', 'client felt',
  'client seemed', 'client identified', 'client acknowledged', 'client reflected', 'she reported',
  'he reported', 'they reported', 'she stated', 'he stated', 'they stated', 'she noted', 'he noted',
  'she appeared', 'he appeared', 'she expressed', 'he expressed',
]

export const PLAN_MARKERS = [
  'plan is to', 'plan:', 'homework', 'next session', 'will continue', 'moving forward',
  'between sessions', 'continue to', 'assigned', 'goal for next', 'follow up on', 'follow-up on',
  'to be discussed next', 'will explore', 'next step',
]

export const STRENGTH_KEYWORDS = [
  'insight', 'motivated', 'supportive', 'resilien', 'self-aware', 'engaged', 'open to',
]

export const COGNITIVE_DISTORTION_KEYWORDS: Record<string, string[]> = {
  Catastrophizing: ['catastroph', 'worst that could happen', 'everything will fall apart', 'ruined'],
  'All-or-Nothing Thinking': ['all or nothing', 'always fail', 'never good enough', 'completely fail', 'total failure'],
  'Mind Reading': ['they think im', "they think i'm", 'everyone thinks', 'must think im', "must think i'm"],
  'Should Statements': ['i should', 'i should have', 'supposed to', 'have to be'],
  Overgeneralization: ['always happens', 'never works out', 'every time this happens'],
  Personalization: ['my fault', 'because of me', 'i caused'],
  'Emotional Reasoning': ['i feel like a failure so', 'feels true so it must be'],
  'Fortune Telling': ['its going to go wrong', "it's going to go wrong", 'i just know it will'],
  'Discounting the Positive': ['doesnt count', "doesn't count", 'not a big deal', 'anyone could have done that'],
  Labeling: ['im a failure', "i'm a failure", 'im broken', "i'm broken", 'im not enough', "i'm not enough"],
}

export const BEHAVIORAL_PATTERN_KEYWORDS: Record<string, string[]> = {
  Avoidance: ['avoid', 'putting off', 'procrastinat', 'cancel'],
  'Reassurance-Seeking': ['reassurance', 'asking others if', 'need to be told', 'checking in repeatedly'],
  'People-Pleasing': ['people-pleas', 'people pleas', 'cant say no', "can't say no", 'afraid to disappoint'],
  Withdrawal: ['withdraw', 'isolat', 'pulling away', 'shutting down'],
  Overworking: ['overwork', 'cant stop working', "can't stop working", 'working constantly', 'unable to rest'],
  'Substance Use': ['drinking more', 'using substances', 'alcohol', 'drug use', 'substance use'],
  'Checking Behaviors': ['checking repeatedly', 're-checking', 'rechecking'],
}

export const RELATIONAL_PATTERN_KEYWORDS: Record<string, string[]> = {
  'Conflict Avoidance': ['avoid conflict', 'conflict-avoid', 'afraid to disagree', 'avoids confrontation'],
  'Boundary Difficulty': ['difficulty setting boundaries', 'cant say no', "can't say no", 'over-accommodat'],
  Caretaking: ['taking care of everyone else', 'caretak', 'puts others first'],
  'Fear of Abandonment': ['afraid theyll leave', "afraid they'll leave", 'fear of abandonment', 'scared of being left'],
  'Difficulty Trusting': ['hard to trust', 'difficulty trusting', 'doesnt trust', "doesn't trust"],
  'Communication Difficulty': ['difficulty communicating', 'hard to express', 'shuts down during conversations'],
  'Attachment Anxiety': ['needs constant reassurance from partner', 'worries partner will leave', 'clingy'],
}

// Evidence markers used to weigh which theoretical framework best explains
// the accumulated clinical picture. This is a transparent keyword tally,
// not a diagnostic or theoretical determination — always shown as HYPOTHESIS.
export const FRAMEWORK_EVIDENCE_KEYWORDS: Record<string, string[]> = {
  CBT: ['cognitive', 'reframe', 'reframing', 'automatic thought', 'cognitive distortion', 'core belief', 'socratic'],
  'Person-Centered': ['validation', 'unconditional', 'empath', 'client-led', 'client led', 'reflective listening'],
  'Trauma-Informed': ['trauma', 'safety plan', 'hypervigilan', 'triggered by', 'flashback', 'nervous system'],
  Attachment: ['attachment', 'abandonment', 'early relationship', 'caregiver', 'trust in relationships'],
  Psychodynamic: ['unconscious', 'early experience', 'defense mechanism', 'insight into pattern', 'family of origin'],
  ACT: ['values-based', 'values based', 'acceptance', 'psychological flexibility', 'defusion', 'willingness'],
  DBT: ['distress tolerance', 'emotion regulation', 'radical acceptance', 'wise mind', 'interpersonal effectiveness'],
  'Solution-Focused': ['exception to the problem', 'what would be different', 'small steps', 'scaling question'],
  'Strengths-Based': ['strength', 'resilien', 'resourceful', 'capable', 'what is working well'],
  'Spiritually Integrated': ['faith', 'spiritual', 'prayer', 'meaning and purpose', 'religious'],
}

export const IMPROVING_MARKERS = [
  'improv', 'better', 'progress', 'reduc', 'decreas', 'increased tolerance', 'more able',
  'no longer', 'successfully', 'confidence growing', 'less frequent', 'more consistent',
]
export const WORSENING_MARKERS = [
  'worse', 'worsen', 'increased', 'relapse', 'setback', 'struggl', 'unable to', 'regressed',
  'more frequent', 'more difficult', 'declined',
]
export const STABLE_MARKERS = ['consistent with', 'maintain', 'similar to previous', 'no change', 'remains stable']

export const DOMAIN_RELEVANCE_KEYWORDS: Record<string, string[]> = {
  Symptoms: ['anxi', 'depress', 'symptom', 'panic', 'intrusive', 'distress'],
  Functioning: ['sleep', 'appetite', 'work', 'school', 'daily', 'function', 'concentrat'],
  'Emotional Regulation': ['regulat', 'overwhelm', 'calm', 'manage emotion', 'tolerate', 'emotional control'],
  Cognitions: ['belief', 'thought', 'thinking', 'reframe', 'automatic thought', 'assumption'],
  Behaviors: ['avoid', 'withdraw', 'overwork', 'people-pleas', 'reassurance', 'behavior'],
  Relationships: ['relationship', 'boundary', 'communicat', 'partner', 'co-parent', 'family', 'friend'],
  Coping: ['coping', 'meditat', 'journal', 'ground', 'breathing exercise', 'self-care'],
  Insight: ['insight', 'realized', 'aware that', 'understand now', 'recognize'],
  Motivation: ['motivat', 'engaged', 'reluctant', 'ambivalent', 'committed to'],
  'Goal Attainment': ['goal', 'objective', 'homework', 'practiced'],
  'Risk/Protective Factors': ['risk', 'safety', 'protective', 'support system'],
  Strengths: ['strength', 'resilien', 'capable', 'resourceful'],
}

// Flags a diagnostic *consideration* only — never a diagnosis itself. Always
// surfaced as "Diagnostic consideration for further assessment."
export const DIAGNOSTIC_FLAG_KEYWORDS: Record<string, string[]> = {
  'Possible trauma history': ['trauma', 'flashback', 'hypervigilan', 'nightmares related to'],
  'Possible substance use concern': ['drinking more', 'using substances', 'substance use', 'alcohol use'],
  'Possible mood episode (mania/hypomania)': ['racing thoughts and little sleep', 'elevated mood', 'grandios', 'impulsive spending'],
  'Possible disordered eating pattern': ['restricting food', 'binge', 'purge', 'body image distress'],
  'Possible obsessive-compulsive pattern': ['intrusive thoughts and rituals', 'compulsive checking', 'repetitive rituals'],
  'Possible attention/concentration difficulty': ['difficulty concentrating consistently', 'easily distracted', 'trouble focusing'],
}

export function findKeywordHits(text: string, keywords: string[]): string[] {
  const lower = text.toLowerCase()
  return keywords.filter((k) => lower.includes(k.toLowerCase()))
}

export function detectLabels(text: string, dictionary: Record<string, string[]>): string[] {
  const lower = text.toLowerCase()
  const hits: string[] = []
  for (const [label, keywords] of Object.entries(dictionary)) {
    if (keywords.some((k) => lower.includes(k.toLowerCase()))) hits.push(label)
  }
  return hits
}

export function detectThemes(text: string): string[] {
  return detectLabels(text, THEME_KEYWORDS)
}

export function detectEmotions(text: string): string[] {
  return detectLabels(text, EMOTION_KEYWORDS)
}
