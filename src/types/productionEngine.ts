/**
 * PRODUCTION ENGINE CONTRACTS & SCHEMAS
 * Strict TypeScript boundaries for:
 *   StoryboardDirector → ShotPlanner → MediaPolicyRouter → EntityExtractor →
 *   RealAssetRetrieval → AssetVerifier → VoiceDirector → ActualAudioTiming →
 *   TimelineEngine → CaptionDirector → CompositionEngine → MotionDirector →
 *   SoundDirector → PreRenderQA → Renderer → PostRenderQA.
 */

import { ApprovedScriptPackage, ScriptBeat } from './contentBrain.js';

export type ShotType =
  | 'ESTABLISHING'
  | 'CLOSE_UP'
  | 'DETAIL'
  | 'DATA_CARD'
  | 'MAP_VIEW'
  | 'DYNAMIC_ACTION'
  | 'KINETIC_TEXT'
  | 'SPLIT_VIEW';

export type AssetMode =
  | 'REAL_ASSET'
  | 'SEMANTIC_FALLBACK'
  | 'GENERATED_ILLUSTRATIVE';

export type PrimaryMotion =
  | 'SLOW_PUSH_IN'
  | 'SLOW_PULL_OUT'
  | 'PAN_HORIZONTAL'
  | 'TILT_VERTICAL'
  | 'DYNAMIC_WHIP'
  | 'NUMBER_COUNT_UP'
  | 'PARALLAX_DEPTH'
  | 'TEXT_REVEAL';

export interface ShotPlan {
  shotId: string;
  beatId: number;
  shotType: ShotType;
  durationSec: number;
  primaryVisual: string;
  expectedEntities: string[];
  assetMode: AssetMode;
  motion: PrimaryMotion;
  purpose: string;
}

export interface MediaPolicy {
  contentType: string;
  requiresRealAsset: boolean;
  allowGenerated: boolean;
  bannedVisualStyles: string[];
  fallbackType: 'MAP' | 'CHART' | 'METRIC_CARD' | 'TYPOGRAPHY';
}

export interface VerifiedAsset {
  id: string;
  url: string;
  localPath: string;
  entityName: string;
  sourceDomain: string;
  scores: {
    semanticRelevance: number; // 0 - 25
    entityMatch: number;       // 0 - 30
    authenticity: number;      // 0 - 20
    visualQuality: number;     // 0 - 15
    resolution: number;        // 0 - 10
    total: number;             // 0 - 100
  };
  isApproved: boolean;
  isRealEntityAsset: boolean;
  aspectRatio: string;
  width?: number;
  height?: number;
}

export interface BeatAudioTiming {
  beatId: number;
  audioPath: string;
  durationSec: number;
  wordCount: number;
  speakingRateWordsPerSec: number;
  startSec: number;
  endSec: number;
}

export interface AudioTimingReport {
  totalDurationSec: number;
  targetDurationSec: number;
  deviationPercent: number;
  beatTimings: BeatAudioTiming[];
  actionNeeded: 'PROCEED' | 'RE_OPTIMIZE_SCRIPT';
  recommendedLengthAdjustmentWords?: number;
}

export interface SubtitleBlock {
  id: number;
  beatId: number;
  text: string; // 3 - 9 words
  startSec: number;
  endSec: number;
  safeAreaChecked: boolean;
}

export type CompositionArchetype =
  | 'FULL_BLEED'
  | 'PRODUCT_HERO'
  | 'DETAIL_CLOSEUP'
  | 'SPLIT_SCREEN'
  | 'STAT_CARD'
  | 'MAP'
  | 'CHART'
  | 'DOCUMENTARY_BROLL'
  | 'KINETIC_TYPE'
  | 'QUOTE'
  | 'BEFORE_AFTER'
  | 'UI_DEMO'
  | 'TIMELINE'
  | 'MONTAGE';

export interface SceneCompositionModel {
  beatId: number;
  archetype: CompositionArchetype;
  tag?: string;
  headline: string;       // 2 - 7 words
  supportingText?: string;// <= 12 words
  metricBadge?: string;
  primaryAssetPath?: string;
  secondaryAssetPath?: string;
  motion: PrimaryMotion;
  audioPath: string;
  durationSec: number;
  startSec: number;
}

export interface PreRenderQAChecklist {
  passed: boolean;
  audioIntegrityPassed: boolean;
  noSilentPadding: boolean;
  noNarrationClipping: boolean;
  realEntityAssetVerified: boolean;
  noGenericCartoonsOnFactual: boolean;
  noMetadataLeakage: boolean;
  noScreenParagraphs: boolean;
  noDuplicateText: boolean;
  subtitleTimestampsValid: boolean;
  violations: string[];
}

export interface PostRenderQAReport {
  passed: boolean;
  outputPath: string;
  actualDurationSec: number;
  targetDurationSec: number;
  fileSizeBytes: number;
  resolution: { width: number; height: number };
  technicalChecks: {
    videoCodec: string;
    audioCodec: string;
    fps: number;
    hasAudioStream: boolean;
    hasVideoStream: boolean;
  };
  frameAudit: {
    blackFramesDetected: boolean;
    watermarkDetected: boolean;
    textOverflowDetected: boolean;
    subtitleSafeAreaCompliant: boolean;
  };
  errors: string[];
}
