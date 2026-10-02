# TARGET MASTER ARCHITECTURE SPECIFICATION
**Engine**: AI Content Research → Creative Script → Video Production Engine  
**Standard**: High-Fidelity Social Media Short-Form Production  
**Status**: Target Specification  

---

## 1. Core Principle
> **PRODUCTION ENGINE MUST NEVER COMMENCE UNTIL CONTENT BRAIN PRODUCES AN APPROVED SCRIPT PACKAGE.**

The architecture is divided into two decoupled domains separated by an enforced code boundary:
1. **CONTENT BRAIN**: Autonomous research, source vetting, fact extraction, strategic thinking, creative angle & hook exploration, senior scriptwriting, and adversarial quality review.
2. **PRODUCTION ENGINE**: Multi-shot storyboard design, real entity asset retrieval & verification, voice-first audio timing, kinetic typography, dynamic layout composition, sound design, and pre/post-render quality gates.

```
┌────────────────────────────────────────────────────────────────────────┐
│                             CONTENT BRAIN                              │
│                                                                        │
│  User Request / URL / Prompt                                           │
│       │                                                                │
│       ▼                                                                │
│  [InputUnderstandingEngine] ──► ContentBrief (19 Content Types)        │
│       │                                                                │
│       ▼                                                                │
│  [ResearchQueryPlanner] ──────► Multi-intent Queries (Discovery,       │
│       │                         Official, FactCheck, Entity, Visual)   │
│       ▼                                                                │
│  [SourceDiscoveryEngine] ─────► Candidate URLs                         │
│       │                                                                │
│       ▼                                                                │
│  [SourceFetch & Clean] ───────► Raw vs. Clean Content (Strip 18 noises)│
│       │                                                                │
│       ▼                                                                │
│  [SourceQualityEngine] ───────► Tier 1-4 hierarchy & Authority Filter │
│       │                                                                │
│       ▼                                                                │
│  [FactEngine & Verification] ─► VerifiedFact[] (Claims with Evidence)  │
│       │                                                                │
│       ▼                                                                │
│  [KnowledgeBriefBuilder] ─────► KnowledgeBrief (Synthesis, no markup)  │
│       │                                                                │
│       ▼                                                                │
│  [ContentStrategist] ─────────► Viewer Promise, Problem, Core Value    │
│       │                                                                │
│       ▼                                                                │
│  [CreativeAngleEngine] ───────► 3-5 Scored Angles                      │
│       │                                                                │
│       ▼                                                                │
│  [HookEngine] ────────────────► >= 5 Distinct Mechanism Hooks          │
│       │                                                                │
│       ▼                                                                │
│  [SeniorScriptWriter] ────────► Natural Spoken VN (1 sentence ≈ 1 idea)│
│       │                                                                │
│       ▼                                                                │
│  [IndependentScriptReviewer] ─► Adversarial Audit (Critical/Major/Min) │
│       │                                                                │
│       ▼                                                                │
│  [ScriptQualityGate] ─────────► Fail if Critical -> Auto Refine Loop   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                         ENFORCED DATA CONTRACT:
                         ApprovedScriptPackage
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                           PRODUCTION ENGINE                            │
│                                                                        │
│  [StoryboardDirector & ShotPlanner] ──► Multi-shot per beat            │
│       │                                                                │
│       ▼                                                                │
│  [MediaPolicyRouter] ─────────────────► REAL ASSET FIRST for entities  │
│       │                                                                │
│       ▼                                                                │
│  [EntityExtractor & AssetEngine] ─────► Real-world targeted search     │
│       │                                                                │
│       ▼                                                                │
│  [AssetVerifier] ─────────────────────► Thresholds for entity match    │
│       │                                                                │
│       ▼                                                                │
│  [VoiceDirector & Neural TTS] ────────► Raw Audio Files                │
│       │                                                                │
│       ▼                                                                │
│  [ActualAudioTiming & ScriptOptimizer]► Measured duration is truth.   │
│       │                                 Zero silent padding!           │
│       ▼                                                                │
│  [VideoCopywriter] ───────────────────► Screen copy decoupled from VO  │
│       │                                 (Headline 2-7 words, no dup)   │
│       ▼                                                                │
│  [CaptionDirector] ───────────────────► Subtitle chunks to timestamps  │
│       │                                                                │
│       ▼                                                                │
│  [SceneCompositionEngine] ────────────► 14 Layout archetypes           │
│       │                                                                │
│       ▼                                                                │
│  [MotionDirector & SoundDirector] ────► Primary camera motion + BGM/SFX│
│       │                                                                │
│       ▼                                                                │
│  [PreRenderQualityGate] ──────────────► Fail checklist blocks render   │
│       │                                                                │
│       ▼                                                                │
│  [Renderer (HyperFrames / Remotion)] ─► High-fidelity MP4 Output       │
│       │                                                                │
│       ▼                                                                │
│  [PostRenderQA] ──────────────────────► Technical + Frame Inspection   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Data Contracts (Boundaries)

### 2.1 ContentBrief
```typescript
export interface ContentBrief {
  originalRequest: string;
  topic: string;
  primaryEntities: string[];
  contentType:
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
  targetAudience: string;
  viewerIntent: string;
  creatorGoal: string;
  targetPlatform: 'tiktok' | 'reels' | 'shorts';
  targetDuration: 30 | 45 | 60 | 90 | 120 | 180;
  language: 'vi';
  tone: string;
  factualSensitivity: 'HIGH' | 'MEDIUM' | 'LOW';
  freshnessRequirement: 'LATEST' | 'RECENT' | 'EVERGREEN';
  researchRequired: boolean;
}
```

### 2.2 VerifiedFact
```typescript
export interface VerifiedFact {
  id: string;
  claim: string;
  evidenceText: string;
  sourceUrl: string;
  sourceName: string;
  sourceType: 'OFFICIAL' | 'GOV_EDU' | 'REPUTABLE_NEWS' | 'SPECIALIST' | 'SECONDARY';
  confidence: number; // 0 - 100
  relevance: number;  // 0 - 100
  freshness: string;
  entities: string[];
  isConflicted?: boolean;
}
```

### 2.3 KnowledgeBrief
```typescript
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
```

### 2.4 ApprovedScriptPackage (Enforced Handover Contract)
```typescript
export interface ScriptBeat {
  beatId: number;
  purpose: 'hook' | 'setup' | 'body_progression' | 'reveal' | 'payoff' | 'cta';
  viewerQuestion: string;
  newInformation: string;
  whyItMatters: string;
  retentionFunction: string;
  narration: string; // Strictly clean spoken Vietnamese
  expectedEntities: string[];
  targetDurationSec: number;
  displayCopy: {
    headline: string;       // 2-7 words
    supportingText?: string;// <= 12 words
    metricBadge?: string;   // Clean number/unit
  };
}

export interface ApprovedScriptPackage {
  title: string;
  viewerPromise: string;
  selectedAngle: string;
  targetDuration: number;
  opening: ScriptBeat;
  beats: ScriptBeat[];
  ending: ScriptBeat;
  cta: ScriptBeat;
  fullNarration: string;
  estimatedDuration: number;
  approved: boolean;
  approvalReport: {
    reviewerScore: number;
    zeroCriticalIssues: boolean;
    timestamp: string;
  };
}
```

---

## 3. Production Engine Guarantees
1. **Actual Audio Timing**: TTS is generated from `ApprovedScriptPackage.beats`. Audio duration is measured directly with ffprobe. If actual audio deviates from target duration by >15%, the script optimizer adjusts content and re-synthesizes. **Zero silent padding (`apad`) or audio cutting.**
2. **Media Policy Router**: Real-world entities (persons, places, products) mandate REAL assets or semantic fallbacks (charts, maps, data cards, kinetic typography). Anime/cartoon generation is strictly prohibited for factual topics.
3. **Screen Text Economy**: Screen copy is strictly decoupled from narration. Headline is 2–7 words. Supporting text is <= 12 words. Subtitles are chunked to 3–9 words aligned with actual audio timestamps.
4. **25-Stage Observability**: Every job stores 25 discrete artifacts in `debug/` from `01_input.json` through `25_post_render_qa.json` for deterministic traceability.
