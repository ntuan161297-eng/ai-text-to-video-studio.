/**
 * CONTENT BRAIN CONTRACTS & SCHEMAS
 * Strict TypeScript boundaries for:
 *   InputUnderstanding → ResearchPlanning → SourceDiscovery → FactLayer →
 *   KnowledgeBrief → ContentStrategist → CreativeAngles → HookEngine →
 *   SeniorScriptWriter → IndependentScriptReviewer → ScriptQualityGate →
 *   ApprovedScriptPackage.
 */

export type ContentType =
  | 'NEWS'
  | 'CURRENT_EVENT'
  | 'REAL_PERSON'
  | 'REAL_PRODUCT'
  | 'REAL_LOCATION'
  | 'REAL_ESTATE'
  | 'FINANCE'
  | 'BUSINESS'
  | 'TECH'
  | 'TRAVEL'
  | 'EDUCATION'
  | 'HISTORY'
  | 'DOCUMENTARY'
  | 'EXPLAINER'
  | 'LISTICLE'
  | 'STORY'
  | 'LIFESTYLE'
  | 'CONCEPTUAL'
  | 'OTHER';

export interface ContentBrief {
  originalRequest: string;
  topic: string;
  primaryEntities: string[];
  contentType: ContentType;
  targetAudience: string;
  viewerIntent: string;
  creatorGoal: string;
  targetPlatform: 'tiktok' | 'reels' | 'shorts';
  targetDuration: number; // 30, 45, 60, 90, 120, 180
  language: 'vi';
  tone: string;
  factualSensitivity: 'HIGH' | 'MEDIUM' | 'LOW';
  freshnessRequirement: 'LATEST' | 'RECENT' | 'EVERGREEN';
  researchRequired: boolean;
}

export type QueryPurpose =
  | 'DISCOVERY'
  | 'OFFICIAL'
  | 'FACT_CHECK'
  | 'RECENT_NEWS'
  | 'ENTITY'
  | 'VISUAL_SOURCE';

export interface PlannedQuery {
  query: string;
  purpose: QueryPurpose;
  targetEntity?: string;
}

export interface ResearchQueryPlan {
  coreQuestions: string[];
  subQuestions: string[];
  entities: string[];
  factsToVerify: string[];
  visualAssetsToFind: string[];
  queries: PlannedQuery[];
}

export type SourceType =
  | 'PRIMARY_OFFICIAL'
  | 'GOV_ORGANIZATION'
  | 'REPUTABLE_JOURNALISM'
  | 'INDUSTRY_SPECIALIST'
  | 'RELIABLE_SECONDARY';

export interface SourceQualityScores {
  authority: number;     // 0 - 20
  relevance: number;     // 0 - 25
  freshness: number;     // 0 - 15
  originality: number;   // 0 - 15
  entityMatch: number;   // 0 - 15
  contentQuality: number;// 0 - 10
  totalScore: number;    // 0 - 100
}

export interface CleanedSourceDocument {
  id: string;
  url: string;
  domain: string;
  sourceName: string;
  sourceType: SourceType;
  title: string;
  rawContent: string;
  cleanContent: string;
  extractedImages: string[];
  scores: SourceQualityScores;
  isApproved: boolean;
  rejectionReason?: string;
}

export interface VerifiedFact {
  id: string;
  claim: string;
  evidenceText: string;
  sourceUrl: string;
  sourceName: string;
  sourceType: SourceType;
  confidence: number; // 0 - 100
  relevance: number;  // 0 - 100
  freshness: string;
  entities: string[];
  isSensitiveNumber: boolean;
  supportsTopic?: boolean;
  supportsResearchObjective?: boolean;
  semanticRelevance?: number;
  sourceEvidence?: string;
  isConflicted?: boolean;
  conflictDetails?: string;
}

export interface KnowledgeBrief {
  topicSummary: string;
  keyEntities: string[];
  importantFacts: string[];
  interestingFacts: string[];
  surprisingFacts: string[];
  usefulNumbers: string[];
  viewerQuestions: string[];
  potentialMisconceptions: string[];
  conflictsOrNuances: string[];
  visualOpportunities: string[];
  realWorldAssetsNeeded: string[];
  factsToAvoid: string[];
}

export interface AudienceStrategy {
  targetAudience: string;
  viewerProblem: string;
  viewerPromise: string;
  mainTakeaway: string;
  emotionalDirection: string;
  contentDepth: string;
  storyOpportunity: string;
}

export type AngleType =
  | 'DISCOVERY'
  | 'PROBLEM_SOLUTION'
  | 'MYTH_REALITY'
  | 'COMPARISON'
  | 'STORY_JOURNEY'
  | 'DATA_MEANING'
  | 'UNEXPECTED_FACT'
  | 'CAUSE_CONSEQUENCE'
  | 'PAST_PRESENT'
  | 'WHY_IT_MATTERS';

export interface CreativeAngleCandidate {
  id: string;
  angleType: AngleType;
  angle: string;
  coreIdea: string;
  viewerPromise: string;
  storyStructure: string;
  visualPotential: number; // 0 - 100
  novelty: number;         // 0 - 100
  evidenceStrength: number;// 0 - 100
  retentionPotential: number; // 0 - 100
  durationFit: number;     // 0 - 100
  totalScore: number;      // 0 - 100
  selectionRationale?: string;
}

export type HookMechanism =
  | 'specific_fact'
  | 'question'
  | 'consequence'
  | 'contradiction'
  | 'comparison'
  | 'reveal'
  | 'problem'
  | 'visual_hook'
  | 'direct_value';

export interface HookCandidate {
  id: string;
  mechanism: HookMechanism;
  hookText: string;
  screenHeadline: string;
  visualIdea: string;
  retentionRationale: string;
  score: number; // 0 - 100
}

export type CtaType =
  | 'COMMENT'
  | 'FOLLOW'
  | 'SAVE'
  | 'SHARE'
  | 'NEXT_EPISODE'
  | 'QUESTION'
  | 'NONE';

export interface ScriptBeatDisplayCopy {
  headline: string;        // 2 - 7 words strictly
  supportingText?: string; // <= 12 words
  metricBadge?: string;    // E.g. "200 KM/H", "95%", "15 TỶ"
}

export interface ScriptBeat {
  beatId: number;
  purpose: 'opening_hook' | 'setup' | 'body_progression' | 'rehook_reveal' | 'payoff' | 'ending' | 'cta';
  viewerQuestion: string;
  newInformation: string;
  whyItMatters: string;
  retentionFunction: string;
  factIds: string[];
  narration: string; // Strictly clean spoken Vietnamese, 1 sentence ≈ 1 idea
  expectedEntities: string[];
  targetDurationSec: number;
  displayCopy: ScriptBeatDisplayCopy;
  visualPromptSuggestion: string;
}

export interface ScriptReviewIssue {
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  dimension:
    | 'FACTUAL_SUPPORT'
    | 'TOPIC_RELEVANCE'
    | 'HOOK_STRENGTH'
    | 'NATURAL_VIETNAMESE'
    | 'STORY_PROGRESSION'
    | 'INFORMATION_VALUE'
    | 'REPETITION'
    | 'RETENTION'
    | 'ENDING_PAYOFF'
    | 'CTA_FIT'
    | 'DURATION_FIT'
    | 'RESEARCH_METADATA_LEAK';
  problem: string;
  evidence: string;
  recommendedFix: string;
}

export interface ScriptReviewReport {
  passed: boolean;
  score: number; // 0 - 100 (evidence-backed)
  scoreBreakdown: {
    factualSupport: number;
    hookAndOpening: number;
    vietnameseNaturalness: number;
    storyProgression: number;
    valueAndRetention: number;
    endingAndCta: number;
    antiLeakPurity: number;
  };
  issues: ScriptReviewIssue[];
  criticalCount: number;
  majorCount: number;
  minorCount: number;
  reviewerSummary: string;
  detailedEvaluation?: {
    hookTopicAlignment: { passed: boolean; note: string; quote?: string };
    viewerValueProposition: { passed: boolean; note: string; promise: string };
    narrativeProgression: { passed: boolean; note: string };
    aiSummaryTone: { passed: boolean; note: string; quote?: string };
    clicheGenericCheck: { passed: boolean; note: string; quote?: string };
    endingPayoff: { passed: boolean; note: string; quote?: string };
    ctaAppropriateness: { passed: boolean; note: string; quote?: string };
    durationAdequacy: { passed: boolean; note: string; wordCount: number; targetDuration: number };
  };
}

/**
 * APPROVED SCRIPT PACKAGE
 * The strict, sole handover contract delivered from the Content Brain
 * to the Production Engine.
 */
export interface ApprovedScriptPackage {
  title: string;
  viewerPromise: string;
  selectedAngle: string;
  targetDuration: number;
  contentType: ContentType;
  primaryEntities: string[];
  ctaType: CtaType;
  opening: ScriptBeat;
  beats: ScriptBeat[];
  ending: ScriptBeat;
  cta: ScriptBeat;
  allBeats: ScriptBeat[];
  fullNarration: string;
  estimatedDuration: number;
  approved: boolean;
  approvalReport: {
    reviewerScore: number;
    zeroCriticalIssues: boolean;
    timestamp: string;
  };
}
