/**
 * UNIVERSAL MULTI-DOMAIN VIDEO ENGINE CONTRACTS
 * Invariant TypeScript boundaries for:
 *   UniversalIntentEngine → TopicContract & DurationContract →
 *   AdaptiveResearchPlanner → KnowledgeBrief →
 *   AdaptiveContentPlanner → UniversalScriptWriter →
 *   IndependentScriptReviewer → ApprovedScript →
 *   TTS Duration Reconciliation Loop → Storyboard → RenderManifest → FinalQA
 */

export interface UserIntentSpec {
  requestId: string;
  originalUserRequest: string;
  primarySubject: string;
  userGoal: 'INFORM' | 'EDUCATE' | 'REVIEW' | 'ENTERTAIN' | 'INSPIRE' | 'PROMOTE' | 'DOCUMENT' | 'EXPLAIN' | 'TUTORIAL' | 'GENERAL';
  communicationGoal: string;
  audience: string;
  contentMode: string; // Open-ended domain mode (e.g. explainer, news, travel, review, etc.)
  informationDepth: 'HIGH' | 'MEDIUM' | 'SUMMARY';
  tone: string; // e.g. điềm đạm, hào hứng, trang trọng, lôi cuốn, phân tích khách quan
  factualityLevel: 'STRICT' | 'BALANCED' | 'CREATIVE';
  freshnessRequirement: 'LATEST' | 'RECENT' | 'EVERGREEN';
  requestedDurationSeconds: number; // Inviolable duration requested by user
  targetPlatform: string; // 'web' | 'youtube' | 'tiktok' | 'internal' | 'general'
  targetAspectRatio: '9:16' | '16:9' | '1:1';
  visualExpectation: 'REAL_FOOTAGE' | 'INFOGRAPHIC' | 'TYPOGRAPHY' | 'MIXED';
  userConstraints: string[];
  requiredEntities: string[];
  optionalEntities: string[];
  excludedScope: string[];
  assumptions: string[];
  ambiguities: string[];
  confidenceScore: number;
  needsClarification: boolean;
}

export interface TopicContract {
  coreTopic: string;
  coreQuestion: string;
  requiredCoverage: string[];
  allowedExpansion: string[];
  prohibitedExpansion: string[];
  requiredEntities: string[];
  relevanceCriteria: string;
}

export interface DurationContract {
  requestedSeconds: number;
  minimumAcceptedSeconds: number; // e.g. requested - 3s
  maximumAcceptedSeconds: number; // e.g. requested + 3s
}

export interface AdaptiveResearchPlan {
  researchObjectives: string[];
  researchQuestions: string[];
  entitiesToVerify: string[];
  freshnessNeeds: 'LATEST' | 'RECENT' | 'EVERGREEN';
  sourcePriorities: string[];
  stopConditions: string[];
  queries: Array<{
    query: string;
    purpose: string;
    targetEntity?: string;
  }>;
}

export interface VerifiedFact {
  id: string;
  claim: string;
  evidence: string;
  source: string;
  sourceType: 'OFFICIAL' | 'NEWS' | 'WIKIPEDIA' | 'USER_URL' | 'VERIFIED_DOMAIN';
  confidence: number;
  freshness: string;
  relevance: number;
  entities: string[];
  isSensitiveNumber?: boolean;
}

export interface KnowledgeBrief {
  coreUnderstanding: string;
  strongestFacts: VerifiedFact[];
  supportingFacts: VerifiedFact[];
  meaningfulNumbers: string[];
  relevantEntities: string[];
  nuances: string[];
  unansweredQuestions: string[];
  visualOpportunities: string[];
  informationToAvoid: string[];
}

export interface ContentStructurePlan {
  structureReason: string;
  narrativeFlow: 'LINEAR' | 'INVERTED_PYRAMID' | 'STEP_BY_STEP' | 'COMPARATIVE' | 'DIRECT_STATEMENT' | 'STORY_DRIVEN';
  needHook: boolean;
  openingStyle: 'DIRECT_STATEMENT' | 'QUESTION' | 'KEY_FACT' | 'SCENE_SETTING';
  needCta: boolean;
  ctaMessage?: string;
  sections: Array<{
    sectionIndex: number;
    purpose: string;
    contentCore: string;
    targetSeconds: number;
  }>;
  endingStrategy: 'SUMMARY' | 'CONCLUSION' | 'OPEN_QUESTION' | 'DIRECT_SIGN_OFF';
}

export interface ScriptBeat {
  beatId: number;
  purpose: string;
  narration: string;
  displayHeadline: string;
  supportingText?: string;
  metricBadge?: string;
  expectedEntities: string[];
  targetDurationSec: number;
  factIds: string[];
  fidelityCategory?: 'CORE' | 'SUPPORTING' | 'WEAKLY_RELEVANT' | 'OFF_TOPIC';
}

export interface ApprovedScript {
  title: string;
  totalWords: number;
  estimatedDurationSec: number;
  beats: ScriptBeat[];
  allBeats: ScriptBeat[];
  fullNarration: string;
  fidelityScore: number;
  reviewPassed: boolean;
  reviewNotes: string[];
}

export interface ProductionPlan {
  jobId: string;
  durationContract: DurationContract;
  script: ApprovedScript;
  scenes: Array<{
    sceneId: number;
    beatId: number;
    headline: string;
    tag?: string;
    metric?: string;
    voiceText: string;
    expectedVisual: string;
    isRealAssetRequired: boolean;
    audioDurationSec?: number;
  }>;
}

export interface FinalQAReport {
  technicalPassed: boolean;
  contentFidelityPassed: boolean;
  visualAuthenticityPassed: boolean;
  audioIntegrityPassed: boolean;
  durationDifferenceSec: number;
  verdict: 'PASS' | 'FAIL';
  details: string[];
}
